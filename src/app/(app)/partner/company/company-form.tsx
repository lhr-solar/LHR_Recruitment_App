"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { MAX_DESCRIPTION } from "@/lib/partner-options";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { saveCompany, type CompanyState } from "./actions";

export function CompanyForm({ name, website, description }: { name: string; website: string | null; description: string | null }) {
  const [state, setState] = useState<CompanyState>({ status: "idle" });
  const [saving, startSaving] = useTransition();
  // Same rule as the profile editor: clean once a successful save covers the latest edit.
  const [edits, setEdits] = useState(0);
  const [savedEdits, setSavedEdits] = useState(0);
  const dirty = edits > savedEdits;
  useUnsavedChanges(dirty);
  const [length, setLength] = useState(description?.length ?? 0);
  const errors = state.status === "error" ? state.fieldErrors : {};

  // Submitting by hand keeps what was typed if the save fails (a form action would reset it).
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const editsAtSubmit = edits;
    startSaving(async () => {
      const result = await saveCompany(state, formData);
      setState(result);
      if (result.status === "saved") setSavedEdits(editsAtSubmit);
    });
  }

  return (
    <form onSubmit={onSubmit} onChange={() => setEdits((n) => n + 1)} className="panel profile-section" aria-labelledby="company-details" noValidate>
      <h2 id="company-details">Details</h2>

      <div className="field">
        <label className="field-label" htmlFor="company-name">
          Company name
        </label>
        <input id="company-name" className="input" value={name} readOnly aria-describedby="company-name-hint" />
        <p className="field-hint" id="company-name-hint">
          Longhorn Racing sets this. Ask your Longhorn Racing contact if it needs to change.
        </p>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="website">
          Website <span className="field-optional">(optional)</span>
        </label>
        <input
          id="website"
          name="website"
          className="input"
          inputMode="url"
          autoComplete="url"
          placeholder="acme.com"
          defaultValue={website ?? ""}
          aria-invalid={errors.website ? true : undefined}
          aria-describedby={errors.website ? "website-error" : undefined}
        />
        {errors.website && (
          <p className="field-error" id="website-error">
            {errors.website}
          </p>
        )}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="description">
          About the company <span className="field-optional">(optional)</span>
        </label>
        <p className="field-hint" id="description-hint">
          What you build, where engineers work, and the kinds of roles you hire for.
        </p>
        <textarea
          id="description"
          name="description"
          className="input textarea-tall"
          maxLength={MAX_DESCRIPTION}
          defaultValue={description ?? ""}
          onInput={(event) => setLength(event.currentTarget.value.length)}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={`description-hint description-count${errors.description ? " description-error" : ""}`}
        />
        <div className="field-foot">
          {errors.description ? (
            <p className="field-error" id="description-error">
              {errors.description}
            </p>
          ) : (
            <span />
          )}
          <span className="field-count" id="description-count" data-over={length > MAX_DESCRIPTION || undefined}>
            {length.toLocaleString("en-US")} / {MAX_DESCRIPTION.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      <div className="form-actions">
        <p className="save-bar-status" role="status">
          {state.status === "error" ? (
            <span className="save-bar-error">{state.message}</span>
          ) : dirty ? (
            "Unsaved changes"
          ) : state.status === "saved" ? (
            "Company page saved"
          ) : (
            ""
          )}
        </p>
        <SubmitButton busy={saving} pendingLabel="Saving">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
