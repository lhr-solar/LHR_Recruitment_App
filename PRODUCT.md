# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, TypeScript, Tailwind CSS) deployed to Cloudflare Workers via `@opennextjs/cloudflare`. Supabase for Postgres (RLS), Auth (Google OAuth + email magic link) and Storage. Resend for email. Chosen by the user during planning; see `docs/PLAN.md`.

## Users

- **Partner recruiters**: people at companies that partner with Longhorn Racing. They sign in (often with a work Microsoft/Outlook email, hence magic links) to find engineering students for internships and full-time roles, browse resumes, filter candidates, and post jobs. They visit occasionally and with a goal in mind, and they expect a professional tool that respects their time.
- **Students**: LHR members on the Solar, Electric or Combustion teams. They build a profile once (resume, up to 3 portfolio files, subsystem, skills, career interest, citizenship), then check the job board. Participation is optional.
- **Team leads and admins**: student officers who manage the roster, approve join and Partner requests, set Partner tiers and moderate jobs. Seed admins: ishan.singhal@utexas.edu, ravi.sha@utexas.edu, solar@longhornracing.org.

## Product Purpose

Turn Longhorn Racing's partnerships into hiring outcomes. Partners get a focused, filterable pool of students with real hands-on vehicle engineering experience. Students get job and internship leads from companies already invested in the team. LHR gets a tangible partnership benefit that supports fundraising. Success means Partners find and contact students, and students land roles.

## Positioning

Every candidate builds race cars on a named team and subsystem. A Partner can filter for "Solar · Power Systems, U.S. citizen, graduating Spring 2028" and see the student's own description of what they built. A general job board can't offer that pool or that structure.

## Operating Context

- Partners browse the resume book, view resumes in the browser, download them, and contact students directly by email or LinkedIn. There is no request/approval gate.
- Job posts live on the site but send students to the company's own external application. Partners see views, click-throughs and a list of students who marked "I applied".
- Students get in by being on an admin roster, or by requesting with a @utexas.edu account and being approved by a team lead or admin.
- Partners get in by admin invite, or by public request plus approval. Every approved Partner sees all three teams.
- Each team's subsystems come from the 26–27 lead charts and are editable by admins each year.

## Capabilities and Constraints

- **Terminology:** never use "sponsor" anywhere (UT Austin regulations). Companies are "Partners" in copy, URLs and code. Visa questions say "work visa support".
- Citizenship field: U.S. Citizen / U.S. Permanent Resident (Green Card) / Other: will require work visa support / Prefer not to say. Partner filter: "U.S. Citizens & Green Card holders only".
- Partner tiers are display-only: they order the logo wall and highlight jobs, and grant no extra access.
- Resume views and downloads are logged for admin review.
- Deferred: VC Partner accounts with portfolio-company invites (the data model should allow a parent company later); weekly jobs digest.

## Brand Commitments

From the LHR Brand Book (Notion):
- Name: "Longhorn Racing" or "LHR". Team acronyms are LHRs, LHRe and LHRc. "IC" and "EV" are never used in public copy, and "UT Austin's LHR" is never used.
- Logo hierarchy: logoblock, then primary or team logo, then the three-stripe shortmark (favicon), then the wordmark. Full-color logo on light backgrounds, white on dark. Never recolor, crop or fade it, or use a black version. Descriptors such as "CAREERS" are set in Montserrat caps and always paired with the logo.
- Voice: professional and approachable, technical yet digestible, enthusiastic and deliberate, playful yet polished.
- UT Burnt Orange #BF5700 is trademarked. Avoid it and colors near it.

## Evidence on Hand

- Team photos: the Solar, Electric and Combustion gallery pages at longhornracing.org (`/solar-gallery`, `/electric-gallery`, `/combustion-gallery`).
- Logo SVGs and PNGs, plus Eurostile Extended (wordmark only), are in the Brand Book.
- Subsystem charts: `26-27 SV Leads.png`, `26-27 EV Leads.png`, `26-27 IC Leads.png`.
- No real Partner list, logos, hiring stats or testimonials are on hand. Don't invent any. The Partner logo wall stays empty until admins add companies.

## Product Principles

1. Students control their visibility. Everything else is easy for Partners: no gates between a Partner and a visible resume.
2. Structured over promotional: filterable facts (team, subsystem, skills, graduation, citizenship) beat self-written headlines.
3. Every company is a named Partner. Access is accountable and logged.
4. It should look and sound like Longhorn Racing, not a generic HR tool.
