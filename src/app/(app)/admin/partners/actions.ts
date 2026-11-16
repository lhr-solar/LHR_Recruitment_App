"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ReviewResult = { error: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function reviewPartnerRequest(_prev: ReviewResult, formData: FormData): Promise<ReviewResult> {
  await requireStaff();
  const requestId = String(formData.get("requestId") ?? "");
  const decision = formData.get("decision");
  const company = String(formData.get("company") ?? "new");
  if (!UUID.test(requestId) || (decision !== "approve" && decision !== "decline") || (company !== "new" && !UUID.test(company))) {
    return { error: "Something was off with that form. Refresh the page and try again." };
  }

  const supabase = await createClient();
  // The database checks that the caller is an admin and that the request is still pending.
  const { error } = await supabase.rpc("review_partner_request", {
    p_request_id: requestId,
    p_approve: decision === "approve",
    p_company_id: decision === "approve" && company !== "new" ? company : null,
  });
  if (error) {
    return {
      error: error.message.includes("already been reviewed")
        ? "Someone already reviewed this request. Refresh to see the latest."
        : "We couldn't save that decision. Try again in a minute.",
    };
  }

  revalidatePath("/admin/partners");
  return { error: null };
}
