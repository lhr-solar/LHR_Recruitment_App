"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActivePartner } from "@/lib/auth";
import { companyFor } from "@/lib/partner";
import { LOGO_TYPES, MAX_DESCRIPTION, MAX_LOGO_BYTES, normalizeWebsite } from "@/lib/partner-options";
import { createClient } from "@/lib/supabase/server";

// ── Website and description ──────────────────────────────────────────────

export type CompanyState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: string; fieldErrors: Record<string, string> };

const companySchema = z.object({
  website: z
    .string()
    .transform((value, ctx) => {
      const website = normalizeWebsite(value);
      if (website === undefined) {
        ctx.addIssue({ code: "custom", message: "Enter your company's website, like acme.com." });
        return z.NEVER;
      }
      return website;
    }),
  description: z
    .string()
    .trim()
    .max(MAX_DESCRIPTION, `Keep the description to ${MAX_DESCRIPTION.toLocaleString("en-US")} characters.`)
    .transform((value) => value || null),
});

export async function saveCompany(_prev: CompanyState, formData: FormData): Promise<CompanyState> {
  const viewer = await requireActivePartner();
  const company = await companyFor(viewer.id);
  if (!company) return { status: "error", message: "We couldn't find your company. Sign out and back in.", fieldErrors: {} };

  const parsed = companySchema.safeParse({
    website: String(formData.get("website") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { status: "error", message: "Some fields need a fix before we can save.", fieldErrors };
  }

  // Row-level security limits this to the recruiter's own company; a trigger keeps the name, tier
  // and status admin-only.
  const supabase = await createClient();
  const { error } = await supabase.from("partner_companies").update(parsed.data).eq("id", company.id);
  if (error) return { status: "error", message: "We couldn't save your company page. Try again in a minute.", fieldErrors: {} };

  revalidatePath("/partner/company");
  return { status: "saved" };
}

// ── Logo: uploaded from the browser to partner-logos/{company_id}/, then recorded here ──

export type LogoResult = { error: string | null };

export async function saveLogo(path: string): Promise<LogoResult> {
  const viewer = await requireActivePartner();
  const company = await companyFor(viewer.id);
  const extensions = Object.values(LOGO_TYPES).join("|");
  if (!company || !new RegExp(`^${company.id}/logo-\\d+\\.(${extensions})$`).test(path)) {
    return { error: "That upload didn't go through. Try again." };
  }

  const supabase = await createClient();
  const slash = path.lastIndexOf("/");
  const { data: listed } = await supabase.storage
    .from("partner-logos")
    .list(company.id, { search: path.slice(slash + 1), limit: 10 });
  const object = (listed ?? []).find((o) => o.name === path.slice(slash + 1));
  const size = Number(object?.metadata?.size ?? 0);
  if (!object || size < 1 || size > MAX_LOGO_BYTES || !LOGO_TYPES[String(object.metadata?.mimetype ?? "")]) {
    await supabase.storage.from("partner-logos").remove([path]);
    return { error: "That logo didn't upload properly. Try a PNG, JPG, WebP or SVG under 2 MB." };
  }

  const { error } = await supabase.from("partner_companies").update({ logo_path: path }).eq("id", company.id);
  if (error) {
    await supabase.storage.from("partner-logos").remove([path]);
    return { error: "We couldn't save your logo. Try again in a minute." };
  }
  await clearLogos(company.id, path);
  revalidatePath("/partner/company");
  return { error: null };
}

export async function removeLogo(): Promise<LogoResult> {
  const viewer = await requireActivePartner();
  const company = await companyFor(viewer.id);
  if (!company) return { error: "We couldn't find your company. Sign out and back in." };

  const supabase = await createClient();
  const { error } = await supabase.from("partner_companies").update({ logo_path: null }).eq("id", company.id);
  if (error) return { error: "We couldn't remove your logo. Try again." };
  await clearLogos(company.id, null);
  revalidatePath("/partner/company");
  return { error: null };
}

// Old logos are public files, so they don't linger once replaced.
async function clearLogos(companyId: string, keep: string | null) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("partner-logos").list(companyId, { limit: 100 });
  const stale = (data ?? []).map((o) => `${companyId}/${o.name}`).filter((p) => p !== keep);
  if (stale.length) await supabase.storage.from("partner-logos").remove(stale);
}
