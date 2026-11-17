"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { emailJoinDecision } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function reviewMemberRequest(formData: FormData) {
  await requireStaff();
  const requestId = String(formData.get("requestId") ?? "");
  const decision = formData.get("decision");
  if (!requestId || (decision !== "approve" && decision !== "decline")) return;

  const supabase = await createClient();
  const { data: request } = await supabase.from("member_requests").select("user_id, team, status").eq("id", requestId).maybeSingle();
  // The database checks that the caller is an admin or leads the request's team.
  const { error } = await supabase.rpc("review_member_request", { p_request_id: requestId, p_approve: decision === "approve" });

  if (!error && request?.status === "pending") {
    // Someone waiting to join has no team yet, so team leads can't read their profile; the
    // decision above already checked the caller.
    const { data: profile } = await createAdminClient().from("profiles").select("email").eq("id", request.user_id).maybeSingle();
    if (profile) await emailJoinDecision(profile.email, decision === "approve", request.team);
  }
  revalidatePath("/admin", "layout");
}
