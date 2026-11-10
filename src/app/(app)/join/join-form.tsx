"use client";

import Image from "next/image";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { TEAMS } from "@/lib/teams";
import { requestToJoin, type JoinState } from "./actions";

export function JoinForm({ defaultTeam, defaultNote }: { defaultTeam: string | null; defaultNote: string }) {
  const [state, formAction] = useActionState<JoinState, FormData>(requestToJoin, { error: null });

  return (
    <form action={formAction} className="panel grid gap-[var(--space-lg)]">
      <fieldset className="grid gap-[var(--space-sm)]">
        <legend className="field-label mb-[var(--space-xs)]">Your team</legend>
        <div className="team-choices">
          {TEAMS.map((team) => (
            <label key={team.slug} className="team-choice" data-team={team.slug}>
              <input type="radio" name="team" value={team.slug} defaultChecked={defaultTeam === team.slug} required />
              <Image src={team.logo} alt="" width={96} height={20} unoptimized />
              <span className="team-choice-name">{team.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label className="field-label" htmlFor="note">
          Note for your leads <span className="font-normal text-[var(--color-muted)]">(optional)</span>
        </label>
        <p className="field-hint" id="note-hint">
          Your subsystem, or who on the team can vouch for you.
        </p>
        <textarea id="note" name="note" aria-describedby="note-hint" className="input" maxLength={500} defaultValue={defaultNote} />
      </div>

      {state.error && (
        <div className="notice notice-error" role="alert">
          <p>{state.error}</p>
        </div>
      )}

      <div>
        <SubmitButton pendingLabel="Sending request">Send request</SubmitButton>
      </div>
    </form>
  );
}
