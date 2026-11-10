"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAX_FILE_BYTES } from "@/lib/student-options";
import { removeResume, saveResume } from "./actions";
import { FileDrop } from "./file-drop";

export function ResumeCard({ userId, url, updated }: { userId: string; url: string | null; updated: string | null }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [removing, startRemoving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Your resume has to be a PDF. Export it as a PDF and try again.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That PDF is over 10 MB. Export it at a smaller size and try again.");
      return;
    }

    setUploading(true);
    const path = `${userId}/resume-${Date.now()}.pdf`;
    const { error: uploadError } = await createClient()
      .storage.from("resumes")
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    const result = uploadError ? { error: "The upload didn't finish. Check your connection and try again." } : await saveResume(path);
    setUploading(false);

    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <section className="panel profile-section" aria-labelledby="resume-title">
      <div className="section-head">
        <h2 id="resume-title">Resume</h2>
        {updated && <p className="field-hint">Updated {updated}</p>}
      </div>

      {url ? (
        <div className="file-row">
          <PdfIcon />
          <div className="file-row-text">
            <span className="cell-primary">Your resume</span>
            <span className="cell-secondary">PDF. Partners can view and download it.</span>
          </div>
          <div className="row-actions">
            <a className="btn btn-secondary" href={url} target="_blank" rel="noopener noreferrer">
              View
            </a>
            <button
              type="button"
              className="btn btn-danger"
              disabled={removing || uploading}
              aria-busy={removing || undefined}
              onClick={() =>
                startRemoving(async () => {
                  const result = await removeResume();
                  if (result.error) setError(result.error);
                  else router.refresh();
                })
              }
            >
              {removing ? "Removing" : "Remove"}
            </button>
          </div>
        </div>
      ) : null}

      <FileDrop
        label={url ? "Replace resume" : "Upload your resume"}
        busyLabel="Uploading"
        busy={uploading}
        accept="application/pdf,.pdf"
        hint={url ? "Upload a new PDF to replace this one." : "A PDF, up to 10 MB. You can also drop it here."}
        onFile={upload}
      />

      {error && (
        <div className="notice notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}

export function PdfIcon() {
  return (
    <svg className="file-icon" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8 3h11l7 7v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19 3v7h7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 17h10M11 21h10M11 25h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
