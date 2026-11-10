export const TEAMS = [
  { slug: "solar", name: "Solar", acronym: "LHRs", logo: "/brand/lhrs-logo.svg" },
  { slug: "electric", name: "Electric", acronym: "LHRe", logo: "/brand/lhre-logo.svg" },
  { slug: "combustion", name: "Combustion", acronym: "LHRc", logo: "/brand/lhrc-logo.svg" },
] as const;

export type TeamSlug = (typeof TEAMS)[number]["slug"];

export function isTeamSlug(value: unknown): value is TeamSlug {
  return TEAMS.some((team) => team.slug === value);
}

export function teamName(slug: string | null | undefined): string | null {
  return TEAMS.find((team) => team.slug === slug)?.name ?? null;
}
