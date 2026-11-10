"use client";

import Image from "next/image";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { TEAMS } from "@/lib/teams";
import { chooseTeam, type TeamState } from "./actions";

export function ChooseTeamForm() {
  const [state, formAction] = useActionState<TeamState, FormData>(chooseTeam, { error: null });

  return (
    <form action={formAction} className="panel grid gap-[var(--space-lg)]">
      <fieldset className="grid gap-[var(--space-sm)]">
        <legend className="field-label mb-[var(--space-xs)]">Your team</legend>
        <div className="team-choices">
          {TEAMS.map((team) => (
            <label key={team.slug} className="team-choice" data-team={team.slug}>
              <input type="radio" name="team" value={team.slug} required />
              <Image src={team.logo} alt="" width={96} height={20} unoptimized />
              <span className="team-choice-name">{team.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && (
        <div className="notice notice-error" role="alert">
          <p>{state.error}</p>
        </div>
      )}
      <div>
        <SubmitButton pendingLabel="Saving">Set my team</SubmitButton>
      </div>
    </form>
  );
}
