"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAX_PHOTO_BYTES, PHOTO_SIZE } from "@/lib/student-options";
import { removePhoto, savePhoto } from "./actions";
import { FileDrop } from "./file-drop";

// Crops to a centred square and re-encodes as JPEG: small files, upright, no location data.
async function squarePhoto(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(PHOTO_SIZE, side);
    canvas
      .getContext("2d")
      ?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  } catch {
    return null;
  }
}

export function PhotoCard({ userId, name, photoUrl }: { userId: string; name: string; photoUrl: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [removing, startRemoving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Choose a photo: a JPG, PNG or HEIC from your phone.");
    if (file.size > 25 * 1024 * 1024) return setError("That photo is over 25 MB. Try a smaller one.");

    setBusy(true);
    const blob = await squarePhoto(file);
    if (!blob || blob.size > MAX_PHOTO_BYTES) {
      setBusy(false);
      return setError("This browser can't read that photo. Try a JPG or PNG.");
    }
    const path = `${userId}/photo-${Date.now()}.jpg`;
    const { error: uploadError } = await createClient()
      .storage.from("photos")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    const result = uploadError ? { error: "The upload didn't finish. Check your connection and try again." } : await savePhoto(path);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <section className="panel profile-section" aria-labelledby="photo-title">
      <div className="section-head">
        <h2 id="photo-title">Photo</h2>
        <p className="field-hint">Optional</p>
      </div>
      <div className="photo-row">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL
          <img className="photo-preview" src={photoUrl} alt="Your profile photo" width={88} height={88} />
        ) : (
          <span className="photo-preview photo-empty" aria-hidden="true">
            {initials(name)}
          </span>
        )}
        <div className="photo-controls">
          <FileDrop
            label={photoUrl ? "Change photo" : "Add a photo"}
            busyLabel="Uploading"
            busy={busy}
            accept="image/*"
            hint="A clear headshot works best. We crop it to a square."
            onFile={upload}
          />
          {photoUrl && (
            <button
              type="button"
              className="btn btn-quiet"
              disabled={removing || busy}
              onClick={() =>
                startRemoving(async () => {
                  const result = await removePhoto();
                  if (result.error) setError(result.error);
                  else router.refresh();
                })
              }
            >
              {removing ? "Removing" : "Remove photo"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="notice notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}

function initials(name: string) {
  if (name.includes("@")) return name[0].toUpperCase();
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
