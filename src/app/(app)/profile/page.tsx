import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireActiveMember } from "@/lib/auth";
import { joinList } from "@/lib/student-options";
import { loadStudentProfile, readiness } from "@/lib/student";
import { TEAMS } from "@/lib/teams";
import { ChooseTeamForm } from "./choose-team-form";
import { PhotoCard } from "./photo-card";
import { PortfolioCard } from "./portfolio-card";
import { ProfileForm } from "./profile-form";
import { ResumeCard } from "./resume-card";
import { VisibilitySwitch } from "./visibility-switch";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const viewer = await requireActiveMember();
  const team = TEAMS.find((t) => t.slug === viewer.team);

  // Admins seeded without a roster entry pick their team once.
  if (!team) {
    return (
      <div className="narrow">
        <header className="page-head">
          <h1>Which team are you on?</h1>
          <p>Your profile sits under your team in the resume book. Only an admin can change it after this.</p>
        </header>
        <ChooseTeamForm />
      </div>
    );
  }

  const profile = await loadStudentProfile(viewer.id, team.slug);
  const { student } = profile;
  const ready = readiness(student, profile.skillIds.length, profile.files.length);
  const visible = student?.visible ?? true;
  const isNew = !student;
  const subsystem = profile.subsystems.find((s) => s.id === student?.subsystem_id)?.name;
  const updated = student?.resume_updated_at
    ? new Date(student.resume_updated_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "America/Chicago",
      })
    : null;
  const doneCount = ready.steps.filter((step) => step.done).length;

  return (
    <div className="profile-page">
      <header className="page-head">
        <h1>{isNew ? "Set up your profile" : "My profile"}</h1>
        <p>
          {isNew
            ? "Recruiters at Longhorn Racing's partner companies browse these profiles for interns and new hires. Start with your resume."
            : "This is what recruiters at partner companies see when they browse the resume book."}
        </p>
      </header>

      <div className="profile-grid">
        <aside className="profile-aside" aria-label="Profile status">
          <div className="panel profile-status">
            <div className="profile-team" data-team={team.slug}>
              <Image src={team.logo} alt="" width={88} height={18} unoptimized />
              <p>
                <span className="cell-primary">{team.name} team</span>
                <span className="cell-secondary">{subsystem ?? "No subsystem yet"}</span>
              </p>
            </div>

            <VisibilitySwitch visible={visible} />
            <StatusNotice visible={visible} missing={ready.missingForPartners} />
            <Link href="/profile/preview" className="btn btn-secondary btn-block">
              Preview what Partners see
            </Link>

            <div className="checklist">
              <h2 className="checklist-title">
                Checklist <span className="field-hint num">{doneCount} of {ready.steps.length}</span>
              </h2>
              <ul>
                {ready.steps.map((step) => (
                  <li key={step.label} data-done={step.done || undefined}>
                    <CheckIcon done={step.done} />
                    <span>
                      {step.label}
                      <span className="visually-hidden">{step.done ? ": done" : ": to do"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        <div className="profile-main">
          <ResumeCard userId={viewer.id} url={profile.resumeUrl} updated={updated} />
          <PortfolioCard userId={viewer.id} pieces={profile.files} />
          <PhotoCard userId={viewer.id} name={viewer.fullName ?? viewer.email} photoUrl={profile.photoUrl} />
          <ProfileForm
            fullName={viewer.fullName ?? ""}
            email={viewer.email}
            student={student}
            subsystems={profile.subsystems}
            skills={profile.skills}
            skillIds={profile.skillIds}
          />
        </div>
      </div>
    </div>
  );
}

function StatusNotice({ visible, missing }: { visible: boolean; missing: string[] }) {
  if (!visible) {
    return (
      <div className="notice notice-info">
        <p>Your profile is hidden. Partners won&apos;t find you in the resume book.</p>
      </div>
    );
  }
  if (missing.length) {
    return (
      <div className="notice notice-pending">
        <p>Partners will see your profile once you add your {joinList(missing)}.</p>
      </div>
    );
  }
  return (
    <div className="notice notice-success">
      <p>Partners can see your profile.</p>
    </div>
  );
}

function CheckIcon({ done }: { done: boolean }) {
  return (
    <svg className="check-icon" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      {done ? (
        <>
          <circle cx="9" cy="9" r="8" fill="currentColor" />
          <path d="m5.5 9.2 2.3 2.3 4.7-4.9" fill="none" stroke="var(--color-accent-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      )}
    </svg>
  );
}
