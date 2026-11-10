import Image from "next/image";
import type { PartnerView } from "@/lib/student";
import { CAREER_INTEREST, CITIZENSHIP, GRAD_SEMESTERS, formatBytes, formatDuration } from "@/lib/student-options";
import { TEAMS } from "@/lib/teams";

const LOOKING_FOR: Record<string, string> = {
  internship: "Internships",
  full_time: "Full-time roles",
  both: "Internships and full-time roles",
};

// A student's profile as a recruiter at a Partner company sees it. In a student's own preview,
// sections Partners won't see yet say so, instead of silently disappearing.
export function PartnerProfileView({ profile, preview = false }: { profile: PartnerView; preview?: boolean }) {
  const team = TEAMS.find((t) => t.slug === profile.team);
  const semester = GRAD_SEMESTERS.find((s) => s.value === profile.gradSemester)?.label;
  const citizenship =
    profile.citizenship === "prefer_not_to_say"
      ? "Not shared"
      : CITIZENSHIP.find((c) => c.value === profile.citizenship)?.label;
  const lookingFor = profile.careerInterest
    ? (LOOKING_FOR[profile.careerInterest] ?? CAREER_INTEREST.find((c) => c.value === profile.careerInterest)?.label)
    : null;
  const roleLine = [profile.position, profile.subsystem && `${profile.subsystem} subsystem`].filter(Boolean).join(", ");

  const facts = [
    { term: "Major", value: profile.major },
    { term: "Graduates", value: semester && profile.gradYear ? `${semester} ${profile.gradYear}` : null },
    { term: "Looking for", value: lookingFor },
    { term: "Work authorization", value: citizenship },
    { term: "GPA", value: profile.gpa !== null ? profile.gpa.toFixed(2) : null },
  ].filter((fact): fact is { term: string; value: string } => Boolean(fact.value));

  const links = [
    { label: "LinkedIn", href: profile.links.linkedin },
    { label: "GitHub", href: profile.links.github },
    { label: "Personal site", href: profile.links.site },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));

  return (
    <article className="pv" aria-labelledby="pv-name">
      <header className="panel pv-head" data-team={profile.team}>
        <Avatar name={profile.fullName} url={profile.avatarUrl} />
        <div className="pv-identity">
          {team && <Image src={team.logo} alt={`${team.name} team`} width={76} height={16} unoptimized />}
          <h1 id="pv-name">{profile.fullName}</h1>
          {roleLine && <p className="pv-role">{roleLine}</p>}
        </div>
        <div className="pv-actions">
          {profile.resume && (
            <a className="btn btn-primary" href={profile.resume.downloadUrl}>
              Download resume
            </a>
          )}
          <a className="btn btn-secondary" href={`mailto:${profile.email}`}>
            Email {firstName(profile.fullName)}
          </a>
        </div>
      </header>

      <div className="pv-grid">
        <div className="pv-main">
          {!profile.resume && preview && <Missing title="Resume" text="Partners need your resume before your profile shows up for them." />}
          {profile.resume && (
            <section className="panel pv-section" aria-labelledby="pv-resume">
              <div className="section-head">
                <h2 id="pv-resume">Resume</h2>
                <a className="link" href={profile.resume.viewUrl} target="_blank" rel="noopener noreferrer">
                  Open in a new tab
                </a>
              </div>
              <iframe className="pv-resume-frame" src={profile.resume.viewUrl} title={`${profile.fullName}'s resume`} />
            </section>
          )}

          {profile.technicalFocus || profile.projectExperience ? (
            <section className="panel pv-section" aria-labelledby="pv-work">
              <h2 id="pv-work">On the car</h2>
              {profile.technicalFocus && <p className="pv-focus">{profile.technicalFocus}</p>}
              {profile.projectExperience && <p className="pv-built">{profile.projectExperience}</p>}
            </section>
          ) : (
            preview && <Missing title="On the car" text="Partners will see your technical focus and what you built here." />
          )}

          {profile.skills.length > 0 ? (
            <section className="panel pv-section" aria-labelledby="pv-skills">
              <h2 id="pv-skills">Skills</h2>
              <ul className="pv-skills">
                {profile.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </section>
          ) : (
            preview && <Missing title="Skills" text="Partners will see the skills you've used on the team here." />
          )}

        </div>

        <aside className="pv-side">
          {facts.length === 0 && preview && <Missing title="Details" text="Partners will see your major, graduation date and what you're looking for here." />}
          {facts.length > 0 && (
            <section className="panel pv-section" aria-label="Details">
              <dl className="pv-facts">
                {facts.map((fact) => (
                  <div key={fact.term}>
                    <dt>{fact.term}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="panel pv-section" aria-labelledby="pv-contact">
            <h2 id="pv-contact">Contact</h2>
            <ul className="pv-links">
              <li>
                <a className="link" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
              </li>
              {links.map((link) => (
                <li key={link.label}>
                  <a className="link" href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {profile.files.length > 0 && (
            <section className="panel pv-section" aria-labelledby="pv-files">
              <h2 id="pv-files">Portfolio</h2>
              <ul className="pv-files">
                {profile.files.map((piece) => (
                  <li key={piece.id}>
                    {piece.kind === "video" && piece.url && (
                      <video className="pv-video" src={`${piece.url}#t=0.1`} controls preload="metadata" playsInline />
                    )}
                    {piece.kind === "video_link" && (
                      <iframe
                        className="pv-video"
                        src={piece.embedUrl}
                        title={`${profile.fullName}'s video`}
                        allow="fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    )}
                    {piece.kind === "file" && piece.url ? (
                      <a className="link file-name" href={piece.url}>
                        {piece.fileName}
                      </a>
                    ) : piece.kind === "video_link" ? (
                      <a className="link file-name" href={piece.url} target="_blank" rel="noopener noreferrer">
                        Watch on {piece.provider}
                      </a>
                    ) : (
                      <span className="file-name">{piece.fileName}</span>
                    )}
                    {piece.kind !== "video_link" && (
                      <span className="cell-secondary num">
                        {piece.kind === "video" ? (piece.seconds ? formatDuration(piece.seconds) : "Video") : formatBytes(piece.sizeBytes)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}

function Missing({ title, text }: { title: string; text: string }) {
  return (
    <section className="panel pv-section pv-missing">
      <h2>{title}</h2>
      <p>
        {text}{" "}
        <a className="link" href="/profile">
          Add it
        </a>
      </p>
    </section>
  );
}

function firstName(fullName: string) {
  return fullName.includes("@") ? "them" : fullName.split(/\s+/)[0];
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // An uploaded photo (a signed URL) or the Google one; plain img so no image proxy is needed.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="pv-avatar" src={url} alt="" width={72} height={72} referrerPolicy="no-referrer" />;
  }
  const initials = name.includes("@")
    ? name[0].toUpperCase()
    : name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
  return (
    <span className="pv-avatar pv-initials" aria-hidden="true">
      {initials}
    </span>
  );
}
