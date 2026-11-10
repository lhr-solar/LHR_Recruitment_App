import type { NextRequest } from "next/server";

// The origin the browser used. request.nextUrl reports the server's bind address instead
// (http://0.0.0.0:3000 inside a container), so redirects are built from the Host header.
// Forwarding headers are ignored: a client could set them to send the redirect elsewhere.
export function requestOrigin(request: NextRequest): string {
  const host = request.headers.get("host");
  return host ? `${request.nextUrl.protocol}//${host}` : request.nextUrl.origin;
}
