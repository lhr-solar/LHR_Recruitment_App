import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { homeFor, requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Account paused" };

export default async function AccountPage() {
  const viewer = await requireViewer();
  if (viewer.status !== "suspended" && !viewer.companyPaused) redirect(homeFor(viewer));

  return (
    <div className="narrow">
      <header className="page-head">
        {viewer.status === "suspended" ? (
          <>
            <h1>Your account is paused</h1>
            <p>An LHR admin paused access for {viewer.email}. Contact the Longhorn Racing officers to restore it.</p>
          </>
        ) : (
          <>
            <h1>Your company&apos;s access is paused</h1>
            <p>Longhorn Racing has paused LHR Careers access for your company, so the resume book and your job posts are unavailable for now. Contact your Longhorn Racing corporate relations lead to restore it.</p>
          </>
        )}
      </header>
    </div>
  );
}
