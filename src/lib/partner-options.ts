import { publicEnv } from "@/lib/env";

// Company page choices, shared by the logo uploader and its server action.

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
// What the partner-logos bucket accepts, and the extension each is stored under.
export const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export const MAX_DESCRIPTION = 1000;

// partner-logos is a public bucket: logos appear wherever the company does.
export function logoUrl(path: string | null) {
  return path ? `${publicEnv.supabaseUrl}/storage/v1/object/public/partner-logos/${path.split("/").map(encodeURIComponent).join("/")}` : null;
}
