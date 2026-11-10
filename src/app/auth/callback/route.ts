import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn, parseDoor } from "@/lib/sign-in";

// Google OAuth returns here with a one-time code.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = requestOrigin(request);
  const code = searchParams.get("code");
  const door = parseDoor(searchParams.get("door"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=link_expired", origin));
  }

  const destination = await finishSignIn(supabase, door, searchParams.get("next"));
  return NextResponse.redirect(new URL(destination, origin));
}
