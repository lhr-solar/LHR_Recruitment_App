"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { submitPartnerRequest, type PartnerRequestState } from "@/lib/actions/partner-request";

type Props = {
  // Set when the person is already signed in; their email can't change.
  lockedEmail?: string;
  defaultName?: string;
};

export function PartnerRequestForm({ lockedEmail, defaultName = "" }: Props) {
  const [state, formAction] = useActionState<PartnerRequestState, FormData>(submitPartnerRequest, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="notice notice-success" role="status">
        <p>
          Request received. An LHR officer will review it, and we&apos;ll email you a sign-in link once your company is
          set up as a Partner.
        </p>
      </div>
    );
  }

  const errors = state.status === "error" ? state.fieldErrors : {};
  const field = (name: keyof typeof errors) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const errorText = (name: keyof typeof errors) =>
    errors[name] ? (
      <p id={`${name}-error`} className="field-error">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="panel grid gap-[var(--space-md)]" noValidate>
      <div className="form-row">
        <div className="field">
          <label className="field-label" htmlFor="fullName">
            Your name
          </label>
          <input id="fullName" name="fullName" className="input" autoComplete="name" defaultValue={defaultName} required {...field("fullName")} />
          {errorText("fullName")}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="title">
            Job title <span className="font-normal text-[var(--color-muted)]">(optional)</span>
          </label>
          <input id="title" name="title" className="input" autoComplete="organization-title" />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="email">
          Work email
        </label>
        {lockedEmail ? (
          <>
            <input id="email" className="input" value={lockedEmail} readOnly aria-describedby="email-hint" />
            <p id="email-hint" className="field-hint">
              The account you signed in with.
            </p>
          </>
        ) : (
          <input id="email" name="email" type="email" inputMode="email" className="input" autoComplete="email" required {...field("email")} />
        )}
        {errorText("email")}
      </div>

      <div className="form-row">
        <div className="field">
          <label className="field-label" htmlFor="companyName">
            Company
          </label>
          <input id="companyName" name="companyName" className="input" autoComplete="organization" required {...field("companyName")} />
          {errorText("companyName")}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="companyWebsite">
            Company website <span className="font-normal text-[var(--color-muted)]">(optional)</span>
          </label>
          <input id="companyWebsite" name="companyWebsite" className="input" inputMode="url" {...field("companyWebsite")} />
          {errorText("companyWebsite")}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="message">
          What roles are you hiring for? <span className="font-normal text-[var(--color-muted)]">(optional)</span>
        </label>
        <textarea id="message" name="message" className="input" maxLength={1000} />
      </div>

      {state.status === "error" && (
        <div className="notice notice-error" role="alert">
          <p>{state.message}</p>
        </div>
      )}

      <div>
        <SubmitButton pendingLabel="Sending request">Request access</SubmitButton>
      </div>
    </form>
  );
}
