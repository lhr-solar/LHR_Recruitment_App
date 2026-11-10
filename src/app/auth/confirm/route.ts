import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn, parseDoor } from "@/lib/sign-in";

// Email sign-in links land here: the email template appends the token to the redirect URL we
// asked for (…/auth/confirm?door=partner). Members only get one where local testing enables it.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = requestOrigin(request);
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;

  const door = parseDoor(searchParams.get("door") ?? "partner");

  if (!tokenHash) {
    return NextResponse.redirect(new URL(`/login?door=${door}&error=link_expired`, origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(new URL(`/login?door=${door}&error=link_expired`, origin));
  }

  const destination = await finishSignIn(supabase, door, null);
  return NextResponse.redirect(new URL(destination, origin));
}
