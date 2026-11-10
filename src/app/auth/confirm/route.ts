import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn } from "@/lib/sign-in";

// Email sign-in links land here. They are only offered to Partners, so the door is fixed.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;

  if (!tokenHash) {
    return NextResponse.redirect(new URL("/login?door=partner&error=link_expired", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(new URL("/login?door=partner&error=link_expired", origin));
  }

  const destination = await finishSignIn(supabase, "partner", searchParams.get("next"));
  return NextResponse.redirect(new URL(destination, origin));
}
