"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PortfolioPiece } from "@/lib/student";
import {
  MAX_FILE_BYTES,
  MAX_PORTFOLIO_FILES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  VIDEO_TYPES,
  formatBytes,
  formatDuration,
  isBlockedFile,
  storageSafeName,
  videoLink,
} from "@/lib/student-options";
import { uploadWithProgress } from "@/lib/upload";
import { addPortfolioFile, addPortfolioVideo, addPortfolioVideoLink, removePortfolioFile } from "./actions";
import { FileDrop } from "./file-drop";
import { PdfIcon } from "./resume-card";

const TOO_BIG_FOR_UPLOAD = "Upload it to YouTube as Unlisted and paste the link below instead.";

// Reads the video's length, and whether this browser can play it at all (a fair sign recruiters can).
function readVideo(file: File): Promise<{ seconds: number } | null> {
  return new Promise((resolve) => {
    const element = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (result: { seconds: number } | null) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };
    element.preload = "metadata";
    element.muted = true;
    element.onloadedmetadata = () => done(Number.isFinite(element.duration) ? { seconds: element.duration } : null);
    element.onerror = () => done(null);
    element.src = url;
  });
}

function videoType(file: File) {
  if (file.type in VIDEO_TYPES) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return Object.entries(VIDEO_TYPES).find(([, e]) => e === ext)?.[0] ?? null;
}

export function PortfolioCard({ userId, pieces }: { userId: string; pieces: PortfolioPiece[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [, startRemoving] = useTransition();
  const [linking, startLinking] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const full = pieces.length >= MAX_PORTFOLIO_FILES;
  const hasVideo = pieces.some((piece) => piece.kind !== "file");
  const busy = uploading || linking;

  function done(result: { error: string | null }) {
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function upload(file: File) {
    setError(null);
    const type = videoType(file);
    if (type || file.type.startsWith("video/")) return uploadVideo(file, type);

    if (isBlockedFile(file.name)) {
      return setError("That kind of file can't be shared. Use a PDF, document, slides, spreadsheet, image, archive or video.");
    }
    if (file.size > MAX_FILE_BYTES) return setError("That file is over 10 MB. Compress it or export a smaller version.");

    setUploading(true);
    const path = `${userId}/${crypto.randomUUID()}/${storageSafeName(file.name)}`;
    const { error: uploadError } = await createClient()
      .storage.from("portfolio")
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    const result = uploadError
      ? { error: "The upload didn't finish. Check your connection and try again." }
      : await addPortfolioFile(path, file.name);
    setUploading(false);
    done(result);
  }

  async function uploadVideo(file: File, type: string | null) {
    if (hasVideo) return setError("Your portfolio already has a video. Remove it to add a different one.");
    if (!type) return setError("Use an MP4, MOV or WebM video.");
    if (file.size > MAX_VIDEO_BYTES) return setError(`That video is over 100 MB. ${TOO_BIG_FOR_UPLOAD}`);
    const meta = await readVideo(file);
    if (!meta) return setError("This browser can't play that video, so recruiters may not be able to either. Export it as an MP4 and try again.");
    if (meta.seconds > MAX_VIDEO_SECONDS + 5) {
      return setError(`That video is ${formatDuration(meta.seconds)} long. Trim it to 3 minutes or shorter.`);
    }

    setUploading(true);
    setProgress(0);
    const path = `${userId}/video-${Date.now()}.${VIDEO_TYPES[type]}`;
    const { error: uploadError } = await uploadWithProgress("videos", path, file, type, setProgress);
    const result =
      uploadError === "too_large"
        ? { error: `That video is bigger than the server accepts. ${TOO_BIG_FOR_UPLOAD}` }
        : uploadError
          ? { error: "The upload didn't finish. Check your connection and try again." }
          : await addPortfolioVideo(path, file.name, meta.seconds);
    setUploading(false);
    setProgress(null);
    done(result);
  }

  function saveLink(formData: FormData) {
    setError(null);
    const value = String(formData.get("video_url") ?? "");
    if (!videoLink(value)) return setError("Paste a YouTube, Vimeo, Loom or Google Drive link to your video.");
    startLinking(async () => done(await addPortfolioVideoLink(value)));
  }

  function remove(id: string) {
    setError(null);
    setRemovingId(id);
    startRemoving(async () => {
      const result = await removePortfolioFile(id);
      setRemovingId(null);
      done(result);
    });
  }

  return (
    <section className="panel profile-section" aria-labelledby="portfolio-title">
      <div className="section-head">
        <h2 id="portfolio-title">Portfolio</h2>
        <p className="field-hint num">
          {pieces.length} of {MAX_PORTFOLIO_FILES}
        </p>
      </div>
      <p className="section-lede">
        Design reports, drawings, slide decks or test results, and if you like one short video of something you built. Partners
        see these beside your resume.
      </p>

      {pieces.length > 0 && (
        <ul className="file-list">
          {pieces.map((piece) => (
            <li key={piece.id} className="file-row">
              {piece.kind === "file" ? <PdfIcon /> : <VideoIcon />}
              <div className="file-row-text">
                <span className="cell-primary file-name">{piece.fileName}</span>
                <span className="cell-secondary num">{describe(piece)}</span>
              </div>
              <div className="row-actions">
                {piece.url && (
                  <a
                    className="btn btn-secondary"
                    href={piece.url}
                    {...(piece.kind === "file" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                  >
                    {piece.kind === "file" ? "Download" : "Watch"}
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={removingId !== null || busy}
                  aria-busy={removingId === piece.id || undefined}
                  aria-label={`Remove ${piece.fileName}`}
                  onClick={() => remove(piece.id)}
                >
                  {removingId === piece.id ? "Removing" : "Remove"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="field-hint">Your portfolio is full. Remove a piece to add another.</p>
      ) : (
        <>
          <FileDrop
            label="Add a file"
            busyLabel={progress === null ? "Uploading" : `Uploading ${Math.round(progress * 100)}%`}
            busy={uploading}
            hint={
              hasVideo
                ? "Any document, image or archive up to 10 MB. You can also drop it here."
                : "Any document, image or archive up to 10 MB, or a video up to 3 minutes. You can also drop it here."
            }
            onFile={upload}
          />
          {progress !== null && <progress className="upload-progress" max={1} value={progress} aria-label="Video upload progress" />}
          {!hasVideo && (
            <form action={saveLink} className="video-link-form">
              <label className="field-label" htmlFor="video_url">
                Or link a video
              </label>
              <div className="video-link-row">
                <input id="video_url" name="video_url" className="input" inputMode="url" aria-describedby="video_url-hint" disabled={busy} />
                <button type="submit" className="btn btn-secondary" disabled={busy} aria-busy={linking || undefined}>
                  {linking ? "Adding" : "Add link"}
                </button>
              </div>
              <p className="field-hint" id="video_url-hint">
                YouTube (Unlisted is fine), Vimeo, Loom or Google Drive. Keep it under 3 minutes.
              </p>
            </form>
          )}
        </>
      )}

      {error && (
        <div className="notice notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}

function describe(piece: PortfolioPiece) {
  if (piece.kind === "video_link") return piece.url.replace(/^https:\/\/(www\.)?/, "");
  if (piece.kind === "video") return piece.seconds ? `Video, ${formatDuration(piece.seconds)}` : "Video";
  return formatBytes(piece.sizeBytes);
}

export function VideoIcon() {
  return (
    <svg className="file-icon" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="7" width="24" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 12v8l6.5-4z" fill="currentColor" />
    </svg>
  );
}
