import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JobView } from "@/components/job-view";
import { SubmitButton } from "@/components/submit-button";
import { requireStaff } from "@/lib/auth";
import { STATUS_LABEL } from "@/lib/job-options";
import { loadJob, statsFor } from "@/lib/jobs";
import { deleteJob, moderateJob } from "../actions";

export const metadata: Metadata = { title: "Job post" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminJobPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff();
  if (!viewer.isAdmin) redirect("/admin");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  // Admins read every post, whatever its status.
  const job = await loadJob(id);
  if (!job) notFound();
  const stats = (await statsFor([job.id])).get(job.id);

  return (
    <div className="pv-page">
      <Link href="/admin/jobs" className="link back-link">
        Back to job posts
      </Link>

      <div className={`preview-bar ${job.status !== "open" ? "preview-bar-pending" : ""}`} role="status">
        <p>
          <strong>{STATUS_LABEL[job.status]}.</strong> {job.company.name} ·{" "}
          {stats ? `${stats.views} viewed, ${stats.clicks} clicked apply, ${stats.applicants} applied` : "No activity yet"}
        </p>
        <div className="row-actions">
          {job.status === "open" ? (
            <form action={moderateJob}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="closed" />
              <SubmitButton variant="danger" pendingLabel="Closing">
                Close post
              </SubmitButton>
            </form>
          ) : (
            <>
              {job.status === "closed" && (
                <form action={moderateJob}>
                  <input type="hidden" name="id" value={job.id} />
                  <input type="hidden" name="status" value="open" />
                  <SubmitButton variant="secondary" pendingLabel="Reopening">
                    Reopen
                  </SubmitButton>
                </form>
              )}
              <form action={deleteJob}>
                <input type="hidden" name="id" value={job.id} />
                <SubmitButton variant="danger" pendingLabel="Deleting">
                  Delete post
                </SubmitButton>
              </form>
            </>
          )}
        </div>
      </div>
      {job.status === "open" && <p className="book-note">Closing takes it off the job board straight away. Close a post before deleting it.</p>}

      <JobView job={job} />
    </div>
  );
}
