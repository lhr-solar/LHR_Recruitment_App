import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActivePartner } from "@/lib/auth";
import { todayInAustin } from "@/lib/job-options";
import { companyFor } from "@/lib/partner";
import { loadJob } from "@/lib/jobs";
import { JobForm } from "../../job-form";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireActivePartner();
  const company = await companyFor(viewer.id);
  if (!company) redirect("/account");
  // Row-level security only returns the recruiter's own company's posts.
  const job = await loadJob((await params).id);
  if (!job) notFound();

  return (
    <div className="pv-page">
      <Link href={`/partner/jobs/${job.id}`} className="link back-link">
        Back to the post
      </Link>
      <header className="page-head">
        <h1>Edit post</h1>
        <p>{job.status === "open" ? "Changes show on the job board as soon as you save." : "Students don't see this post until it's published."}</p>
      </header>
      <JobForm
        company={company}
        today={todayInAustin()}
        job={{
          id: job.id,
          title: job.title,
          type: job.type,
          location: job.location,
          remote: job.remote,
          description: job.description,
          applyUrl: job.applyUrl,
          teams: job.teams,
          deadline: job.deadline,
          status: job.status,
        }}
      />
    </div>
  );
}
