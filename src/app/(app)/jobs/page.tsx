import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { CompanyLogo } from "@/components/job-view";
import { requireActiveMember } from "@/lib/auth";
import { JOB_TYPES, formatDeadline, jobTypeLabel, todayInAustin, whereLine, type JobType } from "@/lib/job-options";
import { loadBoard } from "@/lib/jobs";
import { TEAMS, teamName } from "@/lib/teams";

export const metadata: Metadata = { title: "Jobs" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

export default async function JobsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const viewer = await requireActiveMember();
  const params = await searchParams;
  const type = one(params.type);
  const filters = {
    q: one(params.q).slice(0, 80),
    type: JOB_TYPES.some((t) => t.value === type) ? (type as JobType) : ("" as const),
    mine: one(params.mine) === "1",
  };
  const today = todayInAustin();
  const { jobs, applied, error } = await loadBoard(filters, viewer.team, today);
  const filtered = Boolean(filters.q || filters.type || filters.mine);
  const myTeam = teamName(viewer.team);

  return (
    <div>
      <header className="page-head">
        <h1>Jobs</h1>
        <p>Internships, co-ops and full-time roles posted by Longhorn Racing Partners. You apply on the company&apos;s site.</p>
      </header>

      <Form action="/jobs" className="panel board-filters" aria-label="Filter jobs">
        <div className="field board-search">
          <label className="field-label" htmlFor="jobs-q">
            Search
          </label>
          <input id="jobs-q" name="q" type="search" className="input" defaultValue={filters.q} placeholder="Title, location or keyword" maxLength={80} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="jobs-type">
            Kind of role
          </label>
          <select id="jobs-type" name="type" className="input" defaultValue={filters.type}>
            <option value="">Any</option>
            {JOB_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {myTeam && (
          <label className="check board-mine">
            <input type="checkbox" name="mine" value="1" defaultChecked={filters.mine} />
            Open to {myTeam}
          </label>
        )}
        <div className="board-submit">
          <button type="submit" className="btn btn-secondary">
            Show jobs
          </button>
          {filtered && (
            <Link href="/jobs" className="btn btn-quiet">
              Clear
            </Link>
          )}
        </div>
      </Form>

      {error ? (
        <div className="notice notice-error" role="alert">
          <p>We couldn&apos;t load jobs. Refresh the page to try again.</p>
        </div>
      ) : jobs.length === 0 ? (
        <section className="panel empty-block" aria-labelledby="jobs-empty">
          <h2 id="jobs-empty">{filtered ? "No jobs match" : "No roles posted yet"}</h2>
          <p>
            {filtered
              ? "Try a different search, or clear the filters."
              : "When a Partner posts a role, it shows up here with a link to apply on their site."}
          </p>
        </section>
      ) : (
        <>
          <h2 className="book-count board-count">
            {jobs.length} open {jobs.length === 1 ? "role" : "roles"}
          </h2>
          <ul className="board-list">
            {jobs.map((job) => {
              const teams = TEAMS.filter((t) => job.teams.includes(t.slug)).map((t) => t.name);
              return (
                <li key={job.id} className="panel board-card">
                  <CompanyLogo company={job.company} size={48} />
                  <div className="board-card-body">
                    <p className="job-company">{job.company.name}</p>
                    <h3>
                      <Link href={`/jobs/${job.id}`} className="book-card-link">
                        {job.title}
                      </Link>
                    </h3>
                    <p className="book-card-facts">
                      {[jobTypeLabel(job.type), whereLine(job.location, job.remote), teams.length ? `For ${teams.join(", ")}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="board-card-side">
                    {applied.has(job.id) && <span className="status-chip" data-status="open">Applied</span>}
                    {job.deadline && <span className="cell-secondary">Apply by {formatDeadline(job.deadline)}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
