"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const viewer = await requireStaff();
  if (!viewer.isAdmin) redirect("/admin");
}

// Admins close posts that shouldn't be on the board, and reopen them.
export async function moderateJob(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status");
  if (!UUID.test(id) || (status !== "open" && status !== "closed")) return;

  const supabase = await createClient();
  await supabase.from("jobs").update({ status }).eq("id", id);
  revalidatePath("/admin/jobs", "layout");
  revalidatePath("/jobs");
  revalidatePath("/partner/jobs", "layout");
}

// Removes a post entirely, with its counts and applicant list. Open posts are closed first.
export async function deleteJob(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;

  const supabase = await createClient();
  await supabase.from("jobs").delete().eq("id", id).neq("status", "open");
  revalidatePath("/admin/jobs");
  revalidatePath("/partner/jobs", "layout");
  redirect("/admin/jobs");
}
