import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lockup } from "@/components/lockup";
import { getViewer, homeFor } from "@/lib/auth";
import { logoUrl } from "@/lib/partner-options";
import { createClient } from "@/lib/supabase/server";
import { TEAMS, isTeamSlug, type TeamSlug } from "@/lib/teams";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "LHR Careers: hire the engineers behind Longhorn Racing" },
  description:
    "Longhorn Racing's Partners meet the UT Austin students who design, build and race our Solar, Electric and Combustion cars: a resume book, job posts and who applied.",
};

// The three stripes of the LHR mark are the three teams. On this page they are the one shape:
// the hero's bars, the photo masks, the list bullets and the closing mark.

const TEAM_PHOTOS: Record<TeamSlug, { hero: string; heroAlt: string; pick: string; pickAlt: string; line: string }> = {
  solar: {
    hero: "/photos/solar-track-blur.jpg",
    heroAlt: "The Longhorn Racing solar car at speed on track",
    pick: "/photos/solar-driver.jpg",
    pickAlt: "A Solar driver smiling in the cockpit under the solar array",
    line: "A solar car that races across the country on sunlight alone.",
  },
  electric: {
    hero: "/photos/electric-car-track.jpg",
    heroAlt: "The Longhorn Racing electric car, number 97, on track",
    pick: "/photos/electric-upright.jpg",
    pickAlt: "An Electric team member holding a machined upright in the shop",
    line: "An electric formula car, designed and built every year for Formula SAE.",
  },
  combustion: {
    hero: "/photos/combustion-push.jpg",
    heroAlt: "The Combustion team pushing their car, number 88, out of the paddock",
    pick: "/photos/combustion-garage.jpg",
    pickAlt: "The Combustion team working on their car in the garage",
    line: "A combustion formula car, built from frame to engine tune for Formula SAE.",
  },
};

type Stats = { students: number; by_team: Partial<Record<TeamSlug, number>>; jobs: number; partners: number };
type Partner = { id: string; name: string; logo_path: string | null; partner_tiers: { rank: number } | null };

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

export default async function Home({ searchParams }: PageProps<"/">) {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer));

  const params = await searchParams;
  const team: TeamSlug = isTeamSlug(params.team) ? params.team : "solar";

  const supabase = await createClient();
  const [stats, subsystems, partners] = await Promise.all([
    supabase.rpc("landing_stats"),
    supabase.from("subsystems").select("name, team").eq("active", true).order("sort"),
    supabase.from("partner_companies").select("id, name, logo_path, partner_tiers(rank)").eq("active", true).order("name"),
  ]);
  const s = (stats.data as Stats | null) ?? { students: 0, by_team: {}, jobs: 0, partners: 0 };
  const allSubsystems = subsystems.data ?? [];
  const teamSubsystems = allSubsystems.filter((sub) => sub.team === team);
  const teamName = TEAMS.find((t) => t.slug === team)!.name;
  const teamCount = s.by_team[team] ?? 0;
  // Top tier first, then by name; companies without a tier come last.
  const wall = ((partners.data ?? []) as unknown as Partner[]).sort(
    (a, b) => (a.partner_tiers?.rank ?? Infinity) - (b.partner_tiers?.rank ?? Infinity) || a.name.localeCompare(b.name),
  );

  // Live figures, skipping any that are still zero so a new site never boasts about nothing.
  const figures = [
    { value: s.students, label: s.students === 1 ? "engineer in the resume book" : "engineers in the resume book" },
    { value: s.jobs, label: s.jobs === 1 ? "job open to members right now" : "jobs open to members right now" },
    { value: s.partners, label: s.partners === 1 ? "Partner company" : "Partner companies" },
    { value: allSubsystems.length, label: "subsystems across three cars" },
    { value: 3, label: "cars designed, built and raced each year" },
  ]
    .filter((f) => f.value > 0)
    .slice(0, 3);

  return (
    <div className="landing">
      <header className="l-bar">
        <Link href="/" className="l-brand" aria-label="LHR Careers home">
          <Lockup height={34} />
        </Link>
        <nav className="l-nav" aria-label="Main">
          <a href="#partners">For Partners</a>
          <a href="#members">For members</a>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>

      <main>
        <section className="l-hero" aria-labelledby="hero-title">
          <div className="l-hero-text">
            <h1 id="hero-title">Hire engineers who race</h1>
            <p className="l-lede">
              LHR Careers connects Longhorn Racing&apos;s Partners with the UT Austin students who design, build and race our Solar, Electric and Combustion cars.
            </p>
            <div className="l-actions">
              <Link href="/partners/request" className="l-button">
                Request Partner access
              </Link>
              <Link href="/login" className="l-link">
                LHR member? Sign in
              </Link>
            </div>
          </div>
          <div className="l-stripes" aria-hidden="true">
            {TEAMS.map((t, i) => (
              <div key={t.slug} className="l-stripe" data-team={t.slug} style={{ "--i": i } as React.CSSProperties}>
                <Image src={TEAM_PHOTOS[t.slug].hero} alt="" fill priority sizes="(max-width: 48rem) 130vw, 60vw" />
              </div>
            ))}
          </div>
        </section>

        <section className="l-intro" aria-label="Who's in the resume book">
          <p className="l-statement l-reveal">
            Every profile is someone who built a car: the solar{" "}
            <Thumb word="array" after="," src="/photos/solar-array-bench.jpg" alt="Two Solar members laying out solar cells on the bench" /> the{" "}
            <Thumb word="chassis" after="," src="/photos/electric-frame-build.jpg" alt="The Electric team building a spaceframe chassis" /> the{" "}
            <Thumb word="welds" after="." src="/photos/solar-welding.jpg" alt="A team member welding in the shop" />
          </p>
        </section>

        <section className="l-showcase" id="partners" aria-labelledby="partners-title">
          <div className="l-plate l-reveal">
            <Image src="/photos/solar-team-flags.jpg" alt="The Solar team gathered around their car at the track" fill sizes="(max-width: 48rem) 100vw, 50vw" />
          </div>
          <div className="l-showcase-text">
            <h2 id="partners-title" className="l-reveal">One resume book, three teams</h2>
            <p className="l-reveal">
              Approved Partners browse every finished profile: the resume first, then what the student built on the car, their skills and how to reach them.
              Filter by team, subsystem, major, graduation date and work authorization.
            </p>
            <ul className="l-bullets l-reveal">
              <li>Open and download resumes and portfolio work</li>
              <li>Post jobs, and see how many members viewed and clicked through</li>
              <li>See who marked that they applied, with their full profile</li>
              <li>Email students or find them on LinkedIn directly</li>
            </ul>
            <div className="l-cells l-reveal">
              <Link href="/partners/request" className="l-cell l-cell-ink">
                Request Partner access
              </Link>
              <Link href="/login?door=partner" className="l-cell">
                Partner sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="l-teams" id="teams" aria-labelledby="teams-title">
          <div className="l-teams-head">
            <h2 id="teams-title" className="l-reveal">Find the subsystem you hire for</h2>
            <nav className="l-tabs" aria-label="Choose a team">
              {TEAMS.map((t) => (
                <Link
                  key={t.slug}
                  href={`/?team=${t.slug}#teams`}
                  scroll={false}
                  replace
                  className="l-tab"
                  data-team={t.slug}
                  aria-current={t.slug === team ? "true" : undefined}
                >
                  {t.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="l-team" data-team={team}>
            <div className="l-team-photo">
              <Image key={team} src={TEAM_PHOTOS[team].pick} alt={TEAM_PHOTOS[team].pickAlt} fill sizes="(max-width: 48rem) 100vw, 45vw" />
            </div>
            <div className="l-team-body">
              <p className="l-team-line">{TEAM_PHOTOS[team].line}</p>
              <p className="l-team-count">
                {teamCount > 0 ? `${plural(teamCount, `${teamName} engineer`)} in the resume book` : `${teamName} profiles open as members finish them`}
              </p>
              <h3 className="visually-hidden">{teamName} subsystems</h3>
              <ul className="l-bullets l-subsystems">
                {teamSubsystems.map((sub) => (
                  <li key={sub.name}>{sub.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="l-members" id="members" aria-labelledby="members-title">
          <h2 id="members-title">For LHR members</h2>
          <p className="l-statement l-reveal">
            One <Thumb word="profile" src="/photos/electric-upright.jpg" alt="An Electric team member holding a part from the car" /> with your resume and your work on the car,
            and <Thumb word="jobs" src="/photos/combustion-push.jpg" alt="The Combustion car heading out to compete" /> posted for you.
          </p>
          <div className="l-members-foot l-reveal">
            <p>You choose whether Partners see your profile. Sign in with your @utexas.edu Google account: if you&apos;re on a team roster you go straight to your profile; otherwise your team lead confirms you.</p>
            <Link href="/login" className="l-button">
              Member sign in
            </Link>
          </div>
        </section>

        {figures.length === 3 && (
          <section className="l-stats" aria-labelledby="stats-title">
            <h2 id="stats-title" className="l-stats-title l-reveal">LHR Careers today</h2>
            {figures.map((f, i) => (
              <p key={f.label} className={`l-tile l-tile-${i + 1} l-reveal`}>
                <span className="l-figure">{f.value.toLocaleString("en-US")}</span>
                <span className="l-caption">{f.label}</span>
              </p>
            ))}
          </section>
        )}

        {wall.length > 0 && (
          <section className="l-proof" aria-labelledby="proof-title">
            <div className="l-proof-head l-reveal">
              <h2 id="proof-title">Our Partners</h2>
            </div>
            {wall.slice(0, 11).map((p) => {
              const logo = logoUrl(p.logo_path);
              return (
                <div key={p.id} className="l-mark l-reveal">
                  {logo ? (
                    // A public Storage URL; plain img so SVG logos work without the image proxy.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt={p.name} loading="lazy" />
                  ) : (
                    <span>{p.name}</span>
                  )}
                </div>
              );
            })}
          </section>
        )}

        <section className="l-cta" aria-labelledby="cta-title">
          <div className="l-cta-stripes" role="img" aria-label="The three stripes of the LHR mark: Solar, Electric and Combustion">
            {TEAMS.map((t) => (
              <span key={t.slug} data-team={t.slug} />
            ))}
          </div>
          <div className="l-cta-text">
            <h2 id="cta-title" className="l-reveal">Meet our engineers</h2>
            <p className="l-reveal">Tell us who you are and who you hire. An LHR officer reviews every request and lets you in.</p>
            <Link href="/partners/request" className="l-button l-reveal">
              Request Partner access
            </Link>
          </div>
        </section>
      </main>

      <footer className="l-footer">
        <Lockup height={56} />
        <div className="l-footer-links">
          <nav aria-label="Partners">
            <h2>Partners</h2>
            <Link href="/partners/request">Request access</Link>
            <Link href="/login?door=partner">Partner sign in</Link>
          </nav>
          <nav aria-label="Members">
            <h2>LHR members</h2>
            <Link href="/login">Member sign in</Link>
            <a href="#members">How it works</a>
          </nav>
          <nav aria-label="Longhorn Racing">
            <h2>Longhorn Racing</h2>
            <a href="https://longhornracing.org" target="_blank" rel="noopener noreferrer">
              longhornracing.org
            </a>
          </nav>
        </div>
        <p className="l-footer-note">Photographs by Longhorn Racing. © {new Date().getFullYear()} Longhorn Racing, The University of Texas at Austin.</p>
      </footer>
    </div>
  );
}

// A photograph set into the line of text after the word it shows, cut to the stripe shape. The word,
// picture and punctuation never break apart.
function Thumb({ word, after = "", src, alt }: { word: string; after?: string; src: string; alt: string }) {
  return (
    <span className="l-nowrap">
      {word}{" "}
      <span className="l-thumb">
        <Image src={src} alt={alt} fill sizes="160px" />
      </span>
      {after}
    </span>
  );
}
