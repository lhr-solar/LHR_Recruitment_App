// Sends one of every LHR Careers email, filled with sample data, so you can see how they look in a
// real inbox. Uses the same templates and logo as the app; nothing is written to the email log.
//
//   node --env-file=.env.local scripts/send-email-previews.mjs you@utexas.edu
//
// Links point at PREVIEW_SITE_URL (default https://careers.longhornracing.org).
import { setTimeout as sleep } from "node:timers/promises";
import { Resend } from "resend";
import { EMAIL_LOGO_PNG } from "../src/lib/email-logo.ts";
import { joinApprovedEmail, joinDeclinedEmail, LOGO_CID, newApplicantEmail, partnerWelcomeEmail } from "../src/lib/email-templates.ts";

const to = process.argv[2];
const { RESEND_API_KEY: key, EMAIL_FROM: from, EMAIL_REPLY_TO: replyTo } = process.env;
if (!to || !key || !from) {
  console.error("Usage: node --env-file=.env.local scripts/send-email-previews.mjs <to-address>  (needs RESEND_API_KEY and EMAIL_FROM)");
  process.exit(1);
}
const site = process.env.PREVIEW_SITE_URL ?? "https://careers.longhornracing.org";

const previews = [
  partnerWelcomeEmail({ company: "Northfield Automotive", email: to, invited: true, signInUrl: `${site}/login?door=partner` }),
  partnerWelcomeEmail({ company: "Northfield Automotive", email: to, invited: false, signInUrl: `${site}/login?door=partner` }),
  newApplicantEmail({
    student: "Avery Chen",
    team: "Electric",
    jobTitle: "Vehicle Dynamics Engineering Intern",
    details: [
      ["Major", "Mechanical Engineering"],
      ["Graduates", "Spring 2027"],
      ["Focus", "Suspension design & vehicle modeling"],
    ],
    profileUrl: `${site}/partner/students/preview`,
    applicantsUrl: `${site}/partner/jobs/preview`,
  }),
  joinApprovedEmail({ team: "Solar", profileUrl: `${site}/profile` }),
  joinDeclinedEmail({ team: "Solar" }),
];

const resend = new Resend(key);
for (const email of previews) {
  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo: replyTo || undefined,
    subject: `[Preview] ${email.subject}`,
    html: email.html,
    text: email.text,
    attachments: [{ filename: "lhr-careers.png", content: EMAIL_LOGO_PNG, contentId: LOGO_CID }],
    tags: [{ name: "kind", value: "preview" }],
  });
  console.log(error ? `✗ ${email.subject}: ${error.message}` : `✓ ${email.subject} (${data.id})`);
  // Resend allows a few requests a second.
  await sleep(600);
}
