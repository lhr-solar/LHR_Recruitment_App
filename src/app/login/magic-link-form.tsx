"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect } from "react";
import { sendMagicLink, type MagicLinkState } from "./actions";
import { SubmitButton } from "@/components/submit-button";

// The link button is secondary beside Google, and primary when it's the only way in.
export function MagicLinkForm({ door, label, primary = false }: { door: "member" | "partner"; label: string; primary?: boolean }) {
  const [state, formAction] = useActionState<MagicLinkState, FormData>(sendMagicLink, { status: "idle" });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // A fresh link supersedes whatever went wrong with the last one, so its error goes away.
  useEffect(() => {
    if (state.status !== "sent" || !searchParams.has("error")) return;
    const params = new URLSearchParams(searchParams);
    params.delete("error");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [state.status, searchParams, pathname, router]);

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
      <SubmitButton variant={primary ? "primary" : "secondary"} pendingLabel="Sending link" block>
        Email me a sign-in link
      </SubmitButton>
    </form>
  );
}
