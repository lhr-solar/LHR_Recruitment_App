import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { homeFor, requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Account paused" };

export default async function AccountPage() {
  const viewer = await requireViewer();
  if (viewer.status !== "suspended") redirect(homeFor(viewer));

  return (
    <div className="narrow">
      <header className="page-head">
        <h1>Your account is paused</h1>
        <p>An LHR admin paused access for {viewer.email}. Contact the Longhorn Racing officers to restore it.</p>
      </header>
    </div>
  );
}
