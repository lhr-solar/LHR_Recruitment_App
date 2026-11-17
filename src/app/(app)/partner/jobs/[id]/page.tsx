import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JobView } from "@/components/job-view";
import { SubmitButton } from "@/components/submit-button";
import { requireActivePartner } from "@/lib/auth";
import { STATUS_LABEL, todayInAustin } from "@/lib/job-options";
import { loadApplicants, loadJob, statsFor } from "@/lib/jobs";
import { GRAD_SEMESTERS } from "@/lib/student-options";
import { teamName } from "@/lib/teams";
import { deleteDraft, setJobStatus } from "../actions";

export const metadata: Metadata = { title: "Job post" };

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });

export default async function PartnerJobPage({ params }: { params: Promise<{ id: string }> }) {
  await requireActivePartner();
  const job = await loadJob((await params).id);
  if (!job) notFound();
  const [stats, applicants] = await Promise.all([statsFor([job.id]), loadApplicants(job.id)]);
  const s = stats.get(job.id) ?? { views: 0, clicks: 0, applicants: 0 };
  const expired = job.status === "open" && job.deadline !== null && job.deadline < todayInAustin();

  const statusLine =
    job.status === "draft"
      ? "Students can't see it until you publish."
      : job.status === "closed"
        ? "It's off the job board; reopen it to bring it back."
        : expired
          ? "The deadline has passed, so it's off the job board. Edit the deadline to bring it back."
          : "It's on the job board for every Longhorn Racing member.";

  return (
    <div className="pv-page">
      <Link href="/partner/jobs" className="link back-link">
        Back to jobs
      </Link>

      <div className={`preview-bar ${job.status !== "open" || expired ? "preview-bar-pending" : ""}`} role="status">
        <p>
          <strong>{STATUS_LABEL[job.status]}.</strong> {statusLine}
        </p>
        <div className="row-actions">
          <Link href={`/partner/jobs/${job.id}/edit`} className="btn btn-secondary">
            Edit
          </Link>
          {job.status === "draft" && (
            <form action={deleteDraft}>
              <input type="hidden" name="id" value={job.id} />
              <SubmitButton variant="danger" pendingLabel="Deleting">
                Delete draft
              </SubmitButton>
            </form>
          )}
          {job.status !== "draft" && (
            <form action={setJobStatus}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value={job.status === "open" ? "closed" : "open"} />
              <SubmitButton variant={job.status === "open" ? "danger" : "primary"} pendingLabel={job.status === "open" ? "Closing" : "Reopening"}>
                {job.status === "open" ? "Close post" : "Reopen"}
              </SubmitButton>
            </form>
          )}
        </div>
      </div>

      {job.status !== "draft" && (
        <section className="panel stat-row" aria-label="Post activity">
          <Stat label="Viewed" value={s.views} hint="Students who opened the post" />
          <Stat label="Clicked apply" value={s.clicks} hint="Went on to your application page" />
          <Stat label="Applied" value={s.applicants} hint="Marked “I applied”" />
        </section>
      )}

      {job.status !== "draft" && (
        <section className="panel table-panel" aria-labelledby="applicants-title">
          <div className="table-head">
            <h2 id="applicants-title">Applicants</h2>
            <span className="num text-[var(--color-muted)]">{applicants.length}</span>
          </div>
          {applicants.length === 0 ? (
            <p className="table-message">
              No one has marked &ldquo;I applied&rdquo; yet. When a student does, their profile shows up here, even if it&apos;s hidden from the resume book.
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Team</th>
                  <th scope="col">Major</th>
                  <th scope="col" className="num">
                    Marked
                  </th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <Link href={`/partner/students/${person.id}`} className="cell-primary link-plain">
                        {person.name}
                      </Link>
                      <span className="cell-secondary">{person.email}</span>
                    </td>
                    <td>{teamName(person.team)}</td>
                    <td>
                      {person.major ?? <span className="text-[var(--color-muted)]">Not set</span>}
                      {person.gradYear && (
                        <span className="cell-secondary">
                          Graduates {GRAD_SEMESTERS.find((g) => g.value === person.gradSemester)?.label} {person.gradYear}
                        </span>
                      )}
                    </td>
                    <td className="num">{dateFormat.format(new Date(person.appliedAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <h2 className="preview-label">What students see</h2>
      <JobView
        job={job}
        actions={
          <span className="btn btn-primary" aria-disabled="true">
            Apply on {job.company.name}&apos;s site
          </span>
        }
      />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="stat">
      <p className="stat-value num">{value}</p>
      <p className="stat-label">{label}</p>
      <p className="field-hint">{hint}</p>
    </div>
  );
}
