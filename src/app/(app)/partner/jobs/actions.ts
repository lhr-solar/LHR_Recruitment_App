"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActivePartner } from "@/lib/auth";
import { JOB_TYPES, MAX_DESCRIPTION, MAX_LOCATION, MAX_TITLE, todayInAustin, type JobStatus } from "@/lib/job-options";
import { companyFor } from "@/lib/partner";
import { createClient } from "@/lib/supabase/server";
import { isTeamSlug } from "@/lib/teams";

export type JobFormState = { status: "idle" } | { status: "error"; message: string; fieldErrors: Record<string, string> };

const jobSchema = z.object({
  title: z.string().trim().min(1, "Give the role a title.").max(MAX_TITLE, `Keep the title to ${MAX_TITLE} characters.`),
  job_type: z.enum(JOB_TYPES.map((t) => t.value) as [string, ...string[]], { message: "Choose the kind of role." }),
  location: z
    .string()
    .trim()
    .max(MAX_LOCATION, `Keep the location to ${MAX_LOCATION} characters.`)
    .transform((value) => value || null),
  is_remote: z.boolean(),
  description: z
    .string()
    .trim()
    .min(1, "Describe the role: what the engineer will work on and who you're looking for.")
    .max(MAX_DESCRIPTION, `Keep the description to ${MAX_DESCRIPTION.toLocaleString("en-US")} characters.`),
  apply_url: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const withProtocol = /^https?:\/\//i.test(value) ? value.replace(/^http:/i, "https:") : `https://${value}`;
      try {
        if (!value) throw new Error("empty");
        const url = new URL(withProtocol);
        if (!url.hostname.includes(".")) throw new Error("no domain");
        if (url.toString().length > 600) {
          ctx.addIssue({ code: "custom", message: "That address is too long." });
          return z.NEVER;
        }
        return url.toString();
      } catch {
        ctx.addIssue({ code: "custom", message: "Enter the page where students apply, like careers.acme.com/jobs/123." });
        return z.NEVER;
      }
    }),
  target_teams: z.array(z.string()).transform((teams) => [...new Set(teams.filter(isTeamSlug))]),
  deadline: z
    .string()
    .transform((value) => value || null)
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), "Pick a date."),
});

// Creates or updates a post. "draft" keeps it hidden; "publish" opens it on the board; "save"
// updates a post without changing whether it's open.
export async function saveJob(_prev: JobFormState, formData: FormData): Promise<JobFormState> {
  const viewer = await requireActivePartner();
  const company = await companyFor(viewer.id);
  if (!company) return { status: "error", message: "We couldn't find your company. Sign out and back in.", fieldErrors: {} };

  const id = String(formData.get("id") ?? "");
  const intent = formData.get("intent");
  if (intent !== "draft" && intent !== "publish" && intent !== "save") {
    return { status: "error", message: "Something was off with that form. Refresh and try again.", fieldErrors: {} };
  }

  const parsed = jobSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    job_type: String(formData.get("job_type") ?? ""),
    location: String(formData.get("location") ?? ""),
    is_remote: formData.get("is_remote") === "on",
    description: String(formData.get("description") ?? ""),
    apply_url: String(formData.get("apply_url") ?? ""),
    target_teams: formData.getAll("target_teams").map(String),
    deadline: String(formData.get("deadline") ?? ""),
  });
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  } else if (intent !== "draft" && parsed.data.deadline && parsed.data.deadline < todayInAustin()) {
    fieldErrors.deadline = "That deadline has passed. Pick a later date, or leave it blank.";
  }
  if (!parsed.success || Object.keys(fieldErrors).length) {
    return { status: "error", message: "Some fields need a fix before we can save.", fieldErrors };
  }

  const supabase = await createClient();
  const values = { ...parsed.data, ...(intent === "publish" ? { status: "open" as JobStatus } : {}) };
  let jobId = id;
  if (id) {
    // Row-level security keeps this to the recruiter's own company.
    const { data, error } = await supabase.from("jobs").update(values).eq("id", id).select("id").maybeSingle();
    if (error || !data) return { status: "error", message: "We couldn't save this post. Try again in a minute.", fieldErrors: {} };
  } else {
    const { data, error } = await supabase
      .from("jobs")
      .insert({ ...values, company_id: company.id, created_by: viewer.id, status: intent === "publish" ? "open" : "draft" })
      .select("id")
      .single();
    if (error || !data) return { status: "error", message: "We couldn't save this post. Try again in a minute.", fieldErrors: {} };
    jobId = data.id;
  }

  revalidatePath("/partner/jobs");
  revalidatePath("/jobs");
  redirect(`/partner/jobs/${jobId}`);
}

// Publish, close or reopen a post.
export async function setJobStatus(formData: FormData): Promise<void> {
  await requireActivePartner();
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status");
  if (status !== "open" && status !== "closed") return;

  const supabase = await createClient();
  await supabase.from("jobs").update({ status }).eq("id", id);
  revalidatePath("/partner/jobs");
  revalidatePath(`/partner/jobs/${id}`);
  revalidatePath("/jobs");
}

// Only drafts can be deleted; a post students have seen is closed instead, so its counts and
// applicants stay on record.
export async function deleteDraft(formData: FormData): Promise<void> {
  await requireActivePartner();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("jobs").delete().eq("id", id).eq("status", "draft");
  revalidatePath("/partner/jobs");
  redirect("/partner/jobs");
}
