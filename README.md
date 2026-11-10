# Longhorn Racing Recruitment

Longhorn Racing's Partners find engineers from the Solar, Electric and Combustion teams, and post jobs for them.
Plan: [`docs/PLAN.md`](docs/PLAN.md) · Product context: [`PRODUCT.md`](PRODUCT.md) · Design system: [`DESIGN.md`](DESIGN.md)

> Companies are **Partners** everywhere: copy, URLs, tables and code. UT Austin regulations rule out "sponsor".

**Stack:** Next.js 16 (App Router) on Cloudflare Workers via OpenNext · Supabase (Postgres + RLS, Auth, Storage) · Resend.

## Local development (Docker)

Everything runs on your machine: your own Postgres, Auth, Storage and a fake inbox, so you never touch the real project. It works with **OrbStack** or **Docker Desktop** (or Docker Engine on Linux); the commands are the same.

**Needs:** Node 22+ and OrbStack or Docker Desktop, running.

```bash
npm install
npm run db:start      # local Supabase in Docker (first run downloads images)
npm run env:docker    # writes .env.docker from the running stack
npm run docker:up     # the app in a container: http://localhost:3000
```

Or run the app on your machine instead of in a container: `npm run dev:local` (uses the same `.env.docker`).

**Port 3000 already in use?** Pick another for both steps: `APP_PORT=3001 npm run env:docker` then `APP_PORT=3001 npm run docker:up`, and open http://localhost:3001.

| Open | For |
|---|---|
| http://localhost:3000 | the app |
| http://127.0.0.1:54324 | **Mailpit**: every sign-in email lands here; nothing is really sent |
| http://127.0.0.1:54323 | **Supabase Studio**: tables, auth users, storage |

**Signing in locally.** Google is off locally (no credentials needed), so both doors use emailed links, which arrive in Mailpit. Test accounts from `supabase/seed.sql`:

| Door | Email | What happens |
|---|---|---|
| LHR member | `ishan.singhal@utexas.edu` (or any seed admin) | Admin |
| LHR member | `solar.member@utexas.edu`, `electric.member@utexas.edu`, `combustion.member@utexas.edu` | On the roster: straight to My profile |
| LHR member | any other `@utexas.edu`, e.g. `new.member@utexas.edu` | Asks to join a team; approve it as an admin |
| Partner | `recruiter@partner.example` | Invited to Test Partner Co: Partner home |
| Partner | any other address, e.g. `someone@company.example` | Partner access request form |

**Other commands**

| Command | Does |
|---|---|
| `npm run db:reset` | Wipes the local database and reapplies migrations + seed |
| `npm run docker:preview` | Builds the Cloudflare Worker and runs it in workerd, like production: http://localhost:8787 |
| `npm run docker:down` | Stops the app containers |
| `npm run db:stop` | Stops local Supabase |

After changing `package.json` dependencies, rebuild with `docker compose build web` and recreate the container's `node_modules` with `docker compose up -V web`.

Before deploying: `npm run typecheck`, `npm run lint`, and `npm run docker:preview`.

## One-time setup

These steps set up the **hosted** Supabase project and production. For local work, the section above is all you need.

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

Supabase → **Project Settings → API Keys**. Put these in `.env.local` (to run the app against the hosted project) and in the production build environment:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`), or the legacy anon key |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`). Server only; never commit it |
| `NEXT_PUBLIC_SITE_URL` | The production domain |

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
  - `https://recruit.longhornracing.org/auth/**`
  - `http://localhost:3000/auth/**` (only if you run the app locally against the hosted project)

  Sign-in emails link to these redirect URLs, so an address missing from this list breaks email sign-in.

Supabase → **Authentication → Emails**: paste this into both **Magic Link** and **Confirm signup** (a first-time Partner gets the second), so sign-in links work in any browser. It's the same file local Supabase uses, `supabase/templates/sign-in.html`:

```html
<h2>Sign in to Longhorn Racing Recruitment</h2>
<p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Sign in</a></p>
<p>This link works once and expires in an hour. If you didn't ask for it, you can ignore this email.</p>
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
supabase/seed.sql      local-only test accounts
supabase/templates/    sign-in email template
compose.yaml, Dockerfile, docker/   local app containers (OrbStack or Docker Desktop)
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
