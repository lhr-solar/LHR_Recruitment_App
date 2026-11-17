"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { emailPartnerWelcome } from "@/lib/notify";
import { MAX_DESCRIPTION, normalizeWebsite } from "@/lib/partner-options";
import { createClient } from "@/lib/supabase/server";

// Every action here is admin-only; row-level security and the functions it calls agree.

export type FormResult = { status: "idle" | "saved" | "error"; message?: string; fieldErrors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NAME = 160;

async function requireAdmin() {
  const viewer = await requireStaff();
  if (!viewer.isAdmin) redirect("/admin");
  return viewer;
}

function tierFrom(formData: FormData): string | null | undefined {
  const tier = String(formData.get("tier") ?? "");
  if (!tier) return null;
  return UUID.test(tier) ? tier : undefined;
}

// ── Companies ────────────────────────────────────────────────────────────

export async function createCompany(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const website = normalizeWebsite(String(formData.get("website") ?? ""));
  const tier = tierFrom(formData);
  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Enter the company's name.";
  else if (name.length > MAX_NAME) fieldErrors.name = "That name is too long.";
  if (website === undefined) fieldErrors.website = "Enter a website, like acme.com, or leave it blank.";
  if (Object.keys(fieldErrors).length || tier === undefined) return { status: "error", fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.from("partner_companies").insert({ name, website, tier_id: tier }).select("id").single();
  if (error) {
    return error.code === "23505"
      ? { status: "error", fieldErrors: { name: "A company with that name already exists." } }
      : { status: "error", message: "We couldn't add that company. Try again in a minute." };
  }
  revalidatePath("/admin/companies");
  redirect(`/admin/companies/${data.id}`);
}

export async function updateCompany(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const website = normalizeWebsite(String(formData.get("website") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const tier = tierFrom(formData);
  const active = formData.get("active") === "on";
  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Enter the company's name.";
  else if (name.length > MAX_NAME) fieldErrors.name = "That name is too long.";
  if (website === undefined) fieldErrors.website = "Enter a website, like acme.com, or leave it blank.";
  if (description.length > MAX_DESCRIPTION) fieldErrors.description = `Keep the description to ${MAX_DESCRIPTION.toLocaleString("en-US")} characters.`;
  if (!UUID.test(id) || tier === undefined) return { status: "error", message: "Something was off with that form. Refresh and try again." };
  if (Object.keys(fieldErrors).length) return { status: "error", message: "Some fields need a fix before we can save.", fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_companies")
    .update({ name, website, description: description || null, tier_id: tier, active })
    .eq("id", id);
  if (error) {
    return error.code === "23505"
      ? { status: "error", message: "Some fields need a fix before we can save.", fieldErrors: { name: "Another company already has that name." } }
      : { status: "error", message: "We couldn't save the company. Try again in a minute." };
  }
  // A hidden company's posts come off the job board with it.
  if (!active) await supabase.from("jobs").update({ status: "closed" }).eq("company_id", id).eq("status", "open");

  revalidatePath("/admin/companies", "layout");
  return { status: "saved" };
}

// Only a company nobody has used yet can be deleted; otherwise hide it.
export async function deleteCompany(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const [members, jobs] = await Promise.all([
    supabase.from("partner_members").select("user_id", { count: "exact", head: true }).eq("company_id", id),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", id),
  ]);
  if (members.count || jobs.count) return;
  await supabase.from("partner_invites").delete().eq("company_id", id);
  await supabase.from("partner_companies").delete().eq("id", id);
  revalidatePath("/admin/companies");
  redirect("/admin/companies");
}

// ── Recruiters ───────────────────────────────────────────────────────────

export async function invitePartner(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const companyId = String(formData.get("companyId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!UUID.test(companyId)) return { status: "error", message: "Something was off with that form. Refresh and try again." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { status: "error", message: "Enter the recruiter's email address." };

  const supabase = await createClient();
  const { data: outcome, error } = await supabase.rpc("invite_partner", { p_email: email, p_company_id: companyId });
  if (error) {
    const known = ["That email belongs", "That recruiter", "That isn't"].some((start) => error.message.startsWith(start));
    return { status: "error", message: known ? `${error.message}.` : "We couldn't send that invite. Try again in a minute." };
  }
  if (outcome === "already") return { status: "saved", message: `${email} is already a recruiter here.` };

  const { data: company } = await supabase.from("partner_companies").select("name").eq("id", companyId).single();
  if (company) await emailPartnerWelcome(email, company.name, "invited");
  revalidatePath(`/admin/companies/${companyId}`);
  revalidatePath("/admin", "layout");
  return {
    status: "saved",
    message: outcome === "added" ? `${email} had already signed in, so they have access now. We emailed them.` : `Invited ${email}. We emailed them a sign-in link.`,
  };
}

export async function revokeInvite(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("inviteId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("partner_invites").delete().eq("id", id).is("accepted_at", null);
  revalidatePath(`/admin/companies/${companyId}`);
}

// ── Tiers ────────────────────────────────────────────────────────────────

export async function addTier(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 40) return { status: "error", message: "Give the tier a name of up to 40 characters." };

  const supabase = await createClient();
  const { data: last } = await supabase.from("partner_tiers").select("rank").order("rank", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("partner_tiers").insert({ name, rank: (last?.rank ?? 0) + 1 });
  if (error) {
    return { status: "error", message: error.code === "23505" ? "There's already a tier with that name." : "We couldn't add that tier. Try again." };
  }
  revalidatePath("/admin/companies");
  return { status: "saved" };
}

export async function renameTier(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const id = String(formData.get("tierId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!UUID.test(id)) return { status: "error", message: "Something was off with that form. Refresh and try again." };
  if (!name || name.length > 40) return { status: "error", message: "Give the tier a name of up to 40 characters." };

  const supabase = await createClient();
  const { error } = await supabase.from("partner_tiers").update({ name }).eq("id", id);
  if (error) {
    return { status: "error", message: error.code === "23505" ? "There's already a tier with that name." : "We couldn't rename that tier. Try again." };
  }
  revalidatePath("/admin/companies", "layout");
  return { status: "saved" };
}

export async function moveTier(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("tierId") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.rpc("move_partner_tier", { p_tier: id, p_up: formData.get("direction") === "up" });
  revalidatePath("/admin/companies");
}

// Companies in a deleted tier are left without one.
export async function deleteTier(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("tierId") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("partner_tiers").delete().eq("id", id);
  revalidatePath("/admin/companies", "layout");
}
