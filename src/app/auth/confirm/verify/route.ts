import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn, parseDoor } from "@/lib/sign-in";

const EMAIL_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

// The "Finish signing in" button on /auth/confirm posts here. Spending the one-time token only
// on a POST means mail scanners that open every link (Outlook Safe Links and the like) can't use it up.
export async function POST(request: NextRequest) {
  const origin = requestOrigin(request);
  const form = await request.formData();
  const door = parseDoor(String(form.get("door") ?? "partner"));
  const failed = () => NextResponse.redirect(new URL(`/login?door=${door}&error=link_expired`, origin), 303);

  // Only our own page may post a token here.
  const sentFrom = request.headers.get("origin");
  if (sentFrom && sentFrom !== origin) return failed();

  const tokenHash = String(form.get("token_hash") ?? "");
  const type = String(form.get("type") ?? "email") as EmailOtpType;
  if (!tokenHash || !EMAIL_TYPES.includes(type)) return failed();

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return failed();

  const destination = await finishSignIn(supabase, door, null);
  return NextResponse.redirect(new URL(destination, origin), 303);
}
