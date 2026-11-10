"use client";

import { useFormStatus } from "react-dom";
import { setVisibility } from "./actions";

export function VisibilitySwitch({ visible }: { visible: boolean }) {
  return (
    <form action={setVisibility}>
      <input type="hidden" name="visible" value={visible ? "false" : "true"} />
      <SwitchButton on={visible} />
    </form>
  );
}

function SwitchButton({ on }: { on: boolean }) {
  const { pending } = useFormStatus();
  // While saving, show where the switch is heading.
  const shown = pending ? !on : on;
  return (
    <button type="submit" role="switch" aria-checked={shown} className="switch" disabled={pending}>
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      <span className="switch-label">Show my profile to Partners</span>
    </button>
  );
}
