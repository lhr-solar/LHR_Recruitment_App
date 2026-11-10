import type { Metadata } from "next";
import { requireActivePartner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Partner home" };

export default async function PartnerHomePage() {
  const viewer = await requireActivePartner();
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("partner_members")
    .select("partner_companies(name)")
    .eq("user_id", viewer.id)
    .single();
  const company = (membership?.partner_companies as unknown as { name: string } | null)?.name;

  return (
    <div className="narrow">
      <header className="page-head">
        <h1>{company ?? "Partner home"}</h1>
        <p>You&apos;re signed in as a recruiter for {company ?? "your company"}.</p>
      </header>
      <section className="panel empty-block" aria-labelledby="partner-next">
        <h2 id="partner-next">The resume book is next</h2>
        <p>Browsing students by team, subsystem, skills and citizenship ships in the next build, followed by job posts.</p>
      </section>
    </div>
  );
}
