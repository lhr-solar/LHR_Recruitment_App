"use client";

import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export type UploadError = "too_large" | "wrong_type" | "failed";

// Uploads straight to Supabase Storage as the signed-in student (storage policies still apply),
// reporting progress, which supabase-js's upload() can't do.
export async function uploadWithProgress(
  bucket: string,
  path: string,
  body: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
): Promise<{ error: UploadError | null }> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (!session) return { error: "failed" };

  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${publicEnv.supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`);
    xhr.setRequestHeader("authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", publicEnv.supabaseKey);
    xhr.setRequestHeader("content-type", contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ error: null });
      const text = xhr.responseText.toLowerCase();
      if (xhr.status === 413 || text.includes("exceeded the maximum") || text.includes("too large")) return resolve({ error: "too_large" });
      if (text.includes("mime type")) return resolve({ error: "wrong_type" });
      resolve({ error: "failed" });
    };
    xhr.onerror = () => resolve({ error: "failed" });
    xhr.send(body);
  });
}
