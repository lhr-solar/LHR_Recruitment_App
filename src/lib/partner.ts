import "server-only";
import { cache } from "react";
import { logoUrl } from "@/lib/partner-options";
import { createClient } from "@/lib/supabase/server";

export type Company = {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  logoPath: string | null;
  logoUrl: string | null;
  tier: string | null;
};

// The company a Partner recruiter belongs to, read as them (row-level security applies).
export const companyFor = cache(async (userId: string): Promise<Company | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("partner_members")
    .select("partner_companies(id, name, website, description, logo_path, partner_tiers(name))")
    .eq("user_id", userId)
    .maybeSingle();
  const row = data?.partner_companies as unknown as {
    id: string;
    name: string;
    website: string | null;
    description: string | null;
    logo_path: string | null;
    partner_tiers: { name: string } | null;
  } | null;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    description: row.description,
    logoPath: row.logo_path,
    logoUrl: logoUrl(row.logo_path),
    tier: row.partner_tiers?.name ?? null,
  };
});

export type Colleague = { id: string; name: string | null; email: string; title: string | null };

// Everyone at the company with a recruiter account.
export async function colleaguesAt(companyId: string): Promise<Colleague[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("partner_members")
    .select("user_id, title, profiles(full_name, email)")
    .eq("company_id", companyId)
    .order("created_at");
  return ((data ?? []) as unknown as { user_id: string; title: string | null; profiles: { full_name: string | null; email: string } | null }[]).map(
    (row) => ({ id: row.user_id, name: row.profiles?.full_name ?? null, email: row.profiles?.email ?? "", title: row.title }),
  );
}
