import { Resend, type WebhookEventPayload } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

// Resend calls this as each email is delivered, opened, clicked, bounced or marked as spam, and the
// email log picks it up. Register https://<site>/api/resend/webhook under Resend → Webhooks and put
// its signing secret in RESEND_WEBHOOK_SECRET.
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  // Resend signs with Svix; the signature covers the raw body, so read it as text.
  const payload = await request.text();
  const header = (name: string) => request.headers.get(`svix-${name}`) ?? request.headers.get(`webhook-${name}`) ?? "";
  const id = header("id");
  let event: WebhookEventPayload;
  try {
    event = new Resend(process.env.RESEND_API_KEY || "re_unused").webhooks.verify({
      payload,
      headers: { id, timestamp: header("timestamp"), signature: header("signature") },
      webhookSecret: secret,
    });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }
  if (!event.type.startsWith("email.") || !("email_id" in event.data)) return new Response(null, { status: 204 });

  const data = event.data as { email_id: string; bounce?: { message: string }; failed?: { reason: string } };
  const { error } = await createAdminClient().rpc("record_email_event", {
    p_event_id: id,
    p_resend_id: data.email_id,
    p_type: event.type,
    p_at: event.created_at,
    p_detail: data.bounce?.message ?? data.failed?.reason ?? null,
  });
  // A 500 makes Resend retry later; the event id keeps the retry from counting twice.
  if (error) {
    console.error(`[email webhook] ${event.type}: ${error.message}`);
    return new Response("Couldn't record the event", { status: 500 });
  }
  return new Response(null, { status: 204 });
}
