import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JobView } from "@/components/job-view";
import { requireActiveMember } from "@/lib/auth";
import { loadJob } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";
import { AppliedToggle, TrackView } from "./job-client";

export const metadata: Metadata = { title: "Job" };

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireActiveMember();
  // Students can read open posts only.
  const job = await loadJob((await params).id);
  if (!job || job.status !== "open") notFound();

  const supabase = await createClient();
  const { data: mark } = await supabase.from("job_applications").select("job_id").eq("job_id", job.id).eq("student_id", viewer.id).maybeSingle();

  return (
    <div className="pv-page">
      <TrackView jobId={job.id} />
      <Link href="/jobs" className="link back-link">
        Back to jobs
      </Link>
      <JobView
        job={job}
        actions={
          // A plain link: the route counts the click, then redirects to the company's page.
          <a className="btn btn-primary" href={`/jobs/${job.id}/apply`} target="_blank" rel="noopener">
            Apply on {job.company.name}&apos;s site
          </a>
        }
        aside={<AppliedToggle jobId={job.id} applied={Boolean(mark)} company={job.company.name} />}
      />
    </div>
  );
}
