import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|photos/|vendor/|workers/|icon.svg|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
