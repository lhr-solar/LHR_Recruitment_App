"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isTeamSlug } from "@/lib/teams";

export type MemberResult = { status: "idle" | "saved" | "error"; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The database's messages for refused changes are written to be shown as they are.
const SHOWN = ["You can't", "Team leads need a team", "Only active accounts", "Only paused accounts", "That recruiter"];
function messageFor(error: { message: string }, fallback: string) {
  return SHOWN.some((start) => error.message.startsWith(start)) ? `${error.message}.` : fallback;
}

export async function setMemberRole(_prev: MemberResult, formData: FormData): Promise<MemberResult> {
  await requireStaff();
  const userId = String(formData.get("userId") ?? "");
  const team = String(formData.get("team") ?? "");
  if (!UUID.test(userId) || (team && !isTeamSlug(team))) return { status: "error", message: "Something was off with that form. Refresh and try again." };

  const supabase = await createClient();
  // The database checks that the caller is an admin.
  const { error } = await supabase.rpc("set_member_role", {
    p_user: userId,
    p_is_admin: formData.get("isAdmin") === "on",
    p_is_team_lead: formData.get("isTeamLead") === "on",
    p_team: team || null,
  });
  if (error) return { status: "error", message: messageFor(error, "We couldn't save that. Try again in a minute.") };

  revalidatePath("/admin/members", "layout");
  return { status: "saved" };
}

// Pausing and restoring works the same for members and Partner recruiters.
export async function setAccountStatus(_prev: MemberResult, formData: FormData): Promise<MemberResult> {
  await requireStaff();
  const userId = String(formData.get("userId") ?? "");
  const status = formData.get("status");
  if (!UUID.test(userId) || (status !== "active" && status !== "suspended")) {
    return { status: "error", message: "Something was off with that form. Refresh and try again." };
  }

  const supabase = await createClient();
  // The database checks who may pause whom.
  const { error } = await supabase.rpc("set_account_status", { p_user: userId, p_status: status });
  if (error) return { status: "error", message: messageFor(error, "We couldn't change that account. Try again in a minute.") };

  revalidatePath("/admin", "layout");
  return { status: "saved" };
}
