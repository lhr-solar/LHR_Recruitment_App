"use client";

import { useEffect, useState, useTransition } from "react";
import { recordJobView, setApplied } from "../actions";

// Counts the view once the post is actually on screen.
export function TrackView({ jobId }: { jobId: string }) {
  useEffect(() => {
    void recordJobView(jobId);
  }, [jobId]);
  return null;
}

export function AppliedToggle({ jobId, applied, company }: { jobId: string; applied: boolean; company: string }) {
  const [on, setOn] = useState(applied);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !on;
    setError(null);
    setOn(next);
    start(async () => {
      const result = await setApplied(jobId, next);
      if (result.error) {
        setOn(!next);
        setError(result.error);
      }
    });
  }

  return (
    <section className="panel pv-section applied" aria-labelledby="applied-title">
      <h2 id="applied-title">Applied?</h2>
      <p className="field-hint">
        Once you&apos;ve applied on their site, mark it here. {company} sees your profile on their applicant list, even if
        it&apos;s hidden from the student directory.
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-busy={pending || undefined}
        disabled={pending}
        className="switch"
        onClick={toggle}
      >
        <span className="switch-track" aria-hidden="true">
          <span className="switch-thumb" />
        </span>
        <span className="switch-label">I applied</span>
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
