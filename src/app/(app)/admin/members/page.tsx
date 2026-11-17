import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { STATUS_LABEL, profileState, type StudentSummary } from "@/lib/members";
import { createClient } from "@/lib/supabase/server";
import { TEAMS, isTeamSlug, teamName } from "@/lib/teams";

export const metadata: Metadata = { title: "Members" };

const PAGE_SIZE = 50;

const STATUSES = ["active", "pending", "suspended", "rejected"] as const;

type MemberRow = {
  id: string;
  full_name: string | null;
  email: string;
  team: string | null;
  status: string;
  is_admin: boolean;
  is_team_lead: boolean;
  students: StudentSummary;
};

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireStaff();
  const params = await searchParams;
  // Commas and parentheses would break the search filter's syntax, and names don't need them.
  const q = typeof params.q === "string" ? params.q.replace(/[,()\\%_]/g, " ").trim().slice(0, 100) : "";
  const team = viewer.isAdmin && isTeamSlug(params.team) ? params.team : "";
  const status = STATUSES.find((s) => s === params.status) ?? "";
  const role = params.role === "lead" || params.role === "admin" ? params.role : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "", 10) || 1);

  const supabase = await createClient();
  // Row-level security limits team leads to their own team.
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, team, status, is_admin, is_team_lead, students(major, grad_year, visible, resume_path)", { count: "exact" })
    .eq("account_type", "member")
    .order("full_name", { ascending: true, nullsFirst: false })
    .order("email");
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (team) query = query.eq("team", team);
  if (status) query = query.eq("status", status);
  if (role === "lead") query = query.eq("is_team_lead", true);
  if (role === "admin") query = query.eq("is_admin", true);
  const start = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(start, start + PAGE_SIZE - 1);
  const rows = (data ?? []) as unknown as MemberRow[];

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filters = { ...(q && { q }), ...(team && { team }), ...(status && { status }), ...(role && { role }) };
  const pageHref = (n: number) => `/admin/members?${new URLSearchParams({ ...filters, ...(n > 1 && { page: String(n) }) })}`;
  const filtered = Object.keys(filters).length > 0;

  return (
    <div>
      <header className="page-head">
        <h1>Members</h1>
        <p>
          {viewer.isAdmin
            ? "Everyone with an LHR member account. Open someone to change their team or roles, or to pause their access."
            : `Members of the ${teamName(viewer.team)} team. Open someone to pause their access if they've left the team.`}
        </p>
      </header>

      <section className="panel table-panel" aria-labelledby="members-title">
        <div className="table-head table-head-wrap">
          <h2 id="members-title">
            {filtered ? "Matching members" : "All members"} <span className="table-head-count num">{error ? "" : total}</span>
          </h2>
          <Form action="/admin/members" className="table-filter">
            <label className="visually-hidden" htmlFor="members-q">
              Search names and emails
            </label>
            <input id="members-q" name="q" type="search" className="input" defaultValue={q} placeholder="Search" />
            {viewer.isAdmin && (
              <>
                <label className="visually-hidden" htmlFor="members-team">
                  Team
                </label>
                <select id="members-team" name="team" className="input" defaultValue={team}>
                  <option value="">All teams</option>
                  {TEAMS.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            <label className="visually-hidden" htmlFor="members-status">
              Status
            </label>
            <select id="members-status" name="status" className="input" defaultValue={status}>
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <label className="visually-hidden" htmlFor="members-role">
              Role
            </label>
            <select id="members-role" name="role" className="input" defaultValue={role}>
              <option value="">Any role</option>
              <option value="lead">Team leads</option>
              <option value="admin">Admins</option>
            </select>
            <button type="submit" className="btn btn-secondary">
              Show
            </button>
          </Form>
        </div>

        {error ? (
          <p className="table-message">We couldn&apos;t load members. Refresh the page to try again.</p>
        ) : rows.length === 0 ? (
          <p className="table-message">{filtered ? "No members match those filters." : "No members yet."}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Team</th>
                <th scope="col">Profile</th>
                <th scope="col">Account</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/admin/members/${row.id}`} className="link-plain cell-primary">
                      {row.full_name ?? row.email}
                    </Link>
                    {row.full_name && <span className="cell-secondary">{row.email}</span>}
                  </td>
                  <td>
                    {row.team ? (
                      <span className="team-label">
                        <span className="book-team-dot" data-team={row.team} aria-hidden="true" />
                        {teamName(row.team)}
                      </span>
                    ) : (
                      <span className="text-[var(--color-muted)]">None yet</span>
                    )}
                    {(row.is_admin || row.is_team_lead) && (
                      <span className="cell-secondary">{[row.is_admin && "Admin", row.is_team_lead && "Team lead"].filter(Boolean).join(" · ")}</span>
                    )}
                  </td>
                  <td>{profileState(row.students)}</td>
                  <td>
                    {row.status === "active" ? (
                      STATUS_LABEL.active
                    ) : (
                      <span className="status-chip" data-status={row.status}>
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <nav className="table-pages" aria-label="Pages">
            {page > 1 ? <Link className="btn btn-secondary" href={pageHref(page - 1)}>Previous</Link> : <span />}
            <span className="num">
              Page {page} of {pages}
            </span>
            {page < pages ? <Link className="btn btn-secondary" href={pageHref(page + 1)}>Next</Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
