import type { Metadata } from "next";
import { requireActiveMember } from "@/lib/auth";
import { teamName } from "@/lib/teams";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const viewer = await requireActiveMember();
  const team = teamName(viewer.team);

  return (
    <div className="narrow">
      <header className="page-head">
        <h1>My profile</h1>
        <p>
          {team ? `You're on the ${team} team. ` : ""}Your profile is what Partners see: your subsystem, skills, resume
          and up to three portfolio files.
        </p>
      </header>
      <section className="panel empty-block" aria-labelledby="profile-empty">
        <h2 id="profile-empty">Profile editing is next</h2>
        <p>The profile editor ships in the next build. Your account is ready for it.</p>
      </section>
    </div>
  );
}
