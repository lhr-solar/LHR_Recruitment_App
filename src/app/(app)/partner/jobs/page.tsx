import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivePartner } from "@/lib/auth";
import { STATUS_LABEL, formatDeadline, jobTypeLabel, todayInAustin, whereLine } from "@/lib/job-options";
import { loadCompanyJobs } from "@/lib/jobs";
import { companyFor } from "@/lib/partner";

export const metadata: Metadata = { title: "Jobs" };

export default async function PartnerJobsPage() {
  const viewer = await requireActivePartner();
  const company = await companyFor(viewer.id);
  if (!company) redirect("/account");
  const { jobs, stats, error } = await loadCompanyJobs(company.id);
  const today = todayInAustin();

  return (
    <div>
      <header className="page-head page-head-action">
        <div>
          <h1>Jobs</h1>
          <p>Post roles for Longhorn Racing members. Students apply on your site; you see who viewed, clicked through and applied.</p>
        </div>
        <Link href="/partner/jobs/new" className="btn btn-primary">
          Post a job
        </Link>
      </header>

      <section className="panel table-panel" aria-labelledby="jobs-title">
        <div className="table-head">
          <h2 id="jobs-title">{company.name} posts</h2>
          <span className="num text-[var(--color-muted)]">{error ? "" : jobs.length}</span>
        </div>

        {error ? (
          <p className="table-message">We couldn&apos;t load your posts. Refresh the page to try again.</p>
        ) : jobs.length === 0 ? (
          <p className="table-message">No posts yet. Post a job and it shows up on the board for every Longhorn Racing member.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col" className="num">
                  Viewed
                </th>
                <th scope="col" className="num">
                  Clicked apply
                </th>
                <th scope="col" className="num">
                  Applied
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const s = stats.get(job.id) ?? { views: 0, clicks: 0, applicants: 0 };
                const expired = job.status === "open" && job.deadline !== null && job.deadline < today;
                return (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/partner/jobs/${job.id}`} className="cell-primary link-plain">
                        {job.title}
                      </Link>
                      <span className="cell-secondary">
                        {[jobTypeLabel(job.type), whereLine(job.location, job.remote), job.deadline && `Apply by ${formatDeadline(job.deadline)}`].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td>
                      <span className="status-chip" data-status={expired ? "closed" : job.status}>
                        {expired ? "Deadline passed" : STATUS_LABEL[job.status]}
                      </span>
                    </td>
                    <td className="num">{s.views}</td>
                    <td className="num">{s.clicks}</td>
                    <td className="num">{s.applicants}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <p className="book-note">Counts are people, not page loads: a student who opens a post three times counts once.</p>
    </div>
  );
}
