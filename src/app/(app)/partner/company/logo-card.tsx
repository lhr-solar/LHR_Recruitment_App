"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FileDrop } from "@/components/file-drop";
import { LOGO_TYPES, MAX_LOGO_BYTES } from "@/lib/partner-options";
import { createClient } from "@/lib/supabase/client";
import { removeLogo, saveLogo } from "./actions";

export function LogoCard({ companyId, name, url }: { companyId: string; name: string; url: string | null }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [removing, startRemoving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    const extension = LOGO_TYPES[file.type];
    if (!extension) {
      setError("Upload the logo as a PNG, JPG, WebP or SVG.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("That logo is over 2 MB. Export a smaller version and try again.");
      return;
    }

    setUploading(true);
    const path = `${companyId}/logo-${Date.now()}.${extension}`;
    const { error: uploadError } = await createClient()
      .storage.from("partner-logos")
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    const result = uploadError ? { error: "The upload didn't finish. Check your connection and try again." } : await saveLogo(path);
    setUploading(false);

    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <section className="panel profile-section" aria-labelledby="logo-title">
      <h2 id="logo-title">Logo</h2>
      <div className="logo-row">
        <div className="logo-frame">
          {url ? (
            // A public Storage URL; plain img so SVG logos work without the image proxy.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={`${name} logo`} />
          ) : (
            <span className="logo-empty">No logo yet</span>
          )}
        </div>
        <div className="photo-controls">
          <FileDrop
            label={url ? "Replace logo" : "Upload a logo"}
            busyLabel="Uploading"
            busy={uploading}
            accept={Object.keys(LOGO_TYPES).join(",")}
            hint="PNG, JPG, WebP or SVG, up to 2 MB. A wide logo on a transparent background works best."
            onFile={upload}
          />
          {url && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={removing || uploading}
              aria-busy={removing || undefined}
              onClick={() =>
                startRemoving(async () => {
                  const result = await removeLogo();
                  if (result.error) setError(result.error);
                  else router.refresh();
                })
              }
            >
              {removing ? "Removing" : "Remove logo"}
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
