import Image from "next/image";
import { formatDeadline, jobTypeLabel, whereLine } from "@/lib/job-options";
import type { Job, JobCompany } from "@/lib/jobs";
import { TEAMS } from "@/lib/teams";

// A job post as LHR members see it. Recruiters see the same thing as their post's preview.
// `aside` goes at the top of the side column (the student's "I applied" switch).
export function JobView({ job, actions, aside }: { job: Job; actions?: React.ReactNode; aside?: React.ReactNode }) {
  const where = whereLine(job.location, job.remote);
  const teams = TEAMS.filter((team) => job.teams.includes(team.slug));

  return (
    <article className="job" aria-labelledby="job-title">
      <header className="panel job-head">
        <CompanyLogo company={job.company} size={56} />
        <div className="job-identity">
          <p className="job-company">{job.company.name}</p>
          <h1 id="job-title">{job.title}</h1>
          <ul className="job-facts">
            <li>{jobTypeLabel(job.type)}</li>
            {where && <li>{where}</li>}
            {job.deadline && <li>Apply by {formatDeadline(job.deadline)}</li>}
          </ul>
        </div>
        {actions && <div className="job-actions">{actions}</div>}
      </header>

      <div className="pv-grid">
        <section className="panel pv-section" aria-labelledby="job-about">
          <h2 id="job-about">About the role</h2>
          <p className="job-description">{job.description}</p>
        </section>

        <aside className="pv-side">
          {aside}
          <section className="panel pv-section" aria-labelledby="job-for">
            <h2 id="job-for">For</h2>
            {teams.length === 0 ? (
              <p>Every Longhorn Racing team</p>
            ) : (
              <ul className="job-teams">
                {teams.map((team) => (
                  <li key={team.slug}>
                    <Image src={team.logo} alt={`${team.name} team`} width={66} height={14} unoptimized />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel pv-section" aria-labelledby="job-company">
            <h2 id="job-company">{job.company.name}</h2>
            {job.company.website && (
              <a className="link" href={job.company.website} target="_blank" rel="noopener noreferrer">
                {new URL(job.company.website).hostname.replace(/^www\./, "")}
              </a>
            )}
            {job.company.description && <p className="company-card-about">{job.company.description}</p>}
          </section>
        </aside>
      </div>
    </article>
  );
}

// The company's uploaded logo, or its initial.
export function CompanyLogo({ company, size }: { company: JobCompany; size: number }) {
  if (company.logoUrl) {
    // A public Storage URL; plain img so SVG logos work without the image proxy.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="company-logo" src={company.logoUrl} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <span className="company-logo company-logo-initial" style={{ width: size, height: size }} aria-hidden="true">
      {company.name[0]?.toUpperCase()}
    </span>
  );
}
