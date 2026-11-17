import type { Metadata } from "next";
import Link from "next/link";
import { Lockup } from "@/components/lockup";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What LHR Careers collects, who can see it, and the choices you have.",
};

// Public, so Google's OAuth review (and anyone else) can read it without signing in. Keep it in step
// with what the app actually stores and shares: the resume_book view, the access log and email.ts.
const UPDATED = "November 17, 2026";
const CONTACT = "solar@longhornracing.org";

export default function PrivacyPage() {
  return (
    <div className="standalone">
      <header className="standalone-bar">
        <Link href="/" className="signin-lockup" aria-label="LHR Careers home">
          <Lockup height={44} />
        </Link>
      </header>
      <main className="standalone-main narrow">
        <header className="page-head">
          <h1>Privacy policy</h1>
          <p>Last updated {UPDATED}</p>
        </header>

        <div className="legal">
          <p>
            LHR Careers is run by Longhorn Racing, a student organization at The University of Texas at Austin. It connects Longhorn Racing members with
            recruiters from the team&apos;s Partner companies. This policy explains what we collect, who can see it, and the choices you have.
          </p>

          <h2>Signing in with Google</h2>
          <p>
            When you sign in with Google, we receive only your name, email address and profile picture. We use them to create your account, show your name
            and picture in LHR Careers, and email you about your account. We don&apos;t ask for access to your Gmail, Drive, contacts or any other Google
            data, and we don&apos;t use Google data for advertising.
          </p>
          <p>
            Our use of information received from Google APIs adheres to the{" "}
            <a className="link" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>

          <h2>What we collect</h2>
          <h3>Longhorn Racing members</h3>
          <ul>
            <li>Your name, email address and profile picture, from Google</li>
            <li>Your team, subsystem and role on the team</li>
            <li>Your major, graduation term, and GPA if you enter it</li>
            <li>Your career interests, technical focus, project experience and skills</li>
            <li>Your LinkedIn, GitHub and portfolio links</li>
            <li>Your answer to the work authorization question, which can be &ldquo;Prefer not to say&rdquo;</li>
            <li>Your resume, portfolio files and videos, and a profile photo if you upload one</li>
            <li>Which job posts you view, which application links you open, and which jobs you mark as applied to</li>
          </ul>
          <h3>Partner recruiters</h3>
          <ul>
            <li>Your name, email address, company and job title, and anything you write in your access request</li>
            <li>Anything your company adds to its company page, such as a logo, website and description</li>
            <li>The job posts you create</li>
            <li>A record of each student resume or portfolio file you open or download</li>
          </ul>
          <h3>Everyone</h3>
          <ul>
            <li>
              A record of the emails we send you, and whether each was delivered, opened or had a link clicked. Our email provider adds a small image and
              tracked links to measure this.
            </li>
            <li>Sign-in cookies that keep you signed in. We don&apos;t use advertising or analytics cookies.</li>
          </ul>

          <h2>Who can see your information</h2>
          <ul>
            <li>
              <strong>Approved Partner recruiters</strong> can see a member&apos;s profile once it has a resume, a major and a graduation date, and the
              member hasn&apos;t hidden it. That includes the resume, portfolio, contact details (email and LinkedIn), skills, project experience and work
              authorization answer. GPA is shown only if you choose to show it.
            </li>
            <li>
              <strong>When you mark &ldquo;I applied&rdquo;</strong> on a job post, the recruiters at that company can see your profile on that post&apos;s
              applicant list, even if your profile is hidden from the Student directory.
            </li>
            <li>
              <strong>Partners see totals for their own job posts</strong>: how many students viewed each post and opened its application link. They
              don&apos;t see who viewed it.
            </li>
            <li>
              <strong>Longhorn Racing admins and team leads</strong> can see member accounts to manage the roster, approve join requests and keep the
              site running. Admins can also see the resume access record and the email delivery record.
            </li>
          </ul>
          <p>We don&apos;t sell your information, and we don&apos;t share it with anyone outside the people listed above, except the service providers below.</p>

          <h2>Service providers</h2>
          <p>These companies store or process information for us, only to run LHR Careers:</p>
          <ul>
            <li>
              <strong>Supabase</strong>: our database, sign-in and file storage. Resumes and portfolio files are kept in private storage, and recruiters
              open them through short-lived links.
            </li>
            <li>
              <strong>Cloudflare</strong>: hosts the website.
            </li>
            <li>
              <strong>Resend</strong>: sends our emails and reports whether they were delivered and opened.
            </li>
            <li>
              <strong>Google</strong>: provides &ldquo;Sign in with Google&rdquo;.
            </li>
          </ul>

          <h2>Your choices</h2>
          <ul>
            <li>Turn off &ldquo;Show my profile to Partners&rdquo; on your profile at any time to leave the Student directory.</li>
            <li>Edit or remove anything on your profile, including your resume, files, links and GPA.</li>
            <li>
              Ask us to delete your account and everything attached to it by emailing{" "}
              <a className="link" href={`mailto:${CONTACT}`}>
                {CONTACT}
              </a>
              . We&apos;ll do it within 30 days.
            </li>
            <li>
              Remove LHR Careers&apos; access to your Google account at any time from your{" "}
              <a className="link" href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">
                Google account settings
              </a>
              .
            </li>
          </ul>

          <h2>How long we keep information</h2>
          <p>
            We keep your account and profile while you use LHR Careers. When a member leaves the team or a Partner&apos;s access ends, an admin can pause or
            remove the account, and paused profiles are no longer shown to Partners. Records of resume access and sent emails are kept so admins can review
            them, and are deleted with the account.
          </p>

          <h2>Security</h2>
          <p>
            Access to every record is checked by the database itself, so people can only reach what their role allows. Files are stored privately, and all
            traffic to the site is encrypted.
          </p>

          <h2>Changes and contact</h2>
          <p>
            If we change this policy, we&apos;ll update the date at the top of this page. Questions or requests:{" "}
            <a className="link" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
