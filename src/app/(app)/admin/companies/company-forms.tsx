"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { MAX_DESCRIPTION } from "@/lib/partner-options";
import { addTier, createCompany, invitePartner, renameTier, updateCompany, type FormResult } from "./actions";

type Tier = { id: string; name: string };

// Submitting by hand keeps what was typed when a save fails (a form action would reset the form).
function useSubmit(action: (prev: FormResult, formData: FormData) => Promise<FormResult>, resetOnSave = false) {
  const [state, setState] = useState<FormResult>({ status: "idle" });
  const [pending, start] = useTransition();
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    start(async () => {
      const result = await action(state, formData);
      if (resetOnSave && result.status === "saved") form.reset();
      setState(result);
    });
  }
  const errors = state.fieldErrors ?? {};
  const invalid = (name: string) => (errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` } : {});
  const error = (name: string) =>
    errors[name] && (
      <p className="field-error" id={`${name}-error`}>
        {errors[name]}
      </p>
    );
  return { state, pending, onSubmit, invalid, error };
}

function TierSelect({ tiers, value }: { tiers: Tier[]; value: string | null }) {
  return (
    <select id="tier" name="tier" className="input" defaultValue={value ?? ""}>
      <option value="">No tier</option>
      {tiers.map((tier) => (
        <option key={tier.id} value={tier.id}>
          {tier.name}
        </option>
      ))}
    </select>
  );
}

export function NewCompanyForm({ tiers }: { tiers: Tier[] }) {
  const { state, pending, onSubmit, invalid, error } = useSubmit(createCompany);
  return (
    <form onSubmit={onSubmit} className="inline-form" noValidate>
      <div className="field">
        <label className="field-label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" className="input" maxLength={160} placeholder="Acme Motorsport" {...invalid("name")} />
        {error("name")}
      </div>
      <div className="field">
        <label className="field-label" htmlFor="website">
          Website <span className="field-optional">(optional)</span>
        </label>
        <input id="website" name="website" className="input" inputMode="url" placeholder="acme.com" {...invalid("website")} />
        {error("website")}
      </div>
      <div className="field">
        <label className="field-label" htmlFor="tier">
          Tier
        </label>
        <TierSelect tiers={tiers} value={null} />
      </div>
      <SubmitButton pendingLabel="Adding" busy={pending}>
        Add company
      </SubmitButton>
      {state.message && (
        <p className="field-error inline-form-message" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

type Company = { id: string; name: string; website: string | null; description: string | null; tierId: string | null; active: boolean };

export function CompanyForm({ company, tiers }: { company: Company; tiers: Tier[] }) {
  const { state, pending, onSubmit, invalid, error } = useSubmit(updateCompany);
  return (
    <form onSubmit={onSubmit} className="profile-section-body" noValidate>
      <input type="hidden" name="id" value={company.id} />
      <div className="form-row">
        <div className="field">
          <label className="field-label" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" className="input" maxLength={160} defaultValue={company.name} {...invalid("name")} />
          {error("name")}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="tier">
            Tier
          </label>
          <TierSelect tiers={tiers} value={company.tierId} />
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="website">
          Website <span className="field-optional">(optional)</span>
        </label>
        <input id="website" name="website" className="input" inputMode="url" defaultValue={company.website ?? ""} {...invalid("website")} />
        {error("website")}
      </div>
      <div className="field">
        <label className="field-label" htmlFor="description">
          Description <span className="field-optional">(recruiters usually write this)</span>
        </label>
        <textarea id="description" name="description" className="input" rows={4} maxLength={MAX_DESCRIPTION} defaultValue={company.description ?? ""} {...invalid("description")} />
        {error("description")}
      </div>
      <label className="check">
        <input type="checkbox" name="active" defaultChecked={company.active} />
        Active: recruiters can sign in, and its posts and logo are shown
      </label>
      <p className="field-hint">Turning this off locks the company&apos;s recruiters out and closes its open posts.</p>
      <div className="member-form-foot">
        <p role="status" className={state.status === "error" ? "field-error" : "field-hint"}>
          {state.status === "error" ? state.message : state.status === "saved" ? "Saved." : ""}
        </p>
        <SubmitButton pendingLabel="Saving" busy={pending}>
          Save
        </SubmitButton>
      </div>
    </form>
  );
}

export function InviteForm({ companyId }: { companyId: string }) {
  const { state, pending, onSubmit } = useSubmit(invitePartner, true);
  return (
    <form onSubmit={onSubmit} className="invite-form" noValidate>
      <input type="hidden" name="companyId" value={companyId} />
      <label className="visually-hidden" htmlFor="invite-email">
        Recruiter&apos;s email
      </label>
      <input id="invite-email" name="email" type="email" className="input" placeholder="recruiter@acme.com" autoComplete="off" />
      <SubmitButton pendingLabel="Inviting" busy={pending}>
        Invite
      </SubmitButton>
      {state.message && (
        <p className={state.status === "error" ? "field-error" : "field-hint invite-done"} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function AddTierForm() {
  const { state, pending, onSubmit } = useSubmit(addTier, true);
  return (
    <form onSubmit={onSubmit} className="invite-form" noValidate>
      <label className="visually-hidden" htmlFor="tier-name">
        New tier name
      </label>
      <input id="tier-name" name="name" className="input" maxLength={40} placeholder="New tier, like Platinum" />
      <SubmitButton variant="secondary" pendingLabel="Adding" busy={pending}>
        Add tier
      </SubmitButton>
      {state.status === "error" && (
        <p className="field-error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function TierName({ tier }: { tier: Tier }) {
  const { state, pending, onSubmit } = useSubmit(renameTier);
  return (
    <form onSubmit={onSubmit} className="tier-name" noValidate>
      <input type="hidden" name="tierId" value={tier.id} />
      <label className="visually-hidden" htmlFor={`tier-${tier.id}`}>
        Tier name
      </label>
      <input id={`tier-${tier.id}`} name="name" className="input" maxLength={40} defaultValue={tier.name} />
      <SubmitButton variant="secondary" pendingLabel="Saving" busy={pending}>
        Rename
      </SubmitButton>
      {state.status === "error" && (
        <p className="field-error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
