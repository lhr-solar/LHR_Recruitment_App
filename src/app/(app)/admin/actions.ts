"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reviewMemberRequest(formData: FormData) {
  await requireStaff();
  const requestId = String(formData.get("requestId") ?? "");
  const decision = formData.get("decision");
  if (!requestId || (decision !== "approve" && decision !== "decline")) return;

  const supabase = await createClient();
  // The database checks that the caller is an admin or leads the request's team.
  await supabase.rpc("review_member_request", { p_request_id: requestId, p_approve: decision === "approve" });
  revalidatePath("/admin");
}
