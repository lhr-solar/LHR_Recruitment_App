import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { homeFor, requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { teamName } from "@/lib/teams";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Join your team" };

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const viewer = await requireViewer();
  if (viewer.accountType !== "member" || viewer.status === "active") redirect(homeFor(viewer));

  const { edit } = await searchParams;
  const supabase = await createClient();
  const { data: request } = await supabase
    .from("member_requests")
    .select("team, note, status, created_at")
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (request?.status === "declined" || viewer.status === "rejected") {
    return (
      <div className="narrow">
        <header className="page-head">
          <h1>Your request wasn&apos;t approved</h1>
          <p>
            The {teamName(request?.team) ?? "team"} leads didn&apos;t confirm {viewer.email}. If you&apos;re on the
            team, ask a lead to add you to the roster, then sign in again.
          </p>
        </header>
      </div>
    );
  }

  if (request?.status === "pending" && edit !== "1") {
    return (
      <div className="narrow">
        <header className="page-head">
          <h1>Waiting on your {teamName(request.team)} leads</h1>
          <p>
            You asked to join on {dateFormat.format(new Date(request.created_at))}. Once a lead confirms you, you can build
            the profile Partners see. We&apos;ll email {viewer.email} when that happens.
          </p>
        </header>
        <Link href="/join?edit=1" className="btn btn-secondary">
          Change team or note
        </Link>
      </div>
    );
  }

  return (
    <div className="narrow">
      <header className="page-head">
        <h1>Which team are you on?</h1>
        <p>
          {viewer.email} isn&apos;t on a team roster yet. Pick your team and one of its leads will confirm you.
        </p>
      </header>
      <JoinForm defaultTeam={request?.team ?? null} defaultNote={request?.note ?? ""} />
    </div>
  );
}
