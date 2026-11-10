// Choices on the student profile, shared by the editor and its server actions.

export const CITIZENSHIP = [
  { value: "us_citizen", label: "U.S. citizen" },
  { value: "permanent_resident", label: "U.S. permanent resident (green card)" },
  { value: "requires_visa_support", label: "Other: will need work visa support" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const CAREER_INTEREST = [
  { value: "internship", label: "Internship" },
  { value: "full_time", label: "Full-time" },
  { value: "both", label: "Either" },
] as const;

export const GRAD_SEMESTERS = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
] as const;

export type Citizenship = (typeof CITIZENSHIP)[number]["value"];
export type CareerInterest = (typeof CAREER_INTEREST)[number]["value"];
export type GradSemester = (typeof GRAD_SEMESTERS)[number]["value"];

export const MAX_SKILLS = 20;

// Last year through five years out: everyone currently on a team.
export function gradYears(now = new Date()) {
  const year = now.getFullYear();
  return Array.from({ length: 7 }, (_, i) => year - 1 + i);
}

// ── Uploads ──────────────────────────────────────────────────────────────
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PORTFOLIO_FILES = 3;

// Partners download portfolio files, so nothing that runs when opened.
const BLOCKED_EXTENSIONS = new Set([
  "exe", "msi", "bat", "cmd", "com", "scr", "ps1", "sh", "app", "dmg", "pkg", "jar",
  "js", "mjs", "vbs", "html", "htm", "svg", "xhtml", "php", "dll", "lnk", "iso",
]);

export function isBlockedFile(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return BLOCKED_EXTENSIONS.has(extension);
}

// Storage keys allow a narrow character set; the original name is kept in the database.
export function storageSafeName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+/, "");
  return (cleaned || "file").slice(-100);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// "a, b and c"
export function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

// ── "What you built": words, not characters ─────────────────────────────
export const MAX_WORDS = 350;

export function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// ── Photo, and a video as a portfolio piece ──────────────────────────────
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_SIZE = 512; // photos are cropped square to this many pixels before upload
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 3 * 60; // recruiters don't watch past three minutes
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

export function formatDuration(seconds: number) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type VideoLink = { provider: "YouTube" | "Vimeo" | "Loom" | "Google Drive"; embedUrl: string };

// The video sites recruiters can open anywhere, and the player URL each one allows in a frame.
export function videoLink(raw: string): VideoLink | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  const parts = url.pathname.split("/").filter(Boolean);
  const id = (value: string | null | undefined) => (value && /^[\w-]{6,}$/.test(value) ? value : null);

  if (host === "youtu.be" || host === "youtube.com") {
    const video = host === "youtu.be" ? id(parts[0]) : id(url.searchParams.get("v")) ?? (["shorts", "embed", "live"].includes(parts[0]) ? id(parts[1]) : null);
    return video ? { provider: "YouTube", embedUrl: `https://www.youtube-nocookie.com/embed/${video}` } : null;
  }
  if (host === "vimeo.com") {
    const video = parts.find((p) => /^\d+$/.test(p));
    return video ? { provider: "Vimeo", embedUrl: `https://player.vimeo.com/video/${video}` } : null;
  }
  if (host === "loom.com") {
    const video = parts[0] === "share" || parts[0] === "embed" ? id(parts[1]) : null;
    return video ? { provider: "Loom", embedUrl: `https://www.loom.com/embed/${video}` } : null;
  }
  if (host === "drive.google.com") {
    const file = parts[0] === "file" && parts[1] === "d" ? id(parts[2]) : id(url.searchParams.get("id"));
    return file ? { provider: "Google Drive", embedUrl: `https://drive.google.com/file/d/${file}/preview` } : null;
  }
  return null;
}
