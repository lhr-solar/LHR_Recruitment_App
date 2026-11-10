import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleIcon } from "@/components/google-icon";
import { Lockup } from "@/components/lockup";
import { getViewer, homeFor } from "@/lib/auth";
import { googleSignInEnabled } from "@/lib/auth-providers";
import { SIGN_IN_PHOTOS, firstPhotoIndex } from "@/lib/photos";
import { signInWithGoogle } from "./actions";
import { MagicLinkForm } from "./magic-link-form";
import { SignInPhotos } from "./sign-in-photos";

export const metadata: Metadata = { title: "Sign in" };

// Local testing has no Google credentials, so members can get an emailed link there instead.
const memberEmailSignIn = process.env.NEXT_PUBLIC_MEMBER_EMAIL_SIGNIN === "true";

const ERRORS: Record<string, string> = {
  not_utexas:
    "That Google account isn't a UT account. LHR members sign in with their @utexas.edu account. Recruiters, use the Partner tab.",
  is_member: "That email belongs to an LHR member. Use the LHR member tab to sign in.",
  link_expired: "That sign-in link has expired or was already used. Ask for a new one below.",
  google_unavailable: "Google sign-in isn't available right now. Try again in a minute.",
  claim_failed: "We couldn't finish signing you in. Try again, and tell an LHR officer if it keeps happening.",
  missing_code: "Sign-in was interrupted before it finished. Try again.",
  unclaimed: "Choose whether you're an LHR member or a Partner, then sign in.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const door = params.door === "partner" ? "partner" : "member";
  const errorKey = typeof params.error === "string" ? params.error : null;
  const next = typeof params.next === "string" ? params.next : "";

  const viewer = await getViewer();
  if (viewer && viewer.accountType && !errorKey) redirect(homeFor(viewer));

  const google = await googleSignInEnabled();
  const error = errorKey ? (ERRORS[errorKey] ?? ERRORS.claim_failed) : null;

  return (
    <main className="signin">
      <SignInPhotos photos={SIGN_IN_PHOTOS} start={firstPhotoIndex()} />

      <section className="signin-panel" aria-labelledby="signin-title">
        <Link href="/login" className="signin-lockup" aria-label="LHR Careers">
          <Lockup height={52} />
        </Link>

        <div className="signin-body">
          <h1 id="signin-title">Sign in</h1>
          <p className="signin-lede">Partners of Longhorn Racing meet engineers from our Solar, Electric and Combustion teams here.</p>

          <nav className="door-switch" aria-label="Who is signing in">
            <Link
              href={{ pathname: "/login", query: next ? { next } : {} }}
              aria-current={door === "member" ? "page" : undefined}
              className="door-option"
              replace
            >
              LHR member
            </Link>
            <Link
              href={{ pathname: "/login", query: next ? { door: "partner", next } : { door: "partner" } }}
              aria-current={door === "partner" ? "page" : undefined}
              className="door-option"
              replace
            >
              Partner
            </Link>
          </nav>

          {error && (
            <div className="notice notice-error" role="alert">
              <p>{error}</p>
            </div>
          )}

          {door === "member" ? (
            <div className="door-panel">
              {google && (
                <>
                  <p className="door-copy">Use your UT Google account, the one ending in @utexas.edu.</p>
                  <GoogleButton door="member" next={next} />
                </>
              )}
              {memberEmailSignIn && (
                <>
                  {google ? (
                    <p className="door-divider">
                      <span>or get a link at your UT email (local testing)</span>
                    </p>
                  ) : (
                    <p className="door-copy">We&apos;ll email a sign-in link to your @utexas.edu address.</p>
                  )}
                  <MagicLinkForm door="member" label="UT email" primary={!google} />
                </>
              )}
              {!google && !memberEmailSignIn && (
                <div className="notice notice-error" role="alert">
                  <p>Member sign-in isn&apos;t turned on yet. Tell an LHR officer.</p>
                </div>
              )}
              <p className="door-note">Not on your team&apos;s roster yet? You can ask your leads to add you after signing in.</p>
            </div>
          ) : (
            <div className="door-panel">
              <p className="door-copy">For recruiters at Longhorn Racing partner companies.</p>
              {google && (
                <>
                  <GoogleButton door="partner" next={next} />
                  <p className="door-divider">
                    <span>or use your work email</span>
                  </p>
                </>
              )}
              <MagicLinkForm door="partner" label="Work email" primary={!google} />
              <p className="door-note">
                New to LHR Careers?{" "}
                <Link href="/partners/request" className="link">
                  Request Partner access
                </Link>
              </p>
            </div>
          )}
        </div>

        <p className="signin-foot">Longhorn Racing @ The University of Texas at Austin</p>
      </section>
    </main>
  );
}

function GoogleButton({ door, next }: { door: "member" | "partner"; next: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="door" value={door} />
      <input type="hidden" name="next" value={next} />
      <button type="submit" className="btn btn-primary btn-block">
        <GoogleIcon />
        Continue with Google
      </button>
    </form>
  );
}
