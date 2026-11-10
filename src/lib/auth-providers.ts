import "server-only";
import { cache } from "react";
import { publicEnv } from "@/lib/env";

// Supabase answers a disabled provider with a raw JSON error page, so the
// Google button only shows when the project has Google turned on.
// If the check itself fails, the button stays: it's the main way in.
export const googleSignInEnabled = cache(async (): Promise<boolean> => {
  try {
    const response = await fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabaseKey },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return true;
    const settings = (await response.json()) as { external?: Record<string, boolean> };
    return settings.external?.google !== false;
  } catch {
    return true;
  }
});
