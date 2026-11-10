"use client";

import { useActionState } from "react";
import { sendMagicLink, type MagicLinkState } from "./actions";
import { SubmitButton } from "@/components/submit-button";

export function MagicLinkForm({ door, label }: { door: "member" | "partner"; label: string }) {
  const [state, formAction] = useActionState<MagicLinkState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="notice notice-success" role="status">
        <p>
          We sent a sign-in link to <strong>{state.email}</strong>. It works once and expires in an hour.
        </p>
      </div>
    );
  }

  const error = state.status === "error" ? state.message : null;

  return (
    <form action={formAction} className="grid gap-[var(--space-sm)]" noValidate>
      <input type="hidden" name="door" value={door} />
      <div className="field">
        <label className="field-label" htmlFor="email">
          {label}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="input"
          defaultValue={state.status === "error" ? state.email : ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "email-error" : undefined}
        />
        {error && (
          <p id="email-error" className="field-error">
            {error}
          </p>
        )}
      </div>
      <SubmitButton variant="secondary" pendingLabel="Sending link" block>
        Email me a sign-in link
      </SubmitButton>
    </form>
  );
}
