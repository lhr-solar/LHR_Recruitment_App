import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { openStudentFile } from "@/lib/resume-book";

// Every resume a Partner opens comes through here: the frame on a student's page, "Open in a new
// tab", and "Download resume" (?download=1). Each is logged, then sent to a short-lived signed URL.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer || viewer.accountType !== "partner" || viewer.status !== "active") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { id } = await params;
  const download = request.nextUrl.searchParams.get("download") === "1";
  const url = await openStudentFile({ userId: viewer.id }, id, download ? "resume_download" : "resume_view");
  if (!url) return new NextResponse("This resume isn't available.", { status: 404 });

  const response = NextResponse.redirect(url, 303);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
