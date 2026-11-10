# Longhorn Racing Recruitment — Plan

A recruitment portal where Longhorn Racing **Partners** find LHR students and post jobs and internships.

> **Terminology:** we never say "sponsor" (UT Austin regulations). Companies are **Partners** everywhere: UI copy, emails, URLs, database tables and code.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router), TypeScript, Tailwind CSS |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare`; custom domain once DNS moves to Cloudflare |
| Database / auth / files | Supabase: Postgres with row-level security, Auth (Google OAuth + email magic link), private Storage buckets |
| Email | Resend (also used as Supabase Auth's custom SMTP) |
| Schema | Supabase CLI migrations, kept in `supabase/migrations` |

## Roles and sign-in

| Role | How they get in | What they can do |
|---|---|---|
| **Student** | Google sign-in. Emails on the roster are approved automatically; any other `@utexas.edu` account can request to join and waits for a team lead or admin to approve. | Profile, resume and portfolio files, job board, "I applied" |
| **Team lead** | A student promoted by an admin | Everything a student can do, plus their own team's roster and join requests |
| **Admin** | Seeded at launch, then promoted by other admins | Everything |
| **Partner recruiter** | Invited by an admin, or approved after the public "Request Partner Access" form. Signs in with Google or an email magic link. | Company page, resume book, job posts and their stats |

**Seed admins:** `ishan.singhal@utexas.edu`, `ravi.sha@utexas.edu`, `solar@longhornracing.org`. Admin emails skip the `@utexas.edu` requirement.

The login page has two entry points, "I'm a student" and "I'm a Partner", so the two flows never get mixed up.

## Connecting students and Partners

- **Resume book.** Approved Partners see each visible student's full profile, resume and contact info (email and LinkedIn), and contact students directly. There's no request-and-approve step.
- **Participation is optional.** Each student has a "Show my profile to Partners" switch.
- **Jobs.** Partners post jobs on the site. Each post sends students to the company's own application page.
  - Partners see how many people viewed and clicked through each post.
  - Students can mark "I applied", which puts their profile on that post's applicant list for the Partner.
- **Access log.** The database records each time a Partner views or downloads a resume, and admins can review it.

## Student profile

- Team (Solar / Electric / Combustion), subsystem, position or role
- Major, graduation year and semester, GPA (the student decides whether Partners see it)
- **Career interest:** internship, full-time, or both
- **Technical focus:** a one-line specialty, e.g. "Embedded Software & Controls"
- **Project experience:** a short description of what the student personally built on the car
- **Skills:** picked from an admin-managed standard list (tools, languages, manufacturing methods, disciplines)
- LinkedIn, GitHub and portfolio links
- **Citizenship / work authorization:**
  - U.S. Citizen
  - U.S. Permanent Resident (Green Card)
  - Other / will require work visa support
  - Prefer not to say
- Resume (PDF)
- Portfolio: up to 3 extra files of any type (pdf, docx, pptx, …), 10 MB each

## Resume book filters (Partner side)

Every approved Partner can browse all three teams. Filters: team, subsystem, major, graduation year and semester, career interest, skills, and **"U.S. Citizens & Green Card holders only"** (excludes "Other" and "Prefer not to say").

## Subsystems (seeded from the 26–27 lead charts, green boxes)

| Solar | Electric | Combustion |
|---|---|---|
| Aerodynamics | Aerodynamics | Aerodynamics |
| Composites | Body | Body |
| Dynamics | Dynamics | Composites |
| Ergonomics | Electronics | Dynamics |
| Power Systems | Powertrain | Electronics |
| Powertrain | Software & Vehicle Modeling | Powertrain |
| Tracksim | Trackside Engineering | Simulation & Validation |
| Vehicle Controls & Telemetry | Corporate Relations | Corporate Relations |
| Corporate Relations | Public Relations | Public Relations |
| Public Relations | Treasury | Treasury |
| Treasury | | |

Subsystems are stored in a table, so admins can edit them each year without code changes.

## Data model

- `profiles`: one row per auth user, with a role (`student`, `team_lead`, `admin`, `partner`) and a status
- `teams`, `subsystems`, `skills`: seeded data, editable by admins
- `roster_entries`: email, team, and who added it; supports CSV import
- `member_requests`: students asking to join
- `students`: the profile fields above, plus `visible`, `resume_path` and `citizenship`
- `student_files`: up to 3 portfolio files per student
- `partner_companies`: name, logo, website, description, display tier
- `partner_members`: which recruiters belong to which company
- `partner_access_requests`: submissions from the public form
- `jobs`:
  - title and type (internship, co-op or full-time)
  - location and remote option
  - description and the external application URL
  - which teams it targets, deadline
  - status: draft, open or closed
- `job_events`: view and click counts
- `job_applications`: "I applied" marks
- `resume_access_log`: which Partner viewed or downloaded which resume, and when

Every table has row-level security. Resumes and portfolio files sit in private buckets. Partners get signed URLs for visible students only.

## Emails (Resend)

- Magic-link sign-in
- Join request approved or declined
- Partner access approved, and Partner invites
- New "I applied" mark (sent to the Partner)
- Optional weekly digest of new jobs (later)

## Design

Brand-locked to the [LHR Brand Book](https://stormy-asparagus-6c0.notion.site/Brand-Book-Guidelines-359dbf3c76a48048b2a4d4c890f675a3), with layouts and polish elevated beyond longhornracing.org.

- **Philosophy:** "structured approachability". Rectangles and structured grids with soft rounded corners.
- **Colors:**
  - Ocean Blue `#045F85` for the brand, headings and primary actions
  - White, plus Light Gray `#EDEFF3` for surfaces
  - Mid Gray `#9CADB7` for decoration only (it fails text contrast); secondary text uses `#4D6270`
  - Team accents: Solar `#FF9404`, Electric `#FFB526`, Combustion `#FFC871` (per the brand book's Team Colors table)
- **Never use** UT Burnt Orange `#BF5700`, or colors close to it.
- **Type:**
  - Montserrat: SemiBold for titles, Medium for subheads, Regular for body
  - Urbanist: an allowed alternative for body copy
  - Eurostile Extended: only inside the logo assets
- **Logo:**
  - Logoblock where it's legible, team logos per team, shortmark for the favicon
  - White variant on dark backgrounds, never recolored
  - **"RECRUITMENT" descriptor** in Montserrat caps next to the logo
- **Naming:** "Longhorn Racing" / "LHR" / "LHRs", "LHRe", "LHRc". Never "IC" or "EV" in public copy.
- **Voice:** professional and approachable, technical yet digestible
- **Photos:** pulled from the Solar, Electric and Combustion gallery pages on longhornracing.org
- **Skills:**
  - `/impeccable`: design system, tokens, `DESIGN.md`, accessibility and responsive checks
  - `/design-taste-frontend`: landing-page layout and the screenshot review-and-fix passes
  - `/hallmark`: quality bar for each new page
  - None of them change the brand.

## Build phases

1. **Foundation:** scaffold the project, set up the Supabase schema and RLS, build all sign-in flows, seed admins and subsystems, set up the design tokens and logo assets
2. **Students:** onboarding, profile editor, resume and portfolio uploads
3. **Partners:** company pages, resume book with filters, access log
4. **Jobs:** posting, the job board, view and click tracking, "I applied"
5. **Admin and team lead tools:** roster with CSV import, approvals, companies and tiers, moderation
6. **Launch:** landing page, design review, Resend domain setup, Cloudflare deployment

## Setup the team owns

- Supabase project (exists). I need the project URL and keys.
- Google Cloud OAuth client (to be created). Setup steps will be in the README.
- Resend account and `longhornracing.org` domain verification (to be created)
- Move DNS to Cloudflare (in progress)
