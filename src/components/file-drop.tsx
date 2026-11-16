"use client";

import { useId, useRef, useState } from "react";

// A file picker that also takes a file dropped onto it.
export function FileDrop({
  label,
  hint,
  accept,
  busy,
  busyLabel,
  onFile,
}: {
  label: string;
  hint: string;
  accept?: string;
  busy: boolean;
  busyLabel: string;
  onFile: (file: File) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      className="file-drop"
      data-over={over || undefined}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files[0];
        if (file && !busy) onFile(file);
      }}
    >
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="visually-hidden"
        disabled={busy}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <label htmlFor={id} className="btn btn-secondary" aria-disabled={busy || undefined}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" />
            {busyLabel}
          </>
        ) : (
          label
        )}
      </label>
      <p className="field-hint" id={`${id}-hint`}>
        {hint}
      </p>
    </div>
  );
}
