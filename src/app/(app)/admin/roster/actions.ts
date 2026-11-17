"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { parseRoster } from "@/lib/roster";
import { createClient } from "@/lib/supabase/server";
import { isTeamSlug, teamName, type TeamSlug } from "@/lib/teams";

export type RosterState =
  | { status: "idle" }
  | { status: "done"; summary: string; skipped: string[] }
  | { status: "error"; message: string };

type Outcome = { added: number; moved: number; kept: number; let_in: number; other_team: string[]; invalid: string[] };

const MAX_FILE_BYTES = 512 * 1024;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export async function addToRoster(_prev: RosterState, formData: FormData): Promise<RosterState> {
  const viewer = await requireStaff();
  // Team leads only ever add to their own team.
  const picked = viewer.isAdmin ? String(formData.get("team") ?? "") : viewer.team;
  const fallback: TeamSlug | null = isTeamSlug(picked) ? picked : null;

  let text = String(formData.get("emails") ?? "");
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return { status: "error", message: "That file is too big for a roster. Export just the email and team columns." };
    text += `\n${await file.text()}`;
  }

  const { byTeam, unreadable } = parseRoster(text, fallback);
  if (byTeam.size === 0) {
    return {
      status: "error",
      message: unreadable.length
        ? "None of those lines had a team. Pick one on the form, or add a team column."
        : "Paste at least one email, or choose a CSV file.",
    };
  }

  const supabase = await createClient();
  const totals = { added: 0, moved: 0, kept: 0, let_in: 0 };
  const skipped = [...unreadable.map((line) => `${line}: no email or team we could read`)];
  for (const [team, emails] of byTeam) {
    if (!viewer.isAdmin && team !== viewer.team) {
      skipped.push(...emails.map((email) => `${email}: listed for ${teamName(team)}, and you can only add to ${teamName(viewer.team)}`));
      continue;
    }
    const { data, error } = await supabase.rpc("add_to_roster", { p_emails: emails, p_team: team });
    if (error) return { status: "error", message: "We couldn't update the roster. Try again in a minute." };
    const outcome = data as Outcome;
    totals.added += outcome.added;
    totals.moved += outcome.moved;
    totals.kept += outcome.kept;
    totals.let_in += outcome.let_in;
    skipped.push(...outcome.invalid.map((email) => `${email}: not an email address`));
    skipped.push(...outcome.other_team.map((email) => `${email}: already on another team's roster`));
  }

  const parts = [`Added ${plural(totals.added, "email")}`];
  if (totals.moved) parts.push(`moved ${plural(totals.moved, "email")} to a new team`);
  if (totals.kept) parts.push(`${plural(totals.kept, "was", "were")} already listed`);
  let summary = `${parts.join(", ")}.`;
  if (totals.let_in) summary += ` ${plural(totals.let_in, "person", "people")} waiting to join ${totals.let_in === 1 ? "was" : "were"} let in.`;

  revalidatePath("/admin", "layout");
  return { status: "done", summary, skipped };
}

export async function removeFromRoster(formData: FormData) {
  await requireStaff();
  const email = String(formData.get("email") ?? "").toLowerCase();
  if (!email) return;
  const supabase = await createClient();
  // Row-level security limits team leads to their own team's entries.
  await supabase.from("roster_entries").delete().eq("email", email);
  revalidatePath("/admin/roster");
}
