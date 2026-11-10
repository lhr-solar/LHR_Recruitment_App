# Longhorn Racing Recruitment

Longhorn Racing's Partners find engineers from the Solar, Electric and Combustion teams, and post jobs for them.
Plan: [`docs/PLAN.md`](docs/PLAN.md) · Product context: [`PRODUCT.md`](PRODUCT.md) · Design system: [`DESIGN.md`](DESIGN.md)

> Companies are **Partners** everywhere: copy, URLs, tables and code. UT Austin regulations rule out "sponsor".

**Stack:** Next.js 16 (App Router) on Cloudflare Workers via OpenNext · Supabase (Postgres + RLS, Auth, Storage) · Resend.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values (below)
npm run dev                  # http://localhost:3000
```

`npm run typecheck`, `npm run lint`, and `npm run preview` (builds the Cloudflare worker and runs it locally) are the checks to run before deploying.

## One-time setup

### 1. Supabase database

The whole schema, access rules, storage buckets and seed data (teams, 26–27 subsystems, starter skills, seed admins) live in `supabase/migrations/`.

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # asks for the database password
npm run db:push                                      # applies supabase/migrations
```

Without the CLI, paste `supabase/migrations/20261110000000_init.sql` into **SQL Editor → New query** and run it once.

Seed admins (become admins on first sign-in): `ishan.singhal@utexas.edu`, `ravi.sha@utexas.edu`, `solar@longhornracing.org`.

### 2. Keys

Supabase → **Project Settings → API Keys**. Put these in `.env.local`:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`), or the legacy anon key |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`). Server only; never commit it |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally, the real domain in production |

### 3. Google sign-in

1. [Google Cloud Console](https://console.cloud.google.com/) → create a project (e.g. "LHR Recruitment").
2. **APIs & Services → OAuth consent screen**: user type **External**, app name "Longhorn Racing Recruitment", scopes `email`, `profile`, `openid`. Publish the app when you launch.
3. **Credentials → Create credentials → OAuth client ID** → *Web application*.
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Supabase → **Authentication → Sign In / Providers → Google**: enable it, paste the client ID and secret.

### 4. Supabase Auth URLs and email

Supabase → **Authentication → URL Configuration**

- **Site URL**: your production URL (e.g. `https://recruit.longhornracing.org`)
- **Redirect URLs**: add
  - `http://localhost:3000/auth/**`
  - `https://recruit.longhornracing.org/auth/**`

Supabase → **Authentication → Emails → Magic Link**, so Partner sign-in links work in any browser:

```html
<h2>Sign in to Longhorn Racing Recruitment</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Sign in</a></p>
<p>This link works once and expires in an hour.</p>
```

Before launch, set **Authentication → Emails → SMTP Settings** to Resend (`smtp.resend.com`, port 465, user `resend`, password = Resend API key) so sign-in emails aren't rate-limited.

### 5. Cloudflare

```bash
npx wrangler login
npx wrangler secret put SUPABASE_SECRET_KEY
npm run deploy
```

`NEXT_PUBLIC_*` values are baked in at build time, so set them in the build environment (`.env.local` locally, or the Workers Builds environment variables). Add the custom domain under **Workers → lhr-recruitment → Settings → Domains & Routes** once DNS is on Cloudflare.

## How sign-in works

| Door | Method | Result |
|---|---|---|
| LHR member | Google (UT account) | Email on the roster: active on the roster's team. Other `@utexas.edu`: asks to join a team, a lead or admin approves. Not UT: refused. |
| Partner | Google, or an emailed link | Invited by an admin: active at that company. Otherwise: fills in a Partner access request for admins to review. |

Admin-allowlisted emails become admins whichever door they use. The database function `claim_account` makes these decisions; the access rules on every table enforce them.

## Repository map

```
supabase/migrations/   schema, row-level security, storage, seeds
src/proxy.ts           refreshes the Supabase session; sends signed-out visitors to /login
src/lib/               auth (viewer + routing), Supabase clients, sign-in, teams, photos
src/app/login          two-door sign-in
src/app/auth/*         OAuth callback, email-link confirm, sign out
src/app/(app)/*        signed-in screens: join, pending, profile, jobs, partner, admin
src/app/partners/request  public Partner access request
src/styles/tokens.css  brand tokens (LHR Brand Book)
public/brand/          official LHR logos and the RECRUITMENT lockup
public/photos/         team photos (see docs/assets.md)
```
