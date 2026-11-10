"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CAREER_INTEREST,
  CITIZENSHIP,
  GRAD_SEMESTERS,
  MAX_FILE_BYTES,
  MAX_PORTFOLIO_FILES,
  MAX_PHOTO_BYTES,
  MAX_SKILLS,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  MAX_WORDS,
  countWords,
  isBlockedFile,
  videoLink,
} from "@/lib/student-options";
import { isTeamSlug } from "@/lib/teams";

// ── Profile details ──────────────────────────────────────────────────────

export type ProfileState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: string; fieldErrors: Record<string, string> };

const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be at most ${max} characters.`)
    .transform((value) => value || null);

const choice = <T extends readonly { value: string }[]>(options: T) =>
  z
    .string()
    .transform((value) => value || null)
    .refine((value) => value === null || options.some((o) => o.value === value), "Choose one of the options.")
    .transform((value) => value as T[number]["value"] | null);

// Accepts "linkedin.com/in/x" as well as a full URL, and only on the expected site.
const link = (label: string, host?: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return null;
      const withProtocol = /^https?:\/\//i.test(value) ? value.replace(/^http:/i, "https:") : `https://${value}`;
      let url: URL;
      try {
        url = new URL(withProtocol);
      } catch {
        ctx.addIssue({ code: "custom", message: `Enter your ${label} as a web address.` });
        return z.NEVER;
      }
      if (host && url.hostname !== host && !url.hostname.endsWith(`.${host}`)) {
        ctx.addIssue({ code: "custom", message: `That isn't a ${host} address.` });
        return z.NEVER;
      }
      if (withProtocol.length > 300) {
        ctx.addIssue({ code: "custom", message: "That address is too long." });
        return z.NEVER;
      }
      return url.toString();
    });

const profileSchema = z
  .object({
    full_name: z.string().trim().min(1, "Enter your name.").max(120, "Your name can be at most 120 characters."),
    subsystem_id: z.string().transform((value) => value || null),
    position: text(80, "Your role"),
    major: text(120, "Major"),
    grad_semester: choice(GRAD_SEMESTERS),
    grad_year: z
      .string()
      .transform((value) => (value ? Number(value) : null))
      .refine((value) => value === null || (Number.isInteger(value) && value >= 2020 && value <= 2040), "Pick a year."),
    gpa: z
      .string()
      .trim()
      .transform((value) => (value ? Number(value) : null))
      .refine(
        (value) => value === null || (Number.isFinite(value) && value >= 0 && value <= 4),
        "Enter a GPA between 0 and 4, like 3.65.",
      )
      .transform((value) => (value === null ? null : Math.round(value * 100) / 100)),
    gpa_visible: z.boolean(),
    career_interest: choice(CAREER_INTEREST),
    citizenship: choice(CITIZENSHIP),
    technical_focus: text(80, "Technical focus"),
    project_experience: text(3000, "What you built").refine(
      (value) => value === null || countWords(value) <= MAX_WORDS,
      `Keep it to ${MAX_WORDS} words. Recruiters skim, so lead with what you built and what came of it.`,
    ),
    linkedin_url: link("LinkedIn profile", "linkedin.com"),
    github_url: link("GitHub profile", "github.com"),
    portfolio_url: link("portfolio site"),
    skills: z.array(z.uuid()).max(MAX_SKILLS, `Pick at most ${MAX_SKILLS} skills.`),
  })
  .superRefine((value, ctx) => {
    if ((value.grad_year === null) !== (value.grad_semester === null)) {
      ctx.addIssue({ code: "custom", path: ["grad_year"], message: "Pick both the semester and the year." });
    }
  });

export async function saveProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const viewer = await requireActiveMember();

  const parsed = profileSchema.safeParse({
    full_name: String(formData.get("full_name") ?? ""),
    subsystem_id: String(formData.get("subsystem_id") ?? ""),
    position: String(formData.get("position") ?? ""),
    major: String(formData.get("major") ?? ""),
    grad_semester: String(formData.get("grad_semester") ?? ""),
    grad_year: String(formData.get("grad_year") ?? ""),
    gpa: String(formData.get("gpa") ?? ""),
    gpa_visible: formData.get("gpa_visible") === "on",
    career_interest: String(formData.get("career_interest") ?? ""),
    citizenship: String(formData.get("citizenship") ?? ""),
    technical_focus: String(formData.get("technical_focus") ?? ""),
    project_experience: String(formData.get("project_experience") ?? ""),
    linkedin_url: String(formData.get("linkedin_url") ?? ""),
    github_url: String(formData.get("github_url") ?? ""),
    portfolio_url: String(formData.get("portfolio_url") ?? ""),
    skills: [...new Set(formData.getAll("skills").map(String))],
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", message: "Some fields need a fix before we can save.", fieldErrors };
  }

  const { full_name, skills, ...student } = parsed.data;
  const supabase = await createClient();

  const { error: nameError } = await supabase.from("profiles").update({ full_name }).eq("id", viewer.id);
  const { error: studentError } = await supabase
    .from("students")
    .upsert({ user_id: viewer.id, ...student }, { onConflict: "user_id" });

  if (nameError || studentError) {
    const message = studentError?.message.includes("subsystem")
      ? "That subsystem belongs to another team. Pick one from yours."
      : "We couldn't save your profile. Try again in a minute.";
    return { status: "error", message, fieldErrors: {} };
  }

  // Replace the skill set: drop what was unticked, add what's new.
  const { data: current } = await supabase.from("student_skills").select("skill_id").eq("student_id", viewer.id);
  const had = new Set(((current ?? []) as { skill_id: string }[]).map((s) => s.skill_id));
  const removed = [...had].filter((id) => !skills.includes(id));
  const added = skills.filter((id) => !had.has(id));
  if (removed.length) {
    await supabase.from("student_skills").delete().eq("student_id", viewer.id).in("skill_id", removed);
  }
  if (added.length) {
    const { error } = await supabase
      .from("student_skills")
      .insert(added.map((skill_id) => ({ student_id: viewer.id, skill_id })));
    if (error) return { status: "error", message: "We saved your details but not your skills. Try again.", fieldErrors: {} };
  }

  revalidatePath("/profile");
  return { status: "saved" };
}

// ── Team (admins seeded without one) ─────────────────────────────────────

export type TeamState = { error: string | null };

export async function chooseTeam(_prev: TeamState, formData: FormData): Promise<TeamState> {
  await requireActiveMember();
  const team = formData.get("team");
  if (!isTeamSlug(team)) return { error: "Choose the team you're on." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("choose_my_team", { p_team: team });
  if (error) return { error: "We couldn't set your team. Ask another admin to set it for you." };

  revalidatePath("/", "layout");
  return { error: null };
}

// ── Visibility ───────────────────────────────────────────────────────────

export async function setVisibility(formData: FormData): Promise<void> {
  const viewer = await requireActiveMember();
  const visible = formData.get("visible") === "true";
  const supabase = await createClient();
  await supabase.from("students").upsert({ user_id: viewer.id, visible }, { onConflict: "user_id" });
  revalidatePath("/profile");
}

// ── Files ────────────────────────────────────────────────────────────────
// The browser uploads straight to the student's own storage folder (storage policies allow
// only that folder); these actions check what actually landed there before recording it.

export type FileResult = { error: string | null };

type StoredObject = { name: string; metadata: { size?: number; mimetype?: string } | null };

async function findObject(bucket: string, path: string): Promise<StoredObject | null> {
  const supabase = await createClient();
  const slash = path.lastIndexOf("/");
  const { data } = await supabase.storage
    .from(bucket)
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 10 });
  return ((data ?? []) as StoredObject[]).find((o) => o.name === path.slice(slash + 1)) ?? null;
}

async function startsLikeAPdf(path: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("resumes").createSignedUrl(path, 60);
  if (!data) return false;
  const response = await fetch(data.signedUrl, { headers: { Range: "bytes=0-4" } });
  const head = new Uint8Array(await response.arrayBuffer()).slice(0, 5);
  return new TextDecoder().decode(head) === "%PDF-";
}

export async function saveResume(path: string): Promise<FileResult> {
  const viewer = await requireActiveMember();
  if (!new RegExp(`^${viewer.id}/resume-\\d+\\.pdf$`).test(path)) return { error: "That upload didn't go through. Try again." };

  const supabase = await createClient();
  const object = await findObject("resumes", path);
  const size = object?.metadata?.size ?? 0;
  if (!object || size < 1 || size > MAX_FILE_BYTES || !(await startsLikeAPdf(path))) {
    await supabase.storage.from("resumes").remove([path]);
    return { error: "That file isn't a PDF we can read. Export your resume as a PDF and try again." };
  }

  const { error } = await supabase
    .from("students")
    .upsert(
      { user_id: viewer.id, resume_path: path, resume_updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) {
    await supabase.storage.from("resumes").remove([path]);
    return { error: "We couldn't save your resume. Try again in a minute." };
  }

  // Older versions are no longer referenced anywhere.
  const { data: others } = await supabase.storage.from("resumes").list(viewer.id, { limit: 100 });
  const stale = ((others ?? []) as StoredObject[]).map((o) => `${viewer.id}/${o.name}`).filter((p) => p !== path);
  if (stale.length) await supabase.storage.from("resumes").remove(stale);

  revalidatePath("/profile");
  return { error: null };
}

export async function removeResume(): Promise<FileResult> {
  const viewer = await requireActiveMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ resume_path: null, resume_updated_at: null })
    .eq("user_id", viewer.id);
  if (error) return { error: "We couldn't remove your resume. Try again." };

  const { data: objects } = await supabase.storage.from("resumes").list(viewer.id, { limit: 100 });
  const paths = ((objects ?? []) as StoredObject[]).map((o) => `${viewer.id}/${o.name}`);
  if (paths.length) await supabase.storage.from("resumes").remove(paths);

  revalidatePath("/profile");
  return { error: null };
}

export async function addPortfolioFile(path: string, fileName: string): Promise<FileResult> {
  const viewer = await requireActiveMember();
  const supabase = await createClient();
  const discard = () => supabase.storage.from("portfolio").remove([path]);

  if (!new RegExp(`^${viewer.id}/[0-9a-f-]{36}/[\\w.-]{1,100}$`).test(path)) return { error: "That upload didn't go through. Try again." };
  const name = fileName.trim().slice(0, 200) || "File";
  if (isBlockedFile(name) || isBlockedFile(path)) {
    await discard();
    return { error: "That kind of file can't be shared. Use a PDF, document, slides, spreadsheet, image or archive." };
  }

  const object = await findObject("portfolio", path);
  const size = object?.metadata?.size ?? 0;
  if (!object || size < 1 || size > MAX_FILE_BYTES) {
    await discard();
    return { error: "That file is empty or over 10 MB." };
  }

  // The profile row has to exist before files can hang off it.
  await supabase.from("students").upsert({ user_id: viewer.id }, { onConflict: "user_id", ignoreDuplicates: true });

  const { count } = await supabase
    .from("student_files")
    .select("id", { count: "exact", head: true })
    .eq("student_id", viewer.id);
  if ((count ?? 0) >= MAX_PORTFOLIO_FILES) {
    await discard();
    return { error: `Your portfolio already has ${MAX_PORTFOLIO_FILES} pieces. Remove one first.` };
  }

  const { error } = await supabase.from("student_files").insert({
    student_id: viewer.id,
    path,
    file_name: name,
    mime_type: object.metadata?.mimetype ?? null,
    size_bytes: size,
  });
  if (error) {
    await discard();
    return { error: "We couldn't add that file. Try again in a minute." };
  }

  revalidatePath("/profile");
  return { error: null };
}

export async function removePortfolioFile(id: string): Promise<FileResult> {
  const viewer = await requireActiveMember();
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("student_files")
    .select("kind, path")
    .eq("id", id)
    .eq("student_id", viewer.id)
    .maybeSingle();
  if (!file) return { error: "That piece is already gone." };

  const { error } = await supabase.from("student_files").delete().eq("id", id).eq("student_id", viewer.id);
  if (error) return { error: "We couldn't remove that. Try again." };
  if (file.path) await supabase.storage.from(file.kind === "video" ? "videos" : "portfolio").remove([file.path as string]);

  revalidatePath("/profile", "layout");
  return { error: null };
}

// ── Photo ────────────────────────────────────────────────────────────────
// The browser crops the photo square and re-encodes it as a JPEG, which also drops its location data.

async function clearFolder(bucket: string, userId: string, keep: string | null) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).list(userId, { limit: 100 });
  const stale = ((data ?? []) as StoredObject[]).map((o) => `${userId}/${o.name}`).filter((p) => p !== keep);
  if (stale.length) await supabase.storage.from(bucket).remove(stale);
}

export async function savePhoto(path: string): Promise<FileResult> {
  const viewer = await requireActiveMember();
  if (!new RegExp(`^${viewer.id}/photo-\\d+\\.jpg$`).test(path)) return { error: "That upload didn't go through. Try again." };

  const supabase = await createClient();
  const object = await findObject("photos", path);
  const size = object?.metadata?.size ?? 0;
  if (!object || size < 1 || size > MAX_PHOTO_BYTES || !object.metadata?.mimetype?.startsWith("image/")) {
    await supabase.storage.from("photos").remove([path]);
    return { error: "That photo didn't upload properly. Try a JPG or PNG." };
  }

  const { error } = await supabase.from("students").upsert({ user_id: viewer.id, photo_path: path }, { onConflict: "user_id" });
  if (error) {
    await supabase.storage.from("photos").remove([path]);
    return { error: "We couldn't save your photo. Try again in a minute." };
  }
  await clearFolder("photos", viewer.id, path);
  revalidatePath("/profile", "layout");
  return { error: null };
}

export async function removePhoto(): Promise<FileResult> {
  const viewer = await requireActiveMember();
  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ photo_path: null }).eq("user_id", viewer.id);
  if (error) return { error: "We couldn't remove your photo. Try again." };
  await clearFolder("photos", viewer.id, null);
  revalidatePath("/profile", "layout");
  return { error: null };
}

// ── A video as one portfolio piece: an upload or a link ──────────────────

async function portfolioHasRoom(viewerId: string) {
  const supabase = await createClient();
  // The profile row has to exist before pieces can hang off it.
  await supabase.from("students").upsert({ user_id: viewerId }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data } = await supabase.from("student_files").select("kind").eq("student_id", viewerId);
  const pieces = (data ?? []) as { kind: string }[];
  if (pieces.length >= MAX_PORTFOLIO_FILES) return `Your portfolio already has ${MAX_PORTFOLIO_FILES} pieces. Remove one first.`;
  if (pieces.some((p) => p.kind !== "file")) return "Your portfolio already has a video. Remove it to add a different one.";
  return null;
}

export async function addPortfolioVideo(path: string, fileName: string, seconds: number): Promise<FileResult> {
  const viewer = await requireActiveMember();
  if (!new RegExp(`^${viewer.id}/video-\\d+\\.(mp4|webm|mov)$`).test(path)) return { error: "That upload didn't go through. Try again." };

  const supabase = await createClient();
  const discard = () => supabase.storage.from("videos").remove([path]);
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > MAX_VIDEO_SECONDS + 5) {
    await discard();
    return { error: "Keep your video to 3 minutes or shorter." };
  }
  const object = await findObject("videos", path);
  const size = object?.metadata?.size ?? 0;
  if (!object || size < 1 || size > MAX_VIDEO_BYTES || !object.metadata?.mimetype?.startsWith("video/")) {
    await discard();
    return { error: "That video didn't upload properly. Try an MP4." };
  }
  const full = await portfolioHasRoom(viewer.id);
  if (full) {
    await discard();
    return { error: full };
  }

  const { error } = await supabase.from("student_files").insert({
    student_id: viewer.id,
    kind: "video",
    path,
    file_name: fileName.trim().slice(0, 200) || "Video",
    mime_type: object.metadata?.mimetype ?? null,
    size_bytes: size,
    video_seconds: Math.max(1, Math.round(seconds)),
  });
  if (error) {
    await discard();
    return { error: "We couldn't add your video. Try again in a minute." };
  }
  revalidatePath("/profile", "layout");
  return { error: null };
}

export async function addPortfolioVideoLink(raw: string): Promise<FileResult> {
  const viewer = await requireActiveMember();
  const value = raw.trim();
  const link = value.length <= 300 ? videoLink(value) : null;
  if (!link) return { error: "Paste a YouTube, Vimeo, Loom or Google Drive link to your video." };

  const full = await portfolioHasRoom(viewer.id);
  if (full) return { error: full };

  const supabase = await createClient();
  const { error } = await supabase.from("student_files").insert({
    student_id: viewer.id,
    kind: "video_link",
    url: /^https?:\/\//i.test(value) ? value.replace(/^http:/i, "https:") : `https://${value}`,
    file_name: `Video on ${link.provider}`,
  });
  if (error) return { error: "We couldn't save that link. Try again in a minute." };
  revalidatePath("/profile", "layout");
  return { error: null };
}
