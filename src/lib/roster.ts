import { TEAMS, type TeamSlug } from "@/lib/teams";

// Roster imports: pasted emails or a CSV exported from a sign-up sheet. Every line is read for an
// email and, optionally, a team ("Solar", "solar" or "LHRs"); lines without a team go to the team
// picked on the form.

const EMAIL = /[^\s,;"'<>()]+@[^\s,;"'<>()]+\.[^\s,;"'<>()]+/;

export type RosterImport = {
  byTeam: Map<TeamSlug, string[]>;
  // Lines that had an @ but no usable address.
  unreadable: string[];
};

function teamFrom(cell: string): TeamSlug | null {
  const value = cell.trim().replace(/^"|"$/g, "").toLowerCase();
  return TEAMS.find((t) => t.slug === value || t.name.toLowerCase() === value || t.acronym.toLowerCase() === value)?.slug ?? null;
}

export function parseRoster(text: string, fallback: TeamSlug | null): RosterImport {
  const byTeam = new Map<TeamSlug, string[]>();
  const unreadable: string[] = [];
  const seen = new Set<string>();

  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(/[,;\t]/);
    // A pasted list can hold several addresses on one line.
    const emails = cells.flatMap((cell) => cell.split(/\s+/)).map((token) => EMAIL.exec(token)?.[0]?.toLowerCase()).filter((e): e is string => Boolean(e));
    if (emails.length === 0) {
      if (line.includes("@")) unreadable.push(line.trim());
      continue;
    }
    const team = cells.map(teamFrom).find(Boolean) ?? fallback;
    for (const email of emails) {
      if (seen.has(email)) continue;
      seen.add(email);
      if (!team) {
        unreadable.push(email);
        continue;
      }
      byTeam.set(team, [...(byTeam.get(team) ?? []), email]);
    }
  }
  return { byTeam, unreadable };
}
