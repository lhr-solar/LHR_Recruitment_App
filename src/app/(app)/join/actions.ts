"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isTeamSlug } from "@/lib/teams";

export type JoinState = { error: string | null };

export async function requestToJoin(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const team = formData.get("team");
  const note = String(formData.get("note") ?? "").slice(0, 500);
  if (!isTeamSlug(team)) return { error: "Choose the team you're on." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_membership", { p_team: team, p_note: note });
  if (error) return { error: "We couldn't send your request. Try again in a minute." };

  revalidatePath("/join");
  return { error: null };
}
