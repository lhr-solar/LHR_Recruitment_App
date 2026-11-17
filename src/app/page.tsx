import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lockup } from "@/components/lockup";
import { getViewer, homeFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TEAMS, type TeamSlug } from "@/lib/teams";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "LHR Careers: hire the engineers behind Longhorn Racing" },
  description:
    "Longhorn Racing's Partners meet the UT Austin students who design, build and race our Solar, Electric and Combustion cars: a student directory, job posts and who applied.",
};

// The three stripes of the LHR mark are the three teams. On this page they are the one shape:
// the hero's bars, the list bullets and the closing mark.

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

type Stats = { students: number; jobs: number };

export default async function Home() {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer));

  const supabase = await createClient();
  const [stats, subsystems] = await Promise.all([
    supabase.rpc("landing_stats"),
    supabase.from("subsystems").select("name, team").eq("active", true).order("sort"),
  ]);
  const s = (stats.data as Stats | null) ?? { students: 0, jobs: 0 };
  const allSubsystems = subsystems.data ?? [];

  // Live figures, skipping any that are still zero so a new site never boasts about nothing.
  const figures = [
    { value: s.students, label: s.students === 1 ? "engineer in the student directory" : "engineers in the student directory" },
    { value: s.jobs, label: s.jobs === 1 ? "job open to members right now" : "jobs open to members right now" },
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

        <section className="l-intro" aria-label="Who's in the student directory">
          <p className="l-statement l-reveal">Every profile is someone who built a car: the solar array, the chassis, the welds.</p>
        </section>

        <section className="l-showcase" id="partners" aria-labelledby="partners-title">
          <div className="l-plate l-reveal">
            <Image src="/photos/solar-team-flags.jpg" alt="The Solar team gathered around their car at the track" fill sizes="(max-width: 48rem) 100vw, 50vw" />
          </div>
          <div className="l-showcase-text">
            <h2 id="partners-title" className="l-reveal">One student directory, three teams</h2>
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
          <h2 id="teams-title" className="l-teams-title l-reveal">Find the subsystem you hire for</h2>
          <div className="l-team-grid">
            {TEAMS.map((t) => (
              <article key={t.slug} className="l-team l-reveal" data-team={t.slug} aria-labelledby={`team-${t.slug}`}>
                <div className="l-team-photo">
                  <Image src={TEAM_PHOTOS[t.slug].pick} alt={TEAM_PHOTOS[t.slug].pickAlt} fill sizes="(max-width: 60rem) 100vw, 33vw" />
                </div>
                <h3 id={`team-${t.slug}`} className="l-team-name">
                  {t.name}
                </h3>
                <p className="l-team-line">{TEAM_PHOTOS[t.slug].line}</p>
                <ul className="l-bullets l-subsystems">
                  {allSubsystems
                    .filter((sub) => sub.team === t.slug)
                    .map((sub) => (
                      <li key={sub.name}>{sub.name}</li>
                    ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="l-members" id="members" aria-labelledby="members-title">
          <h2 id="members-title">For LHR members</h2>
          <p className="l-statement l-reveal">One profile with your resume and your work on the car, and jobs posted for you.</p>
          <div className="l-members-foot l-reveal">
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

        <section className="l-cta" aria-labelledby="cta-title">
          <div className="l-cta-stripes" role="img" aria-label="The three stripes of the LHR mark: Solar, Electric and Combustion">
            {TEAMS.map((t) => (
              <span key={t.slug} data-team={t.slug} />
            ))}
          </div>
          <div className="l-cta-text">
            <h2 id="cta-title" className="l-reveal">Meet our engineers</h2>
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
