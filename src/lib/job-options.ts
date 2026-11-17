// Job post choices, shared by the post editor, its server actions and the board.

export const JOB_TYPES = [
  { value: "internship", label: "Internship" },
  { value: "co_op", label: "Co-op" },
  { value: "full_time", label: "Full-time" },
] as const;

export type JobType = (typeof JOB_TYPES)[number]["value"];
export type JobStatus = "draft" | "open" | "closed";

export const MAX_TITLE = 140;
export const MAX_LOCATION = 140;
export const MAX_DESCRIPTION = 8000;

export function jobTypeLabel(value: string) {
  return JOB_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const STATUS_LABEL: Record<JobStatus, string> = { draft: "Draft", open: "Open", closed: "Closed" };

const dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// Deadlines are dates with no time of day, so they're formatted as UTC to stay on the right day.
export function formatDeadline(date: string) {
  return dayFormat.format(new Date(`${date}T00:00:00Z`));
}

// Today in Austin, as YYYY-MM-DD: a post is open through the whole of its deadline day there.
export function todayInAustin(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(now);
}

// "Austin, TX · Remote", "Remote", or nothing.
export function whereLine(location: string | null, remote: boolean) {
  return [location, remote ? (location ? "Remote OK" : "Remote") : null].filter(Boolean).join(" · ");
}
