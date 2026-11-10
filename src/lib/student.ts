import "server-only";
import { createClient } from "@/lib/supabase/server";
import { videoLink, type CareerInterest, type Citizenship, type GradSemester, type VideoLink } from "@/lib/student-options";

export type StudentRow = {
  subsystem_id: string | null;
  position: string | null;
  major: string | null;
  grad_year: number | null;
  grad_semester: GradSemester | null;
  gpa: number | null;
  gpa_visible: boolean;
  career_interest: CareerInterest | null;
  technical_focus: string | null;
  project_experience: string | null;
  citizenship: Citizenship | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  resume_path: string | null;
  resume_updated_at: string | null;
  visible: boolean;
  photo_path: string | null;
};

export type Skill = { id: string; name: string; category: string };
export type Subsystem = { id: string; name: string };
// A portfolio piece: a file to download, a short uploaded video, or a link to a video hosted elsewhere.
export type PortfolioPiece = { id: string; fileName: string } & (
  | { kind: "file"; sizeBytes: number; url: string | null }
  | { kind: "video"; sizeBytes: number; seconds: number | null; url: string | null }
  | ({ kind: "video_link"; url: string } & VideoLink)
);

export type StudentProfile = {
  student: StudentRow | null;
  subsystems: Subsystem[];
  skills: Skill[];
  skillIds: string[];
  files: PortfolioPiece[];
  resumeUrl: string | null;
  photoUrl: string | null;
};

const SIGNED_URL_SECONDS = 60 * 60;

// Everything the profile editor shows, read as the student (row-level security applies).
export async function loadStudentProfile(userId: string, team: string): Promise<StudentProfile> {
  const supabase = await createClient();

  const [student, subsystems, skills, chosen, files] = await Promise.all([
    supabase
      .from("students")
      .select(
        "subsystem_id, position, major, grad_year, grad_semester, gpa, gpa_visible, career_interest, technical_focus, project_experience, citizenship, linkedin_url, github_url, portfolio_url, resume_path, resume_updated_at, visible, photo_path",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("subsystems").select("id, name").eq("team", team).eq("active", true).order("sort"),
    supabase.from("skills").select("id, name, category").eq("active", true).order("category").order("name"),
    supabase.from("student_skills").select("skill_id").eq("student_id", userId),
    supabase
      .from("student_files")
      .select("id, kind, path, url, file_name, size_bytes, video_seconds")
      .eq("student_id", userId)
      .order("created_at"),
  ]);

  const row = (student.data as StudentRow | null) ?? null;
  const fileRows = (files.data ?? []) as PieceRow[];

  const sign = (bucket: string, path: string | null | undefined, download?: string) =>
    path ? supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS, download ? { download } : undefined) : Promise.resolve(null);
  const [resume, photo, ...signed] = await Promise.all([
    sign("resumes", row?.resume_path),
    sign("photos", row?.photo_path),
    // Files download under their own name; videos play in the page.
    ...fileRows.map((file) => (file.kind === "video" ? sign("videos", file.path) : sign("portfolio", file.path, file.file_name))),
  ]);

  return {
    student: row ? { ...row, gpa: row.gpa === null ? null : Number(row.gpa) } : null,
    subsystems: (subsystems.data ?? []) as Subsystem[],
    skills: (skills.data ?? []) as Skill[],
    skillIds: ((chosen.data ?? []) as { skill_id: string }[]).map((s) => s.skill_id),
    files: fileRows.flatMap((file, i) => {
      const piece = toPiece(file, signed[i]?.data?.signedUrl ?? null);
      return piece ? [piece] : [];
    }),
    resumeUrl: resume?.data?.signedUrl ?? null,
    photoUrl: photo?.data?.signedUrl ?? null,
  };
}

type PieceRow = {
  id: string;
  kind: "file" | "video" | "video_link";
  path: string | null;
  url: string | null;
  file_name: string;
  size_bytes: number | null;
  video_seconds: number | null;
};

function toPiece(row: PieceRow, signedUrl: string | null): PortfolioPiece | null {
  const base = { id: row.id, fileName: row.file_name };
  if (row.kind === "video") return { ...base, kind: "video", sizeBytes: row.size_bytes ?? 0, seconds: row.video_seconds, url: signedUrl };
  if (row.kind === "video_link") {
    const link = row.url ? videoLink(row.url) : null;
    return link && row.url ? { ...base, kind: "video_link", url: row.url, ...link } : null;
  }
  return { ...base, kind: "file", sizeBytes: row.size_bytes ?? 0, url: signedUrl };
}

export type Readiness = {
  missingForPartners: string[];
  steps: { label: string; done: boolean }[];
};

// What Partners need before the profile appears in the resume book, plus what makes it strong.
export function readiness(student: StudentRow | null, skillCount: number, fileCount: number): Readiness {
  const s = student;
  const required = [
    { label: "Resume", done: Boolean(s?.resume_path) },
    { label: "Major", done: Boolean(s?.major) },
    { label: "Graduation date", done: Boolean(s?.grad_year && s?.grad_semester) },
  ];
  const steps = [
    ...required,
    { label: "Subsystem and role", done: Boolean(s?.subsystem_id && s?.position) },
    { label: "Work authorization", done: Boolean(s?.citizenship) },
    { label: "What you built on the car", done: Boolean(s?.technical_focus && s?.project_experience) },
    { label: "Three or more skills", done: skillCount >= 3 },
    { label: "LinkedIn", done: Boolean(s?.linkedin_url) },
    { label: "Portfolio piece", done: fileCount > 0 },
  ];
  return { missingForPartners: required.filter((r) => !r.done).map((r) => r.label.toLowerCase()), steps };
}

// ── What a Partner sees ──────────────────────────────────────────────────
// One shape for the resume book (phase 3) and the student's own preview, so the preview can't drift.

export type PartnerView = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  team: string;
  subsystem: string | null;
  position: string | null;
  major: string | null;
  gradSemester: GradSemester | null;
  gradYear: number | null;
  gpa: number | null;
  careerInterest: CareerInterest | null;
  citizenship: Citizenship | null;
  technicalFocus: string | null;
  projectExperience: string | null;
  links: { linkedin: string | null; github: string | null; site: string | null };
  skills: string[];
  resume: { viewUrl: string; downloadUrl: string } | null;
  files: PortfolioPiece[];
};

// The student's own data, masked the way the resume_book view masks it for Partners.
export async function previewForPartners(
  viewer: { id: string; email: string; fullName: string | null; avatarUrl: string | null },
  team: string,
  profile: StudentProfile,
): Promise<PartnerView> {
  const s = profile.student;
  const name = viewer.fullName?.trim() || viewer.email;
  let resume: PartnerView["resume"] = null;

  if (s?.resume_path && profile.resumeUrl) {
    const supabase = await createClient();
    const { data } = await supabase.storage
      .from("resumes")
      .createSignedUrl(s.resume_path, SIGNED_URL_SECONDS, { download: `${name.replace(/[^\w]+/g, "-")}-Resume.pdf` });
    resume = { viewUrl: profile.resumeUrl, downloadUrl: data?.signedUrl ?? profile.resumeUrl };
  }

  return {
    fullName: name,
    email: viewer.email,
    avatarUrl: profile.photoUrl ?? viewer.avatarUrl,
    team,
    subsystem: profile.subsystems.find((sub) => sub.id === s?.subsystem_id)?.name ?? null,
    position: s?.position ?? null,
    major: s?.major ?? null,
    gradSemester: s?.grad_semester ?? null,
    gradYear: s?.grad_year ?? null,
    gpa: s?.gpa_visible ? s.gpa : null,
    careerInterest: s?.career_interest ?? null,
    citizenship: s?.citizenship ?? null,
    technicalFocus: s?.technical_focus ?? null,
    projectExperience: s?.project_experience ?? null,
    links: { linkedin: s?.linkedin_url ?? null, github: s?.github_url ?? null, site: s?.portfolio_url ?? null },
    skills: profile.skills.filter((skill) => profile.skillIds.includes(skill.id)).map((skill) => skill.name),
    resume,
    files: profile.files,
  };
}
