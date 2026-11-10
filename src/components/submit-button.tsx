"use client";

import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger";
  block?: boolean;
  name?: string;
  value?: string;
  // For forms submitted by hand (no form action), which useFormStatus can't see.
  busy?: boolean;
};

// A form's submit button that shows its own pending state.
export function SubmitButton({ children, pendingLabel, variant = "primary", block, name, value, busy: busyProp }: Props) {
  const status = useFormStatus();
  const pending = busyProp ?? status.pending;
  // When a form has several submit buttons, only the one that was pressed shows the pending label.
  const isThisButton = busyProp !== undefined || !name || status.data?.get(name) === value;
  const busy = pending && isThisButton;

  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={`btn btn-${variant}${block ? " btn-block" : ""}`}
      disabled={pending}
      aria-busy={busy}
    >
      {busy ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
