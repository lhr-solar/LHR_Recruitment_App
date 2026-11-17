import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadJob, recordJobEvent } from "@/lib/jobs";

// "Apply on the company's site": counts the click (once per student), then sends them there.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer || viewer.accountType !== "member" || viewer.status !== "active") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { id } = await params;
  // Students can only read open posts, so a closed or unknown one stops here.
  const job = await loadJob(id);
  if (!job || job.status !== "open") return new NextResponse("This post is closed.", { status: 404 });

  await recordJobEvent(job.id, viewer.id, "click");

  const response = NextResponse.redirect(job.applyUrl, 303);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
