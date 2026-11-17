import "server-only";
import { sendEmail } from "@/lib/email";
import { joinApprovedEmail, joinDeclinedEmail, newApplicantEmail, partnerWelcomeEmail } from "@/lib/email-templates";
import { publicEnv } from "@/lib/env";
import { teamName } from "@/lib/teams";

// The emails the app sends. Best effort, like every email.

export async function emailJoinDecision(to: string, approved: boolean, team: string) {
  const name = teamName(team) ?? "Longhorn Racing";
  await sendEmail(
    to,
    approved ? "join_approved" : "join_declined",
    approved ? joinApprovedEmail({ team: name, profileUrl: `${publicEnv.siteUrl}/profile` }) : joinDeclinedEmail({ team: name }),
  );
}

// Sent when an admin invites a recruiter, or approves a request from the public form.
export async function emailPartnerWelcome(to: string, company: string, reason: "invited" | "approved") {
  await sendEmail(
    to,
    reason === "invited" ? "partner_invited" : "partner_approved",
    partnerWelcomeEmail({ company, email: to, invited: reason === "invited", signInUrl: `${publicEnv.siteUrl}/login?door=partner` }),
  );
}

// Sent to a recruiter when a student marks "I applied" on their post.
export async function emailNewApplicant(
  to: string,
  { jobId, jobTitle, studentId, student, team, details }: { jobId: string; jobTitle: string; studentId: string; student: string; team: string | null; details: [string, string][] },
) {
  await sendEmail(
    to,
    "new_applicant",
    newApplicantEmail({
      student,
      team,
      jobTitle,
      details,
      profileUrl: `${publicEnv.siteUrl}/partner/students/${studentId}`,
      applicantsUrl: `${publicEnv.siteUrl}/partner/jobs/${jobId}`,
    }),
  );
}
