"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { googleSignInEnabled } from "@/lib/auth-providers";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

async function origin() {
  return (await headers()).get("origin") ?? publicEnv.siteUrl;
}

export async function signInWithGoogle(formData: FormData) {
  const door = formData.get("door") === "partner" ? "partner" : "member";
  const next = formData.get("next");
  if (!(await googleSignInEnabled())) redirect(`/login?door=${door}&error=google_unavailable`);

  const callback = new URL("/auth/callback", await origin());
  callback.searchParams.set("door", door);
  if (typeof next === "string" && next.startsWith("/")) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      // Members sign in with UT accounts, so Google offers those first.
      queryParams: door === "member" ? { hd: "utexas.edu", prompt: "select_account" } : { prompt: "select_account" },
    },
  });

  if (error || !data.url) redirect(`/login?door=${door}&error=google_unavailable`);
  redirect(data.url);
}

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email: string };

const emailSchema = z.email();

export async function sendMagicLink(_prev: MagicLinkState, formData: FormData): Promise<MagicLinkState> {
  const door = formData.get("door") === "member" ? "member" : "partner";
  const raw = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Enter a full email address, like name@company.com.", email: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    // The door rides along in the link so /auth/confirm knows which sign-in this was.
    options: { emailRedirectTo: new URL(`/auth/confirm?door=${door}`, await origin()).toString() },
  });

  if (error) {
    const message =
      error.status === 429
        ? "Too many sign-in emails were requested. Wait a minute, then try again."
        : "We couldn't send the email. Check the address and try again.";
    return { status: "error", message, email: parsed.data };
  }

  return { status: "sent", email: parsed.data };
}
