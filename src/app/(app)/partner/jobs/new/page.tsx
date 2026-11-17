import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivePartner } from "@/lib/auth";
import { todayInAustin } from "@/lib/job-options";
import { companyFor } from "@/lib/partner";
import { JobForm } from "../job-form";

export const metadata: Metadata = { title: "Post a job" };

export default async function NewJobPage() {
  const viewer = await requireActivePartner();
  const company = await companyFor(viewer.id);
  if (!company) redirect("/account");
  return (
    <div className="pv-page">
      <Link href="/partner/jobs" className="link back-link">
        Back to jobs
      </Link>
      <header className="page-head">
        <h1>Post a job</h1>
        <p>Save a draft to finish later, or publish to put it on the job board for Longhorn Racing members.</p>
      </header>
      <JobForm
        company={company}
        today={todayInAustin()}
        job={{ id: null, title: "", type: "internship", location: null, remote: false, description: "", applyUrl: "", teams: [], deadline: null, status: "draft" }}
      />
    </div>
  );
}
