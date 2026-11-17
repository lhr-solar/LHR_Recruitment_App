"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isTeamSlug } from "@/lib/teams";

export type ListResult = { status: "idle" | "saved" | "error"; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NAME = 60;

async function requireAdmin() {
  const viewer = await requireStaff();
  if (!viewer.isAdmin) redirect("/admin");
}

// Students' profiles and the resume book filters read these lists, so both refresh.
function refresh() {
  revalidatePath("/admin/lists");
  revalidatePath("/profile");
  revalidatePath("/partner/students");
}

export async function addSkill(_prev: ListResult, formData: FormData): Promise<ListResult> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!name || name.length > MAX_NAME) return { status: "error", message: `Name the skill in up to ${MAX_NAME} characters.` };
  if (!category || category.length > MAX_NAME) return { status: "error", message: "Pick a group for the skill, or type a new one." };

  const supabase = await createClient();
  const { error } = await supabase.from("skills").insert({ name, category });
  if (error) return { status: "error", message: error.code === "23505" ? `${name} is already on the list.` : "We couldn't add that skill. Try again." };
  refresh();
  return { status: "saved", message: `Added ${name}.` };
}

export async function addSubsystem(_prev: ListResult, formData: FormData): Promise<ListResult> {
  await requireAdmin();
  const team = String(formData.get("team") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!isTeamSlug(team)) return { status: "error", message: "Something was off with that form. Refresh and try again." };
  if (!name || name.length > MAX_NAME) return { status: "error", message: `Name the subsystem in up to ${MAX_NAME} characters.` };

  const supabase = await createClient();
  const { data: last } = await supabase.from("subsystems").select("sort").eq("team", team).order("sort", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("subsystems").insert({ team, name, sort: (last?.sort ?? 0) + 1 });
  if (error) return { status: "error", message: error.code === "23505" ? `${name} is already on this team's list.` : "We couldn't add that subsystem. Try again." };
  refresh();
  return { status: "saved" };
}

// Hidden entries stay on the profiles that already use them; students just can't pick them anymore.
export async function setListItemActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const table = formData.get("list") === "skills" ? "skills" : formData.get("list") === "subsystems" ? "subsystems" : null;
  const id = String(formData.get("id") ?? "");
  if (!table || !UUID.test(id)) return;

  const supabase = await createClient();
  await supabase.from(table).update({ active: formData.get("active") === "true" }).eq("id", id);
  refresh();
}
