import "server-only";
import { Resend } from "resend";
import { EMAIL_LOGO_PNG } from "@/lib/email-logo";
import { LOGO_CID, type RenderedEmail } from "@/lib/email-templates";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// Against local Supabase (Docker) nothing is really sent, even though Next.js also loads the hosted
// settings in .env.local: test addresses there aren't real people.
const LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(publicEnv.supabaseUrl);

// What the email is for, shown in the admin email log.
export type EmailKind = "join_approved" | "join_declined" | "partner_invited" | "partner_approved" | "new_applicant";

// Transactional email through Resend, one recipient per send so each gets its own row in the email
// log (Resend's webhook then fills in delivery and opens). Best effort: a failed send never fails
// the action that triggered it.
export async function sendEmail(to: string, kind: EmailKind, { subject, html, text }: RenderedEmail) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (LOCAL || !key || !from) {
    console.warn(`[email] not sent (${LOCAL ? "local Supabase" : "no RESEND_API_KEY or EMAIL_FROM"}) to ${to}: ${subject}`);
    return;
  }

  let resendId: string | null = null;
  let failure: string | null = null;
  try {
    const { data, error } = await new Resend(key).emails.send({
      from,
      to,
      subject,
      html,
      text,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      attachments: [{ filename: "lhr-careers.png", content: EMAIL_LOGO_PNG, contentId: LOGO_CID }],
      tags: [{ name: "kind", value: kind }],
    });
    if (error) failure = error.message;
    else resendId = data?.id ?? null;
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }
  if (failure) console.error(`[email] ${subject}: ${failure}`);
  else console.info(`[email] sent to ${to}: ${subject}`);

  const { error } = await createAdminClient()
    .from("email_log")
    .insert({ resend_id: resendId, kind, recipient: to, subject, ...(failure && { status: "failed", detail: failure }) });
  if (error) console.error(`[email] couldn't log ${subject}: ${error.message}`);
}
