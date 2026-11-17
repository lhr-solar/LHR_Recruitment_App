import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CompanyLogo } from "@/components/job-view";
import { SubmitButton } from "@/components/submit-button";
import { requireStaff } from "@/lib/auth";
import { logoUrl } from "@/lib/partner-options";
import { createClient } from "@/lib/supabase/server";
import { deleteTier, moveTier } from "./actions";
import { AddTierForm, NewCompanyForm, TierName } from "./company-forms";

export const metadata: Metadata = { title: "Companies" };

type CompanyRow = {
  id: string;
  name: string;
  website: string | null;
  logo_path: string | null;
  active: boolean;
  partner_tiers: { name: string; rank: number } | null;
  partner_members: { count: number }[];
  open_jobs: { count: number }[];
  partner_invites: { count: number }[];
};

export default async function CompaniesPage() {
  const viewer = await requireStaff();
  if (!viewer.isAdmin) redirect("/admin");

  const supabase = await createClient();
  const [{ data, error }, tiers] = await Promise.all([
    supabase
      .from("partner_companies")
      .select("id, name, website, logo_path, active, partner_tiers(name, rank), partner_members(count), open_jobs:jobs(count), partner_invites(count)")
      .eq("open_jobs.status", "open")
      .is("partner_invites.accepted_at", null)
      .order("name"),
    supabase.from("partner_tiers").select("id, name, rank").order("rank"),
  ]);
  const tierList = tiers.data ?? [];
  // Live companies first, then by tier (unranked last), then by name.
  const companies = ((data ?? []) as unknown as CompanyRow[]).sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      (a.partner_tiers?.rank ?? Infinity) - (b.partner_tiers?.rank ?? Infinity) ||
      a.name.localeCompare(b.name),
  );

  return (
    <div className="admin-stack">
      <header className="page-head">
        <h1>Companies</h1>
        <p>Every Partner company. Open one to edit it, invite recruiters or pause someone&apos;s access.</p>
      </header>

      <section className="panel profile-section" aria-labelledby="new-company-title">
        <h2 id="new-company-title">Add a company</h2>
        <p className="field-hint">Approving a Partner request also adds its company, so you only need this to invite recruiters before they ask.</p>
        <NewCompanyForm tiers={tierList} />
      </section>

      <section className="panel table-panel" aria-labelledby="companies-title">
        <div className="table-head">
          <h2 id="companies-title">
            Partners <span className="table-head-count num">{error ? "" : companies.length}</span>
          </h2>
        </div>
        {error ? (
          <p className="table-message">We couldn&apos;t load companies. Refresh the page to try again.</p>
        ) : companies.length === 0 ? (
          <p className="table-message">No Partner companies yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Tier</th>
                <th scope="col" className="num">
                  Recruiters
                </th>
                <th scope="col" className="num">
                  Open posts
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const invites = company.partner_invites[0]?.count ?? 0;
                return (
                  <tr key={company.id}>
                    <td>
                      <span className="company-cell">
                        <CompanyLogo company={{ id: company.id, name: company.name, website: null, description: null, logoUrl: logoUrl(company.logo_path) }} size={32} />
                        <span>
                          <Link href={`/admin/companies/${company.id}`} className="link-plain cell-primary">
                            {company.name}
                          </Link>
                          {company.website && <span className="cell-secondary">{new URL(company.website).hostname.replace(/^www\./, "")}</span>}
                        </span>
                      </span>
                    </td>
                    <td data-label="Tier">{company.partner_tiers?.name ?? <span className="text-[var(--color-muted)]">None</span>}</td>
                    <td className="num" data-label="Recruiters">
                      {company.partner_members[0]?.count ?? 0}
                      {invites > 0 && <span className="cell-secondary">{invites} invited</span>}
                    </td>
                    <td className="num" data-label="Open posts">{company.open_jobs[0]?.count ?? 0}</td>
                    <td>
                      {company.active ? (
                        "Active"
                      ) : (
                        <span className="status-chip" data-status="closed">
                          Hidden
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel profile-section tiers" aria-labelledby="tiers-title">
        <h2 id="tiers-title">Tiers</h2>
        <p className="field-hint">Tiers only order the Partner logos on the public landing page, top tier first. They don&apos;t change what recruiters can do.</p>
        {tierList.length > 0 && (
          <ol className="tier-list">
            {tierList.map((tier, i) => (
              <li key={tier.id}>
                <span className="tier-rank num">{i + 1}</span>
                <TierName tier={tier} />
                <form action={moveTier} className="row-actions">
                  <input type="hidden" name="tierId" value={tier.id} />
                  <button type="submit" name="direction" value="up" className="btn btn-quiet" disabled={i === 0}>
                    Move up
                  </button>
                  <button type="submit" name="direction" value="down" className="btn btn-quiet" disabled={i === tierList.length - 1}>
                    Move down
                  </button>
                </form>
                <form action={deleteTier} className="row-actions">
                  <input type="hidden" name="tierId" value={tier.id} />
                  <SubmitButton variant="danger" pendingLabel="Deleting">
                    Delete
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ol>
        )}
        <AddTierForm />
      </section>
    </div>
  );
}
