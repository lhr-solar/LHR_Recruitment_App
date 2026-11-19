import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { openStudentFile } from "@/lib/resume-book";

// A portfolio file download, logged like a resume. ?view=3d opens a model's preview mesh instead.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const viewer = await getViewer();
  if (!viewer || viewer.accountType !== "partner" || viewer.status !== "active") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { id, fileId } = await params;
  const view = request.nextUrl.searchParams.get("view") === "3d";
  const url = await openStudentFile({ userId: viewer.id }, id, view ? "portfolio_view" : "portfolio_download", fileId);
  if (!url) return new NextResponse("This file isn't available.", { status: 404 });

  const response = NextResponse.redirect(url, 303);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
