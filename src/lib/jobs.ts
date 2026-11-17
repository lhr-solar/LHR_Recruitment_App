import "server-only";
import { logoUrl } from "@/lib/partner-options";
import type { JobStatus, JobType } from "@/lib/job-options";
import { createClient } from "@/lib/supabase/server";

export type JobCompany = { id: string; name: string; website: string | null; description: string | null; logoUrl: string | null };

export type Job = {
  id: string;
  title: string;
  type: JobType;
  location: string | null;
  remote: boolean;
  description: string;
  applyUrl: string;
  teams: string[];
  deadline: string | null;
  status: JobStatus;
  publishedAt: string | null;
  updatedAt: string;
  company: JobCompany;
};

const JOB_COLUMNS =
  "id, title, job_type, location, is_remote, description, apply_url, target_teams, deadline, status, published_at, updated_at, partner_companies(id, name, website, description, logo_path)";

type JobRow = {
  id: string;
  title: string;
  job_type: JobType;
  location: string | null;
  is_remote: boolean;
  description: string;
  apply_url: string;
  target_teams: string[];
  deadline: string | null;
  status: JobStatus;
  published_at: string | null;
  updated_at: string;
  partner_companies: { id: string; name: string; website: string | null; description: string | null; logo_path: string | null } | null;
};

function toJob(row: JobRow): Job {
  const c = row.partner_companies;
  return {
    id: row.id,
    title: row.title,
    type: row.job_type,
    location: row.location,
    remote: row.is_remote,
    description: row.description,
    applyUrl: row.apply_url,
    teams: row.target_teams,
    deadline: row.deadline,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    company: {
      id: c?.id ?? "",
      name: c?.name ?? "A Longhorn Racing Partner",
      website: c?.website ?? null,
      description: c?.description ?? null,
      logoUrl: logoUrl(c?.logo_path ?? null),
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One post, read as the viewer: students get open posts, recruiters their company's, admins all.
export async function loadJob(id: string): Promise<Job | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select(JOB_COLUMNS).eq("id", id).maybeSingle();
  return data ? toJob(data as unknown as JobRow) : null;
}

// One row per student, post and kind. A plain insert, because students can't read job_events and
// Postgres needs that to check an upsert's conflict; "already counted" (23505) is fine.
export async function recordJobEvent(jobId: string, userId: string, kind: "view" | "click") {
  const supabase = await createClient();
  const { error } = await supabase.from("job_events").insert({ job_id: jobId, user_id: userId, kind });
  if (error && error.code !== "23505") console.error(`[jobs] couldn't record a ${kind}: ${error.message}`);
}

// ── Students: the board ──────────────────────────────────────────────────

export type BoardFilters = { q: string; type: JobType | ""; mine: boolean };

export async function loadBoard(filters: BoardFilters, team: string | null, today: string) {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(JOB_COLUMNS)
    .eq("status", "open")
    .or(`deadline.is.null,deadline.gte.${today}`)
    .order("published_at", { ascending: false })
    .limit(200);
  const q = filters.q.replace(/[,()*%_\\:"]/g, " ").trim();
  if (q) query = query.or(`title.ilike."*${q}*",location.ilike."*${q}*",description.ilike."*${q}*"`);
  if (filters.type) query = query.eq("job_type", filters.type);
  if (filters.mine && team) query = query.or(`target_teams.eq.{},target_teams.cs.{${team}}`);

  const [{ data, error }, applied] = await Promise.all([query, supabase.from("job_applications").select("job_id")]);
  return {
    jobs: ((data ?? []) as unknown as JobRow[]).map(toJob),
    applied: new Set(((applied.data ?? []) as { job_id: string }[]).map((a) => a.job_id)),
    error: Boolean(error),
  };
}

// ── Recruiters: their company's posts, with counts ───────────────────────

export type JobStats = { views: number; clicks: number; applicants: number };

export async function loadCompanyJobs(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_COLUMNS)
    .eq("company_id", companyId)
    .order("status")
    .order("updated_at", { ascending: false });
  const jobs = ((data ?? []) as unknown as JobRow[]).map(toJob);
  const stats = await statsFor(jobs.map((job) => job.id));
  return { jobs, stats, error: Boolean(error) };
}

export async function statsFor(jobIds: string[]): Promise<Map<string, JobStats>> {
  if (!jobIds.length) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("job_stats").select("job_id, views, clicks, applicants").in("job_id", jobIds);
  return new Map(
    ((data ?? []) as { job_id: string; views: number; clicks: number; applicants: number }[]).map((row) => [
      row.job_id,
      { views: Number(row.views), clicks: Number(row.clicks), applicants: Number(row.applicants) },
    ]),
  );
}

export type Applicant = {
  id: string;
  name: string;
  email: string;
  team: string;
  major: string | null;
  gradSemester: string | null;
  gradYear: number | null;
  appliedAt: string;
};

// Students who marked "I applied", newest first. Applying shares their profile with this company,
// so the resume_book view returns them even when they're hidden from the book.
export async function loadApplicants(jobId: string): Promise<Applicant[]> {
  const supabase = await createClient();
  const { data: marks } = await supabase
    .from("job_applications")
    .select("student_id, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  const rows = (marks ?? []) as { student_id: string; created_at: string }[];
  if (!rows.length) return [];

  const { data: people } = await supabase
    .from("resume_book")
    .select("user_id, full_name, email, team, major, grad_year, grad_semester")
    .in(
      "user_id",
      rows.map((r) => r.student_id),
    );
  const byId = new Map(
    ((people ?? []) as { user_id: string; full_name: string | null; email: string; team: string; major: string | null; grad_year: number | null; grad_semester: string | null }[]).map(
      (p) => [p.user_id, p],
    ),
  );
  return rows.flatMap((mark) => {
    const p = byId.get(mark.student_id);
    if (!p) return [];
    return [
      {
        id: p.user_id,
        name: p.full_name?.trim() || p.email,
        email: p.email,
        team: p.team,
        major: p.major,
        gradSemester: p.grad_semester,
        gradYear: p.grad_year,
        appliedAt: mark.created_at,
      },
    ];
  });
}
