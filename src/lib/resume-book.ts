import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PartnerView, PortfolioPiece } from "@/lib/student";
import {
  GRAD_SEMESTERS,
  parseTerm,
  termIndex,
  termKey,
  videoLink,
  type CareerInterest,
  type Citizenship,
  type GradSemester,
  type Term,
} from "@/lib/student-options";
import { isTeamSlug, type TeamSlug } from "@/lib/teams";

// The resume book: what an active Partner can browse. Every read goes through the resume_book view
// as the Partner, so the view's where clause (visible, finished profile, active Partner) is the gate.
// Files sit in private buckets that Partners can't read; once the view has said yes, the server
// logs the access and signs a short-lived URL with the secret key.

export const PAGE_SIZE = 24;
const SIGNED_URL_SECONDS = 10 * 60;
// Opening the same resume again within this window doesn't add another log row.
const LOG_DEDUPE_MINUTES = 10;

// ── Filters, read from and written to the URL ─────────────────────────────

export type Sort = "recent" | "graduation";

export type Filters = {
  q: string;
  teams: TeamSlug[];
  subsystem: string;
  major: string;
  from: Term | null;
  to: Term | null;
  interest: "internship" | "full_time" | "";
  skills: string[];
  usOnly: boolean;
  sort: Sort;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const all = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const one = (value: string | string[] | undefined) => all(value)[0]?.trim() ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFilters(params: Params): Filters {
  const interest = one(params.interest);
  let from = parseTerm(one(params.from));
  let to = parseTerm(one(params.to));
  if (from && to && termIndex(from) > termIndex(to)) [from, to] = [to, from];

  return {
    q: one(params.q).slice(0, 80),
    teams: [...new Set(all(params.team).filter(isTeamSlug))],
    subsystem: one(params.subsystem).slice(0, 80),
    major: one(params.major).slice(0, 120),
    from,
    to,
    interest: interest === "internship" || interest === "full_time" ? interest : "",
    skills: [...new Set(all(params.skill).filter((id) => UUID.test(id)))].slice(0, 20),
    usOnly: one(params.us) === "1",
    sort: one(params.sort) === "graduation" ? "graduation" : "recent",
    page: Math.max(1, Math.min(500, Number.parseInt(one(params.page), 10) || 1)),
  };
}

// The URL for a set of filters; page 1 and the default sort are left out.
export function filterQuery(filters: Filters, changes: Partial<Filters> = {}) {
  const f = { ...filters, ...changes };
  const query = new URLSearchParams();
  if (f.q) query.set("q", f.q);
  f.teams.forEach((team) => query.append("team", team));
  if (f.subsystem) query.set("subsystem", f.subsystem);
  if (f.major) query.set("major", f.major);
  if (f.from) query.set("from", termKey(f.from));
  if (f.to) query.set("to", termKey(f.to));
  if (f.interest) query.set("interest", f.interest);
  f.skills.forEach((skill) => query.append("skill", skill));
  if (f.usOnly) query.set("us", "1");
  if (f.sort !== "recent") query.set("sort", f.sort);
  if (f.page > 1) query.set("page", String(f.page));
  return query.toString();
}

export function activeFilterCount(f: Filters) {
  return [f.q, f.teams.length, f.subsystem, f.major, f.from, f.to, f.interest, f.skills.length, f.usOnly].filter(Boolean).length;
}

// ── The list ─────────────────────────────────────────────────────────────

export type BookCard = {
  id: string;
  fullName: string;
  photoUrl: string | null;
  team: string;
  subsystem: string | null;
  position: string | null;
  major: string | null;
  gradSemester: GradSemester | null;
  gradYear: number | null;
  careerInterest: CareerInterest | null;
  technicalFocus: string | null;
  skills: { id: string; name: string }[];
};

export type BookPage = { cards: BookCard[]; total: number; error: boolean };

type BookRow = {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  team: string;
  subsystem_name: string | null;
  position: string | null;
  major: string | null;
  grad_year: number | null;
  grad_semester: GradSemester | null;
  career_interest: CareerInterest | null;
  technical_focus: string | null;
  skill_ids: string[];
  skill_names: string[];
  has_photo: boolean;
};

// PostgREST filter strings treat these as syntax, and ilike treats % and _ as wildcards.
const literal = (value: string) => value.replace(/[,()*%_\\:"]/g, " ").trim();

export async function searchResumeBook(filters: Filters, skills: SkillIndex): Promise<BookPage> {
  const supabase = await createClient();
  let query = supabase
    .from("resume_book")
    .select(
      "user_id, full_name, email, avatar_url, team, subsystem_name, position, major, grad_year, grad_semester, career_interest, technical_focus, skill_ids, skill_names, has_photo",
      { count: "exact" },
    );

  const q = literal(filters.q);
  if (q) {
    query = query.or(
      ["full_name", "technical_focus", "project_experience", "position", "major", "subsystem_name"].map((column) => `${column}.ilike."*${q}*"`).join(","),
    );
  }
  if (filters.teams.length) query = query.in("team", filters.teams);
  if (filters.subsystem) query = query.eq("subsystem_name", filters.subsystem);
  // Majors are typed by students, so match them without regard to case.
  if (filters.major) query = query.ilike("major", literal(filters.major));
  if (filters.from) query = query.or(termBound(filters.from, "after"));
  if (filters.to) query = query.or(termBound(filters.to, "before"));
  if (filters.interest) query = query.in("career_interest", [filters.interest, "both"]);
  if (filters.skills.length) query = query.contains("skill_ids", filters.skills);
  if (filters.usOnly) query = query.in("citizenship", ["us_citizen", "permanent_resident"] satisfies Citizenship[]);

  query =
    filters.sort === "graduation"
      ? query.order("grad_year").order("grad_semester").order("full_name")
      : query.order("updated_at", { ascending: false }).order("user_id");

  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(start, start + PAGE_SIZE - 1);
  if (error) return { cards: [], total: 0, error: true };

  const rows = (data ?? []) as BookRow[];
  const photos = await signPhotos(rows.filter((row) => row.has_photo).map((row) => row.user_id));

  return {
    total: count ?? rows.length,
    error: false,
    cards: rows.map((row) => ({
      id: row.user_id,
      fullName: row.full_name?.trim() || row.email,
      photoUrl: photos.get(row.user_id) ?? row.avatar_url,
      team: row.team,
      subsystem: row.subsystem_name,
      position: row.position,
      major: row.major,
      gradSemester: row.grad_semester,
      gradYear: row.grad_year,
      careerInterest: row.career_interest,
      technicalFocus: row.technical_focus,
      skills: row.skill_ids
        .flatMap((id) => (skills.has(id) ? [{ id, name: (skills.get(id) as { name: string }).name }] : []))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })),
  };
}

// Graduating in or after (or in or before) a term, as a PostgREST "or" group.
function termBound(term: Term, side: "after" | "before") {
  const index = GRAD_SEMESTERS.findIndex((s) => s.value === term.semester);
  const sameYear = GRAD_SEMESTERS.filter((_, i) => (side === "after" ? i >= index : i <= index)).map((s) => s.value);
  return `grad_year.${side === "after" ? "gt" : "lt"}.${term.year},and(grad_year.eq.${term.year},grad_semester.in.(${sameYear.join(",")}))`;
}

export type SkillIndex = Map<string, { name: string; category: string }>;

// Active skills by id. The view's skill_names is sorted by name and skill_ids isn't, so cards look
// names up here rather than pairing the two arrays.
export async function skillIndex(): Promise<SkillIndex> {
  const supabase = await createClient();
  const { data } = await supabase.from("skills").select("id, name, category").eq("active", true).order("category").order("name");
  return new Map((data ?? []).map((skill) => [skill.id as string, { name: skill.name as string, category: skill.category as string }]));
}

// ── Filter choices, from the students actually in the book ───────────────

export type FilterOptions = {
  total: number;
  subsystems: string[];
  majors: string[];
  terms: Term[];
  skills: { id: string; name: string; category: string }[];
};

export async function filterOptions(skills: SkillIndex): Promise<FilterOptions> {
  const supabase = await createClient();
  const book = await supabase.from("resume_book").select("subsystem_name, major, grad_year, grad_semester, skill_ids").limit(5000);
  const rows = (book.data ?? []) as {
    subsystem_name: string | null;
    major: string | null;
    grad_year: number | null;
    grad_semester: GradSemester | null;
    skill_ids: string[];
  }[];

  // One spelling per major, whichever most students used.
  const majors = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const major = row.major?.trim().replace(/\s+/g, " ");
    if (!major) continue;
    const spellings = majors.get(major.toLowerCase()) ?? new Map<string, number>();
    spellings.set(major, (spellings.get(major) ?? 0) + 1);
    majors.set(major.toLowerCase(), spellings);
  }

  const terms = new Map<string, Term>();
  for (const row of rows) {
    if (row.grad_year && row.grad_semester) {
      const term = { year: row.grad_year, semester: row.grad_semester };
      terms.set(termKey(term), term);
    }
  }

  const usedSkills = new Set(rows.flatMap((row) => row.skill_ids));

  return {
    total: rows.length,
    subsystems: [...new Set(rows.map((row) => row.subsystem_name).filter((name): name is string => Boolean(name)))].sort(),
    majors: [...majors.values()].map((spellings) => [...spellings].sort((a, b) => b[1] - a[1])[0][0]).sort((a, b) => a.localeCompare(b)),
    terms: [...terms.values()].sort((a, b) => termIndex(a) - termIndex(b)),
    skills: [...skills].filter(([id]) => usedSkills.has(id)).map(([id, skill]) => ({ id, ...skill })),
  };
}

// ── One student ──────────────────────────────────────────────────────────

type FullRow = BookRow & {
  gpa: number | null;
  citizenship: Citizenship | null;
  project_experience: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
};

// A student as the Partner sees them, or null when they aren't in the book (hidden, unfinished,
// or not a student at all). Resume and file links point at the logging routes below. Cached per
// request, since the page title reads it too.
export const loadBookStudent = cache(async (studentId: string): Promise<PartnerView | null> => {
  if (!UUID.test(studentId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("resume_book")
    .select(
      "user_id, full_name, email, avatar_url, team, subsystem_name, position, major, grad_year, grad_semester, gpa, career_interest, citizenship, technical_focus, project_experience, linkedin_url, github_url, portfolio_url, skill_names, has_photo",
    )
    .eq("user_id", studentId)
    .maybeSingle();
  const row = data as FullRow | null;
  if (!row) return null;

  const [photos, files] = await Promise.all([
    row.has_photo ? signPhotos([row.user_id]) : Promise.resolve(new Map<string, string>()),
    // Partners may read the file list (not the files) for students in the book.
    supabase.from("student_files").select("id, kind, path, url, file_name, size_bytes, video_seconds").eq("student_id", studentId).order("created_at"),
  ]);

  const base = `/partner/students/${studentId}`;
  const pieces: PortfolioPiece[] = [];
  for (const file of (files.data ?? []) as FileRow[]) {
    if (file.kind === "file") {
      pieces.push({ id: file.id, fileName: file.file_name, kind: "file", sizeBytes: file.size_bytes ?? 0, url: `${base}/files/${file.id}` });
    } else if (file.kind === "video" && file.path) {
      // Videos play in the page; they're signed here rather than logged as downloads.
      const { data: signed } = await createAdminClient().storage.from("videos").createSignedUrl(file.path, 60 * 60);
      pieces.push({ id: file.id, fileName: file.file_name, kind: "video", sizeBytes: file.size_bytes ?? 0, seconds: file.video_seconds, url: signed?.signedUrl ?? null });
    } else if (file.kind === "video_link" && file.url) {
      const link = videoLink(file.url);
      if (link) pieces.push({ id: file.id, fileName: file.file_name, kind: "video_link", url: file.url, ...link });
    }
  }

  const fullName = row.full_name?.trim() || row.email;
  return {
    fullName,
    email: row.email,
    avatarUrl: photos.get(row.user_id) ?? row.avatar_url,
    team: row.team,
    subsystem: row.subsystem_name,
    position: row.position,
    major: row.major,
    gradSemester: row.grad_semester,
    gradYear: row.grad_year,
    gpa: row.gpa === null ? null : Number(row.gpa),
    careerInterest: row.career_interest,
    citizenship: row.citizenship,
    technicalFocus: row.technical_focus,
    projectExperience: row.project_experience,
    links: { linkedin: row.linkedin_url, github: row.github_url, site: row.portfolio_url },
    skills: row.skill_names,
    resume: { viewUrl: `${base}/resume`, downloadUrl: `${base}/resume?download=1` },
    files: pieces,
  };
});

type FileRow = {
  id: string;
  kind: "file" | "video" | "video_link";
  path: string | null;
  url: string | null;
  file_name: string;
  size_bytes: number | null;
  video_seconds: number | null;
};

async function signPhotos(studentIds: string[]): Promise<Map<string, string>> {
  if (!studentIds.length) return new Map();
  const admin = createAdminClient();
  const { data: rows } = await admin.from("students").select("user_id, photo_path").in("user_id", studentIds);
  const paths = (rows ?? []).filter((row) => row.photo_path) as { user_id: string; photo_path: string }[];
  if (!paths.length) return new Map();
  const { data: signed } = await admin.storage.from("photos").createSignedUrls(
    paths.map((row) => row.photo_path),
    60 * 60,
  );
  const byPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
  return new Map(paths.flatMap((row) => (byPath.get(row.photo_path) ? [[row.user_id, byPath.get(row.photo_path) as string]] : [])));
}

// ── Opening a resume or file: check, log, sign ───────────────────────────

export type AccessKind = "resume_view" | "resume_download" | "portfolio_download";

// A signed URL for a Partner, or null when the student isn't in the book or the file is gone.
// The caller has already checked that the viewer is an active Partner.
export async function openStudentFile(
  partner: { userId: string },
  studentId: string,
  kind: AccessKind,
  fileId?: string,
): Promise<string | null> {
  if (!UUID.test(studentId) || (fileId !== undefined && !UUID.test(fileId))) return null;

  // As the Partner: the view only returns students they're allowed to see.
  const supabase = await createClient();
  const { data: allowed } = await supabase.from("resume_book").select("user_id, full_name, email").eq("user_id", studentId).maybeSingle();
  if (!allowed) return null;

  const admin = createAdminClient();
  let bucket: string;
  let path: string | null;
  let downloadName: string | undefined;

  if (kind === "portfolio_download") {
    const { data: file } = await admin
      .from("student_files")
      .select("path, file_name, kind")
      .eq("id", fileId ?? "")
      .eq("student_id", studentId)
      .maybeSingle();
    if (!file || file.kind !== "file") return null;
    bucket = "portfolio";
    path = file.path;
    downloadName = file.file_name;
  } else {
    const { data: student } = await admin.from("students").select("resume_path").eq("user_id", studentId).maybeSingle();
    bucket = "resumes";
    path = student?.resume_path ?? null;
    const name = (allowed.full_name?.trim() || allowed.email.split("@")[0]).replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
    if (kind === "resume_download") downloadName = `${name || "Student"}-Resume.pdf`;
  }
  if (!path) return null;

  // Access is only granted once it's on the record.
  await logAccess(partner.userId, studentId, kind, fileId ?? null);
  const { data: signed } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_SECONDS, downloadName ? { download: downloadName } : undefined);
  return signed?.signedUrl ?? null;
}

async function logAccess(partnerUserId: string, studentId: string, kind: AccessKind, fileId: string | null) {
  const admin = createAdminClient();
  const { data: member } = await admin.from("partner_members").select("company_id").eq("user_id", partnerUserId).maybeSingle();

  // A recruiter scrolling back to a resume they just opened is one look, not two.
  const since = new Date(Date.now() - LOG_DEDUPE_MINUTES * 60 * 1000).toISOString();
  let recent = admin
    .from("resume_access_log")
    .select("id", { count: "exact", head: true })
    .eq("partner_user_id", partnerUserId)
    .eq("student_id", studentId)
    .eq("kind", kind)
    .gte("created_at", since);
  recent = fileId ? recent.eq("file_id", fileId) : recent.is("file_id", null);
  const { count } = await recent;
  if (count) return;

  const { error } = await admin.from("resume_access_log").insert({
    partner_user_id: partnerUserId,
    company_id: member?.company_id ?? null,
    student_id: studentId,
    kind,
    file_id: fileId,
  });
  if (error) throw new Error(`Couldn't log resume access: ${error.message}`);
}
