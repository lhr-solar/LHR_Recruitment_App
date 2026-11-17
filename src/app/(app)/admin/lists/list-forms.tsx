"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { addSkill, addSubsystem, type ListResult } from "./actions";

// Submitting by hand keeps what was typed when an add fails; a success clears the name.
function useAdd(action: (prev: ListResult, formData: FormData) => Promise<ListResult>) {
  const [state, setState] = useState<ListResult>({ status: "idle" });
  const [pending, start] = useTransition();
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    start(async () => {
      const result = await action(state, formData);
      const name = form.elements.namedItem("name");
      if (result.status === "saved" && name instanceof HTMLInputElement) name.value = "";
      setState(result);
    });
  }
  return { state, pending, onSubmit };
}

export function AddSkillForm({ categories }: { categories: string[] }) {
  const { state, pending, onSubmit } = useAdd(addSkill);
  return (
    <form onSubmit={onSubmit} className="inline-form inline-form-two" noValidate>
      <div className="field">
        <label className="field-label" htmlFor="skill-name">
          Skill
        </label>
        <input id="skill-name" name="name" className="input" maxLength={60} placeholder="LabVIEW" />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="skill-category">
          Group
        </label>
        <input id="skill-category" name="category" className="input" maxLength={60} list="skill-categories" placeholder="Pick or type a new one" />
        <datalist id="skill-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <SubmitButton variant="secondary" pendingLabel="Adding" busy={pending}>
        Add skill
      </SubmitButton>
      {state.message && (
        <p className={`inline-form-message ${state.status === "error" ? "field-error" : "field-hint"}`} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function AddSubsystemForm({ team, teamName }: { team: string; teamName: string }) {
  const { state, pending, onSubmit } = useAdd(addSubsystem);
  return (
    <form onSubmit={onSubmit} className="invite-form" noValidate>
      <input type="hidden" name="team" value={team} />
      <label className="visually-hidden" htmlFor={`subsystem-${team}`}>
        New {teamName} subsystem
      </label>
      <input id={`subsystem-${team}`} name="name" className="input" maxLength={60} placeholder="New subsystem" />
      <SubmitButton variant="secondary" pendingLabel="Adding" busy={pending}>
        Add
      </SubmitButton>
      {state.status === "error" && (
        <p className="field-error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
