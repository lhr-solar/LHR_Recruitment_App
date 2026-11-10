import type { Metadata } from "next";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage() {
  await requireActiveMember();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return (
    <div>
      <header className="page-head">
        <h1>Jobs</h1>
        <p>Internships, co-ops and full-time roles posted by Longhorn Racing Partners.</p>
      </header>
      {error ? (
        <div className="notice notice-error" role="alert">
          <p>We couldn&apos;t load jobs. Refresh the page to try again.</p>
        </div>
      ) : (
        <section className="panel empty-block" aria-labelledby="jobs-empty">
          <h2 id="jobs-empty">{count ? `${count} open roles` : "No roles posted yet"}</h2>
          <p>When a Partner posts a role, it shows up here with a link to apply on their site.</p>
        </section>
      )}
    </div>
  );
}
