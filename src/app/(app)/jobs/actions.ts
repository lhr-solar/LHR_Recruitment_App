"use server";

import { revalidatePath } from "next/cache";
import { requireActiveMember } from "@/lib/auth";
import { emailNewApplicant } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordJobEvent } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";
import { termLabel, type GradSemester } from "@/lib/student-options";
import { teamName } from "@/lib/teams";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Called once the post is on screen, rather than when the page renders, so link prefetching and
// crawlers don't count as views. The database keeps one view per student per post.
export async function recordJobView(jobId: string): Promise<void> {
  const viewer = await requireActiveMember();
  if (!UUID.test(jobId)) return;
  await recordJobEvent(jobId, viewer.id, "view");
}


export type AppliedResult = { error: string | null };

// "I applied" puts the student on the post's applicant list, which shares their profile with that
// company. Unmarking takes them off it.
export async function setApplied(jobId: string, applied: boolean): Promise<AppliedResult> {
  const viewer = await requireActiveMember();
  if (!UUID.test(jobId)) return { error: "We couldn't find that post." };
  const supabase = await createClient();

  if (!applied) {
    const { error } = await supabase.from("job_applications").delete().eq("job_id", jobId).eq("student_id", viewer.id);
    if (error) return { error: "We couldn't update that. Try again." };
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/jobs");
    return { error: null };
  }

  // Applications hang off the student profile, so make sure it exists.
  await supabase.from("students").upsert({ user_id: viewer.id }, { onConflict: "user_id", ignoreDuplicates: true });
  const { error } = await supabase
    .from("job_applications")
    .upsert({ job_id: jobId, student_id: viewer.id }, { onConflict: "job_id,student_id", ignoreDuplicates: true });
  if (error) return { error: "We couldn't mark that. The post may have closed; refresh and try again." };

  await notifyRecruiters(jobId, viewer);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { error: null };
}

// Tells the recruiter who posted the job (or everyone at the company, if they've left).
async function notifyRecruiters(jobId: string, student: { id: string; email: string; fullName: string | null; team: string | null }) {
  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("title, company_id, created_by").eq("id", jobId).maybeSingle();
  if (!job) return;

  const { data: members } = await admin.from("partner_members").select("user_id, profiles(email, status)").eq("company_id", job.company_id);
  const recruiters = ((members ?? []) as unknown as { user_id: string; profiles: { email: string; status: string } | null }[]).filter(
    (m) => m.profiles?.status === "active",
  );
  const poster = recruiters.find((m) => m.user_id === job.created_by);
  const to = (poster ? [poster] : recruiters).map((m) => m.profiles?.email).filter((email): email is string => Boolean(email));
  if (!to.length) return;

  // The details a recruiter looks for first. The student just applied, so sharing them is expected.
  const { data: profile } = await admin.from("students").select("major, grad_year, grad_semester, technical_focus").eq("user_id", student.id).maybeSingle();
  const details: [string, string][] = [];
  if (profile?.major) details.push(["Major", profile.major]);
  if (profile?.grad_year && profile.grad_semester) details.push(["Graduates", termLabel({ year: profile.grad_year, semester: profile.grad_semester as GradSemester })]);
  if (profile?.technical_focus) details.push(["Focus", profile.technical_focus]);

  const name = student.fullName?.trim() || student.email;
  const team = teamName(student.team);
  for (const email of to) {
    await emailNewApplicant(email, { jobId, jobTitle: job.title, studentId: student.id, student: name, team, details });
  }
}
