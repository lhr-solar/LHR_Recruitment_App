import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActivePartner } from "@/lib/auth";
import { colleaguesAt, companyFor } from "@/lib/partner";
import { CompanyForm } from "./company-form";
import { LogoCard } from "./logo-card";

export const metadata: Metadata = { title: "Company page" };

export default async function CompanyPage() {
  const viewer = await requireActivePartner();
  const company = await companyFor(viewer.id);
  // An active Partner always has a company; without one, the account has been changed under them.
  if (!company) redirect("/account");
  const colleagues = await colleaguesAt(company.id);
  const host = company.website ? new URL(company.website).hostname.replace(/^www\./, "") : null;

  return (
    <div>
      <header className="page-head">
        <h1>Company page</h1>
        <p>How {company.name} appears to Longhorn Racing members, next to the jobs you post.</p>
      </header>

      <div className="profile-grid">
        <div className="profile-main">
          <CompanyForm name={company.name} website={company.website} description={company.description} />
          <LogoCard companyId={company.id} name={company.name} url={company.logoUrl} />

          <section className="panel table-panel" aria-labelledby="recruiters-title">
            <div className="table-head">
              <h2 id="recruiters-title">Recruiters</h2>
              <span className="num text-[var(--color-muted)]">{colleagues.length}</span>
            </div>
            <ul className="member-list">
              {colleagues.map((person) => (
                <li key={person.id}>
                  <span className="cell-primary">
                    {person.name ?? person.email}
                    {person.id === viewer.id && <span className="field-optional"> (you)</span>}
                  </span>
                  <span className="cell-secondary">{[person.title, person.name ? person.email : null].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
            <p className="table-message">To add a colleague, ask your Longhorn Racing contact to invite them.</p>
          </section>
        </div>

        <aside className="profile-aside" aria-labelledby="company-preview">
          <section className="panel company-card">
            <h2 id="company-preview" className="company-card-label">
              What members see
            </h2>
            <div className="company-card-logo">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logoUrl} alt="" />
              ) : (
                <span className="company-card-initial" aria-hidden="true">
                  {company.name[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <p className="company-card-name">{company.name}</p>
            {host && (
              <a className="link" href={company.website ?? undefined} target="_blank" rel="noopener noreferrer">
                {host}
              </a>
            )}
            {company.description ? (
              <p className="company-card-about">{company.description}</p>
            ) : (
              <p className="field-hint">Add a description so students know what you build.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
