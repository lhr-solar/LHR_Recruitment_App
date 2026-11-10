import type { Metadata } from "next";
import Link from "next/link";
import { Lockup } from "@/components/lockup";

export const metadata: Metadata = { title: "Finish signing in" };

// Sign-in emails link here (the template appends token_hash and type to …/auth/confirm?door=…).
// Opening the page spends nothing; the button does, so link-scanning mail filters can't.
export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const params = await searchParams;
  const door = params.door === "partner" ? "partner" : "member";
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : null;
  const type = typeof params.type === "string" ? params.type : "email";

  return (
    <div className="standalone">
      <header className="standalone-bar">
        <Link href="/login" className="signin-lockup" aria-label="LHR Careers">
          <Lockup height={44} />
        </Link>
      </header>
      <main className="standalone-main narrow">
        {tokenHash ? (
          <>
            <header className="page-head">
              <h1>Finish signing in</h1>
              <p>
                {door === "partner"
                  ? "You're signing in to LHR Careers as a Partner."
                  : "You're signing in to LHR Careers as an LHR member."}
              </p>
            </header>
            <form method="post" action="/auth/confirm/verify">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="door" value={door} />
              <button type="submit" className="btn btn-primary">
                Sign in
              </button>
            </form>
          </>
        ) : (
          <header className="page-head">
            <h1>That link is incomplete</h1>
            <p>
              Part of the sign-in link went missing, which can happen when an email app shortens it.{" "}
              <Link href={`/login?door=${door}`} className="link">
                Ask for a new link
              </Link>
              .
            </p>
          </header>
        )}
      </main>
    </div>
  );
}
