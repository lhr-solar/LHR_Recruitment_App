import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccountType = "member" | "partner";
export type AccountStatus = "pending" | "active" | "suspended" | "rejected";

export type Viewer = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  accountType: AccountType | null;
  status: AccountStatus;
  isAdmin: boolean;
  isTeamLead: boolean;
  team: string | null;
};

// One profile read per request, shared by every component that asks.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, avatar_url, account_type, status, is_admin, is_team_lead, team")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    id: user.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    accountType: profile.account_type,
    status: profile.status,
    isAdmin: profile.is_admin,
    isTeamLead: profile.is_team_lead,
    team: profile.team,
  };
});

// Where a signed-in person belongs, given what their account is.
export function homeFor(viewer: Viewer): string {
  if (viewer.status === "suspended") return "/account";
  if (viewer.accountType === "member") {
    return viewer.status === "active" ? "/profile" : "/join";
  }
  if (viewer.accountType === "partner") {
    return viewer.status === "active" ? "/partner" : "/pending";
  }
  return "/login?error=unclaimed";
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

export async function requireActiveMember(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.accountType !== "member" || viewer.status !== "active") redirect(homeFor(viewer));
  return viewer;
}

export async function requireActivePartner(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.accountType !== "partner" || viewer.status !== "active") redirect(homeFor(viewer));
  return viewer;
}

export async function requireStaff(): Promise<Viewer> {
  const viewer = await requireActiveMember();
  if (!viewer.isAdmin && !viewer.isTeamLead) redirect(homeFor(viewer));
  return viewer;
}
