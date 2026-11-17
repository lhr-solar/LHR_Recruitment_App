"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { TEAMS } from "@/lib/teams";
import { setAccountStatus, setMemberRole, type MemberResult } from "./actions";

type Member = { id: string; team: string | null; isAdmin: boolean; isTeamLead: boolean };

export function RoleForm({ member, self }: { member: Member; self: boolean }) {
  const [state, action] = useActionState<MemberResult, FormData>(setMemberRole, { status: "idle" });

  return (
    <form action={action} className="member-form">
      <input type="hidden" name="userId" value={member.id} />
      <div className="field">
        <label className="field-label" htmlFor="member-team">
          Team
        </label>
        <select id="member-team" name="team" className="input" defaultValue={member.team ?? ""}>
          {!member.team && <option value="">No team yet</option>}
          {TEAMS.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="field">
        <legend className="field-label">Roles</legend>
        <div className="choice-list">
          <label className="check">
            <input type="checkbox" name="isTeamLead" defaultChecked={member.isTeamLead} />
            Team lead: reviews join requests, manages the roster and pauses students on their team
          </label>
          <label className="check">
            {/* Keeps the value when the box is locked, since disabled fields aren't submitted. */}
            {self && <input type="hidden" name="isAdmin" value="on" />}
            <input type="checkbox" name="isAdmin" defaultChecked={member.isAdmin} disabled={self} />
            Admin: everything, including Partners and other admins
          </label>
        </div>
        {self && <p className="field-hint">You can&apos;t remove your own admin role. Ask another admin.</p>}
      </fieldset>
      <div className="member-form-foot">
        <p role="status" className={state.status === "error" ? "field-error" : "field-hint"}>
          {state.status === "error" ? state.message : state.status === "saved" ? "Saved." : ""}
        </p>
        <SubmitButton pendingLabel="Saving">Save</SubmitButton>
      </div>
    </form>
  );
}

// Pause or restore an account.
export function StatusForm({ userId, paused }: { userId: string; paused: boolean }) {
  const [state, action] = useActionState<MemberResult, FormData>(setAccountStatus, { status: "idle" });

  return (
    <form action={action} className="status-form">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={paused ? "active" : "suspended"} />
      <SubmitButton variant={paused ? "secondary" : "danger"} pendingLabel={paused ? "Restoring" : "Pausing"}>
        {paused ? "Restore access" : "Pause account"}
      </SubmitButton>
      {state.status === "error" && (
        <p className="field-error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
