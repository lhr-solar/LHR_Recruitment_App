"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PortfolioPiece } from "@/lib/student";
import { makeModelPreview } from "@/lib/model-preview";
import {
  MAX_FILE_BYTES,
  MAX_MODEL_BYTES,
  MAX_MODEL_PREVIEW_BYTES,
  MAX_PORTFOLIO_FILES,
  MAX_STEP_PREVIEW_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  MODEL_PREVIEW_NAME,
  VIDEO_TYPES,
  type ModelFormat,
  formatBytes,
  formatDuration,
  isBlockedFile,
  isOtherModelFile,
  modelFormat,
  storageSafeName,
  videoLink,
} from "@/lib/student-options";
import { uploadWithProgress } from "@/lib/upload";
import { addPortfolioFile, addPortfolioVideo, addPortfolioVideoLink, removePortfolioFile } from "./actions";
import { FileDrop } from "@/components/file-drop";
import { ModelPreviewButton } from "@/components/model-preview-button";
import { PdfIcon } from "./resume-card";

const TOO_BIG_FOR_UPLOAD = "Upload it to YouTube as Unlisted and paste the link below instead.";
const NO_PREVIEW =
  "Uploaded, but it's too detailed to preview in a browser, so Partners can download it but not turn it around. For a 3D view, export just the part or subassembly you want to show (for a board, leave out the small components) or save it as STL.";

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
  const [preparing, setPreparing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [, startRemoving] = useTransition();
  const [linking, startLinking] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const full = pieces.length >= MAX_PORTFOLIO_FILES;
  const hasVideo = pieces.some((piece) => piece.kind !== "file");
  const busy = uploading || linking;

  function done(result: { error: string | null }) {
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function upload(file: File) {
    setError(null);
    setNote(null);
    const type = videoType(file);
    if (type || file.type.startsWith("video/")) return uploadVideo(file, type);
    const format = modelFormat(file.name);
    if (format) return uploadModel(file, format);
    if (isOtherModelFile(file.name)) {
      return setError("Export your model as STEP or STL first. Partners can't open other CAD formats in the browser.");
    }

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

  // The browser makes the 3D preview first. A model too detailed to preview still uploads, as a
  // download; one that isn't a readable STEP or STL doesn't.
  async function uploadModel(file: File, format: ModelFormat) {
    if (file.size > MAX_MODEL_BYTES) {
      return setError("That model is over 250 MB. Export just the part or subassembly you want to show, or save it as STL.");
    }

    setUploading(true);
    let preview: ArrayBuffer | null = null;
    if (format === "stl" || file.size <= MAX_STEP_PREVIEW_BYTES) {
      setPreparing(true);
      const made = await makeModelPreview(file, format);
      setPreparing(false);
      if ("error" in made && made.error === "unreadable") {
        setUploading(false);
        return setError(`We couldn't read that ${format === "step" ? "STEP" : "STL"} file. Export it again and retry.`);
      }
      if ("preview" in made && made.preview.byteLength <= MAX_MODEL_PREVIEW_BYTES) preview = made.preview;
    }

    const folder = `${userId}/${crypto.randomUUID()}`;
    const path = `${folder}/${storageSafeName(file.name)}`;
    const previewPath = preview ? `${folder}/${MODEL_PREVIEW_NAME}` : undefined;
    const storage = createClient().storage.from("portfolio");
    const previewError = preview && previewPath
      ? (await storage.upload(previewPath, preview, { contentType: "application/octet-stream", upsert: false })).error
      : null;
    setProgress(0);
    const { error: uploadError } = previewError
      ? { error: "failed" }
      : await uploadWithProgress("portfolio", path, file, format === "step" ? "model/step" : "model/stl", setProgress);
    let result: { error: string | null };
    if (previewError || uploadError) {
      if (previewPath) await storage.remove([previewPath]);
      result = {
        error:
          uploadError === "too_large"
            ? "That model is bigger than the server accepts right now. Export just the part you want to show, or save it as STL."
            : "The upload didn't finish. Check your connection and try again.",
      };
    } else {
      result = await addPortfolioFile(path, file.name, previewPath);
    }
    setUploading(false);
    setProgress(null);
    done(result);
    if (!result.error && !preview) setNote(NO_PREVIEW);
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
    setNote(null);
    const value = String(formData.get("video_url") ?? "");
    if (!videoLink(value)) return setError("Paste a YouTube, Vimeo, Loom or Google Drive link to your video.");
    startLinking(async () => done(await addPortfolioVideoLink(value)));
  }

  function remove(id: string) {
    setError(null);
    setNote(null);
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
        Design reports, drawings, slide decks, test results or a 3D model, and if you like one short video of something you
        built. Partners see these beside your resume, and can turn your models around in the browser.
      </p>

      {pieces.length > 0 && (
        <ul className="file-list">
          {pieces.map((piece) => (
            <li key={piece.id} className="file-row">
              {piece.kind !== "file" ? <VideoIcon /> : piece.previewUrl ? <ModelIcon /> : <PdfIcon />}
              <div className="file-row-text">
                <span className="cell-primary file-name">{piece.fileName}</span>
                <span className="cell-secondary num">{describe(piece)}</span>
              </div>
              <div className="row-actions">
                {piece.kind === "file" && piece.previewUrl && <ModelPreviewButton url={piece.previewUrl} fileName={piece.fileName} />}
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
            busyLabel={preparing ? "Preparing 3D preview" : progress === null ? "Uploading" : `Uploading ${Math.round(progress * 100)}%`}
            busy={uploading}
            hint={
              preparing
                ? "Building the 3D view Partners will see. Large models can take a minute or two; keep this tab open."
                : hasVideo
                  ? "Any document, image or archive up to 10 MB, or a STEP or STL model up to 250 MB. You can also drop it here."
                  : "Any document, image or archive up to 10 MB, a STEP or STL model up to 250 MB, or a video up to 3 minutes. You can also drop it here."
            }
            onFile={upload}
          />
          {progress !== null && <progress className="upload-progress" max={1} value={progress} aria-label="Upload progress" />}
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
      {note && !error && (
        <div className="notice notice-pending" role="status">
          <p>{note}</p>
        </div>
      )}
    </section>
  );
}

function describe(piece: PortfolioPiece) {
  if (piece.kind === "video_link") return piece.url.replace(/^https:\/\/(www\.)?/, "");
  if (piece.kind === "video") return piece.seconds ? `Video, ${formatDuration(piece.seconds)}` : "Video";
  if (modelFormat(piece.fileName) && !piece.previewUrl) return `${formatBytes(piece.sizeBytes)}, download only (too detailed to preview)`;
  return formatBytes(piece.sizeBytes);
}

function ModelIcon() {
  return (
    <svg className="file-icon" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 4 27 10v12l-11 6-11-6V10Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 10l11 6 11-6M16 16v12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function VideoIcon() {
  return (
    <svg className="file-icon" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="7" width="24" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 12v8l6.5-4z" fill="currentColor" />
    </svg>
  );
}
