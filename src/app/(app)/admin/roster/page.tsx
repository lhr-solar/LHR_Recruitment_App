import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TEAMS, isTeamSlug, teamName } from "@/lib/teams";
import { removeFromRoster } from "./actions";
import { RosterForm } from "./roster-form";

export const metadata: Metadata = { title: "Roster" };

const PAGE_SIZE = 100;
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const ACCOUNT: Record<string, string> = {
  active: "Signed in",
  pending: "Waiting to join",
  rejected: "Declined earlier",
  suspended: "Paused",
};

export default async function RosterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireStaff();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase().slice(0, 100) : "";
  const team = viewer.isAdmin && isTeamSlug(params.team) ? params.team : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "", 10) || 1);

  const supabase = await createClient();
  // Row-level security limits team leads to their own team.
  let query = supabase.from("roster_entries").select("email, team, created_at", { count: "exact" }).order("email");
  if (q) query = query.ilike("email", `%${q.replace(/[%_\\]/g, "\\$&")}%`);
  if (team) query = query.eq("team", team);
  const start = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(start, start + PAGE_SIZE - 1);
  const rows = data ?? [];

  // Whether each listed email has signed in. Read past row-level security, which hides members
  // who haven't been placed on a team yet from team leads; only these emails are looked up.
  const accounts = new Map<string, string>();
  if (rows.length) {
    const { data: profiles } = await createAdminClient()
      .from("profiles")
      .select("email, status")
      .eq("account_type", "member")
      .in("email", rows.map((r) => r.email));
    for (const p of profiles ?? []) accounts.set(p.email.toLowerCase(), p.status);
  }

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => `/admin/roster?${new URLSearchParams({ ...(q && { q }), ...(team && { team }), ...(n > 1 && { page: String(n) }) })}`;
  const scope = viewer.isAdmin ? "any team" : `the ${teamName(viewer.team)} team`;

  return (
    <div className="admin-stack">
      <header className="page-head">
        <h1>Roster</h1>
        <p>Emails approved for {scope}. Listed members skip the join request when they first sign in, and anyone already waiting is let in when you add them.</p>
      </header>

      <section className="panel roster-add" aria-labelledby="roster-add-title">
        <h2 id="roster-add-title">Add members</h2>
        <RosterForm team={viewer.isAdmin ? null : viewer.team} />
      </section>

      <section className="panel table-panel" aria-labelledby="roster-title">
        <div className="table-head">
          <h2 id="roster-title">
            On the roster <span className="table-head-count num">{error ? "" : total}</span>
          </h2>
          <Form action="/admin/roster" className="table-filter">
            <label className="visually-hidden" htmlFor="roster-q">
              Search emails
            </label>
            <input id="roster-q" name="q" type="search" className="input" defaultValue={q} placeholder="Search emails" />
            {viewer.isAdmin && (
              <>
                <label className="visually-hidden" htmlFor="roster-team-filter">
                  Team
                </label>
                <select id="roster-team-filter" name="team" className="input" defaultValue={team}>
                  <option value="">All teams</option>
                  {TEAMS.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            <button type="submit" className="btn btn-secondary">
              Show
            </button>
          </Form>
        </div>

        {error ? (
          <p className="table-message">We couldn&apos;t load the roster. Refresh the page to try again.</p>
        ) : rows.length === 0 ? (
          <p className="table-message">{q || team ? "No roster emails match." : "No one is on the roster yet. Add emails above."}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Team</th>
                <th scope="col">Account</th>
                <th scope="col" className="num">
                  Added
                </th>
                <th scope="col">
                  <span className="visually-hidden">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = accounts.get(row.email);
                return (
                  <tr key={row.email}>
                    <td>
                      <span className="cell-primary">{row.email}</span>
                    </td>
                    <td>
                      <span className="team-label">
                        <span className="book-team-dot" data-team={row.team} aria-hidden="true" />
                        {teamName(row.team)}
                      </span>
                    </td>
                    <td>{status ? ACCOUNT[status] : <span className="text-[var(--color-muted)]">Hasn&apos;t signed in</span>}</td>
                    <td className="num">{dateFormat.format(new Date(row.created_at))}</td>
                    <td>
                      <form action={removeFromRoster} className="row-actions">
                        <input type="hidden" name="email" value={row.email} />
                        <SubmitButton variant="secondary" pendingLabel="Removing">
                          Remove
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
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
      <p className="book-note">Removing an email doesn&apos;t sign anyone out. To take away someone&apos;s access, pause their account under Members.</p>
    </div>
  );
}
