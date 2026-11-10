import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

// Bypasses row-level security. Only for server code that has already checked the caller,
// such as signing resume download URLs after logging the access.
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing environment variable SUPABASE_SECRET_KEY.");
  }
  return createClient(publicEnv.supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
