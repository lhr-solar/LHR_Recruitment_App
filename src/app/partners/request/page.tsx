import type { Metadata } from "next";
import Link from "next/link";
import { Lockup } from "@/components/lockup";
import { PartnerRequestForm } from "@/components/partner-request-form";

export const metadata: Metadata = { title: "Request Partner access" };

export default function PartnerRequestPage() {
  return (
    <div className="standalone">
      <header className="standalone-bar">
        <Link href="/login" className="signin-lockup" aria-label="Longhorn Racing Recruitment">
          <Lockup height={44} />
        </Link>
      </header>
      <main className="standalone-main narrow">
        <header className="page-head">
          <h1>Request Partner access</h1>
          <p>
            Recruiters from Longhorn Racing partner companies can browse student profiles and post jobs here. Tell us who
            you are and an LHR officer will set up your account.
          </p>
        </header>
        <PartnerRequestForm />
        <p className="door-note mt-[var(--space-lg)]">
          Already have access?{" "}
          <Link href="/login?door=partner" className="link">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
