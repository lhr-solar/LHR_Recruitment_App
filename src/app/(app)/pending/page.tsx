import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PartnerRequestForm } from "@/components/partner-request-form";
import { homeFor, requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Partner access" };

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function PendingPartnerPage() {
  const viewer = await requireViewer();
  if (viewer.accountType !== "partner" || viewer.status === "active") redirect(homeFor(viewer));

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("partner_access_requests")
    .select("company_name, status, created_at")
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const request = requests?.[0];

  if (request?.status === "declined" || viewer.status === "rejected") {
    return (
      <div className="narrow">
        <header className="page-head">
          <h1>We couldn&apos;t set up Partner access</h1>
          <p>
            Your request for {request?.company_name ?? "your company"} wasn&apos;t approved. If your company partners
            with Longhorn Racing, ask your contact on the team to reach out to our officers.
          </p>
        </header>
      </div>
    );
  }

  if (request?.status === "pending") {
    return (
      <div className="narrow">
        <header className="page-head">
          <h1>We&apos;re reviewing your request</h1>
          <p>
            You asked for Partner access for {request.company_name} on {dateFormat.format(new Date(request.created_at))}.
            An LHR officer will confirm it, and we&apos;ll email {viewer.email} when you can sign in.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="narrow">
      <header className="page-head">
        <h1>Request Partner access</h1>
        <p>
          {viewer.email} isn&apos;t linked to a Partner company yet. Tell us who you work for and an LHR officer will set
          up your account.
        </p>
      </header>
      <PartnerRequestForm lockedEmail={viewer.email} defaultName={viewer.fullName ?? ""} />
    </div>
  );
}
