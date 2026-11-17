"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { TEAMS } from "@/lib/teams";
import { addToRoster, type RosterState } from "./actions";

// Admins pick a team (a CSV's team column wins); team leads always add to their own.
export function RosterForm({ team }: { team: string | null }) {
  const [state, setState] = useState<RosterState>({ status: "idle" });
  const [adding, startAdding] = useTransition();

  // Submitting by hand keeps a pasted list if something needs fixing (a form action would clear it).
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startAdding(async () => {
      const result = await addToRoster(state, formData);
      if (result.status === "done") form.reset();
      setState(result);
    });
  }

  return (
    <form onSubmit={onSubmit} className="roster-form">
      <div className="field">
        <label className="field-label" htmlFor="roster-emails">
          Emails
        </label>
        <p className="field-hint" id="roster-emails-hint">
          Paste addresses separated by commas or new lines. Anyone listed signs in straight to their profile, without a join request.
        </p>
        <textarea id="roster-emails" name="emails" className="input" rows={4} aria-describedby="roster-emails-hint" placeholder="bevo@utexas.edu, hook.em@utexas.edu" />
      </div>

      <div className={team ? "roster-form-row roster-form-row-one" : "roster-form-row"}>
        <div className="field">
          <label className="field-label" htmlFor="roster-file">
            Or a CSV file <span className="field-optional">(optional)</span>
          </label>
          <input id="roster-file" name="file" type="file" accept=".csv,.txt,text/csv,text/plain" className="input input-file" aria-describedby="roster-file-hint" />
          <p className="field-hint" id="roster-file-hint">
            Any sheet with an email column works. {team ? "" : "A team column (Solar, Electric or Combustion) wins over the team picked here."}
          </p>
        </div>

        {team ? (
          <input type="hidden" name="team" value={team} />
        ) : (
          <div className="field">
            <label className="field-label" htmlFor="roster-team">
              Team
            </label>
            <select id="roster-team" name="team" className="input" defaultValue="">
              <option value="">From the file&apos;s team column</option>
              {TEAMS.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="roster-form-foot">
        <div role="status" className="roster-result">
          {state.status === "done" && (
            <div className="notice notice-success">
              <p>{state.summary}</p>
            </div>
          )}
          {state.status === "error" && (
            <div className="notice notice-error">
              <p>{state.message}</p>
            </div>
          )}
        </div>
        <SubmitButton pendingLabel="Adding" busy={adding}>Add to roster</SubmitButton>
      </div>

      {state.status === "done" && state.skipped.length > 0 && (
        <details className="roster-skipped">
          <summary>{state.skipped.length} skipped</summary>
          <ul>
            {state.skipped.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      )}
    </form>
  );
}
