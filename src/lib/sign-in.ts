import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Door = "member" | "partner";

export function parseDoor(value: string | null): Door {
  return value === "partner" ? "partner" : "member";
}

type ClaimOutcome = {
  outcome: "existing" | "admin" | "roster" | "needs_request" | "not_utexas" | "invited" | "is_member";
  account_type: "member" | "partner" | null;
  status: "pending" | "active" | "suspended" | "rejected";
};

// After Supabase has a session: decide what the account is, then where to send it.
export async function finishSignIn(supabase: SupabaseClient, door: Door, next: string | null): Promise<string> {
  const { data, error } = await supabase.rpc("claim_account", { p_intent: door });
  if (error || !data) return "/login?error=claim_failed";

  const claim = data as ClaimOutcome;

  if (claim.outcome === "not_utexas" || claim.outcome === "is_member") {
    await supabase.auth.signOut();
    return `/login?error=${claim.outcome}`;
  }

  if (claim.status === "suspended") return "/account";
  if (claim.account_type === "member" && claim.status !== "active") return "/join";
  if (claim.account_type === "partner" && claim.status !== "active") return "/pending";

  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return claim.account_type === "partner" ? "/partner" : "/profile";
}
