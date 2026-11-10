-- Longhorn Racing Recruitment: initial schema.
-- Terminology: companies are "partners" everywhere (UT Austin regulations forbid "sponsor").

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────
create type public.account_type as enum ('member', 'partner');
create type public.account_status as enum ('pending', 'active', 'suspended', 'rejected');
create type public.request_status as enum ('pending', 'approved', 'declined');
create type public.citizenship as enum ('us_citizen', 'permanent_resident', 'requires_visa_support', 'prefer_not_to_say');
create type public.career_interest as enum ('internship', 'full_time', 'both');
create type public.grad_semester as enum ('spring', 'summer', 'fall');
create type public.job_type as enum ('internship', 'co_op', 'full_time');
create type public.job_status as enum ('draft', 'open', 'closed');
create type public.job_event_kind as enum ('view', 'click');
create type public.resume_access_kind as enum ('resume_view', 'resume_download', 'portfolio_download');

-- ─────────────────────────────────────────────────────────────
-- Shared trigger: updated_at
-- ─────────────────────────────────────────────────────────────
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Reference data
-- ─────────────────────────────────────────────────────────────
create table public.teams (
  slug text primary key,
  name text not null unique,
  acronym text not null unique,
  accent_hex text not null,
  sort int not null
);

create table public.subsystems (
  id uuid primary key default gen_random_uuid(),
  team text not null references public.teams (slug) on update cascade,
  name text not null,
  sort int not null default 0,
  active boolean not null default true,
  unique (team, name)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  active boolean not null default true
);

-- ─────────────────────────────────────────────────────────────
-- Accounts
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  account_type public.account_type,
  status public.account_status not null default 'pending',
  is_admin boolean not null default false,
  team text references public.teams (slug) on update cascade,
  is_team_lead boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_are_not_staff check (
    account_type is distinct from 'partner' or (not is_admin and not is_team_lead)
  ),
  constraint team_leads_have_a_team check (not is_team_lead or team is not null)
);
create index profiles_email_idx on public.profiles (lower(email));
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Emails that become admins on first sign-in, whatever door they use.
create table public.admin_allowlist (
  email text primary key check (email = lower(email))
);

-- LHR members whose email is pre-approved for a team.
create table public.roster_entries (
  email text primary key check (email = lower(email)),
  team text not null references public.teams (slug) on update cascade,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- @utexas.edu accounts not on the roster ask to join a team.
create table public.member_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  team text not null references public.teams (slug) on update cascade,
  note text check (char_length(note) <= 500),
  status public.request_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Students
-- ─────────────────────────────────────────────────────────────
create table public.students (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  team text not null references public.teams (slug) on update cascade,
  subsystem_id uuid references public.subsystems (id) on delete set null,
  position text check (char_length(position) <= 80),
  major text check (char_length(major) <= 120),
  grad_year int check (grad_year between 2020 and 2040),
  grad_semester public.grad_semester,
  gpa numeric(3, 2) check (gpa between 0 and 4),
  gpa_visible boolean not null default false,
  career_interest public.career_interest,
  technical_focus text check (char_length(technical_focus) <= 80),
  project_experience text check (char_length(project_experience) <= 1200),
  citizenship public.citizenship,
  linkedin_url text check (linkedin_url ~ '^https://'),
  github_url text check (github_url ~ '^https://'),
  portfolio_url text check (portfolio_url ~ '^https://'),
  resume_path text,
  resume_updated_at timestamptz,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger students_touch before update on public.students
  for each row execute function public.touch_updated_at();

create table public.student_skills (
  student_id uuid not null references public.students (user_id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (student_id, skill_id)
);

create table public.student_files (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (user_id) on delete cascade,
  path text not null unique,
  file_name text not null check (char_length(file_name) <= 200),
  mime_type text,
  size_bytes int not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);

create function public.enforce_portfolio_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.student_files where student_id = new.student_id) >= 3 then
    raise exception 'A portfolio holds at most 3 files' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger student_files_limit before insert on public.student_files
  for each row execute function public.enforce_portfolio_limit();

-- ─────────────────────────────────────────────────────────────
-- Partners
-- ─────────────────────────────────────────────────────────────
-- Display-only tiers: they order the logo wall and highlight jobs, nothing more.
create table public.partner_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rank int not null unique
);

create table public.partner_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  website text check (website ~ '^https://'),
  description text check (char_length(description) <= 1000),
  logo_path text,
  tier_id uuid references public.partner_tiers (id) on delete set null,
  -- Reserved for VC partners and their portfolio companies (not built yet).
  parent_company_id uuid references public.partner_companies (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger partner_companies_touch before update on public.partner_companies
  for each row execute function public.touch_updated_at();

create table public.partner_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  company_id uuid not null references public.partner_companies (id) on delete cascade,
  title text check (char_length(title) <= 120),
  created_at timestamptz not null default now()
);
create index partner_members_company_idx on public.partner_members (company_id);

create table public.partner_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  company_id uuid not null references public.partner_companies (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index partner_invites_open_email_idx on public.partner_invites (email) where accepted_at is null;

create table public.partner_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email text not null check (email = lower(email) and char_length(email) <= 254),
  full_name text not null check (char_length(full_name) between 1 and 120),
  title text check (char_length(title) <= 120),
  company_name text not null check (char_length(company_name) between 1 and 160),
  company_website text check (company_website ~ '^https://'),
  message text check (char_length(message) <= 1000),
  status public.request_status not null default 'pending',
  company_id uuid references public.partner_companies (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index partner_access_requests_email_idx on public.partner_access_requests (email);

-- ─────────────────────────────────────────────────────────────
-- Jobs
-- ─────────────────────────────────────────────────────────────
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.partner_companies (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 1 and 140),
  job_type public.job_type not null,
  location text check (char_length(location) <= 140),
  is_remote boolean not null default false,
  description text not null default '' check (char_length(description) <= 8000),
  apply_url text not null check (apply_url ~ '^https://'),
  target_teams text[] not null default '{}',
  deadline date,
  status public.job_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_company_idx on public.jobs (company_id);
create index jobs_open_idx on public.jobs (status, published_at desc);
create trigger jobs_touch before update on public.jobs
  for each row execute function public.touch_updated_at();

create table public.job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.jobs (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  kind public.job_event_kind not null,
  created_at timestamptz not null default now()
);
create index job_events_job_idx on public.job_events (job_id, kind);

-- "I applied": shares the student's profile with that job's partner.
create table public.job_applications (
  job_id uuid not null references public.jobs (id) on delete cascade,
  student_id uuid not null references public.students (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, student_id)
);

create table public.resume_access_log (
  id bigint generated always as identity primary key,
  partner_user_id uuid references public.profiles (id) on delete set null,
  company_id uuid references public.partner_companies (id) on delete set null,
  student_id uuid not null references public.students (user_id) on delete cascade,
  kind public.resume_access_kind not null,
  file_id uuid references public.student_files (id) on delete set null,
  created_at timestamptz not null default now()
);
create index resume_access_log_student_idx on public.resume_access_log (student_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Authorization helpers (security definer so policies can call them without recursion)
-- ─────────────────────────────────────────────────────────────
create function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin and status = 'active'
  );
$$;

create function public.led_team()
returns text
language sql stable security definer
set search_path = ''
as $$
  select team from public.profiles
  where id = auth.uid() and is_team_lead and status = 'active';
$$;

create function public.is_active_member()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and account_type = 'member' and status = 'active'
  );
$$;

-- The caller's company, when they are an active partner at an active company.
create function public.partner_company_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select m.company_id
  from public.partner_members m
  join public.profiles p on p.id = m.user_id
  join public.partner_companies c on c.id = m.company_id
  where m.user_id = auth.uid()
    and p.account_type = 'partner' and p.status = 'active'
    and c.active;
$$;

create function public.is_active_partner()
returns boolean
language sql stable
set search_path = ''
as $$
  select public.partner_company_id() is not null;
$$;

-- ─────────────────────────────────────────────────────────────
-- New auth users get a bare profile; claim_account() decides what they are.
-- ─────────────────────────────────────────────────────────────
create function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Called right after sign-in with the door the person used ('member' or 'partner').
-- Returns { outcome, account_type, status, is_admin }.
create function public.claim_account(p_intent text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(auth.jwt() ->> 'email');
  v_profile public.profiles;
  v_roster_team text;
  v_invite public.partner_invites;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_intent not in ('member', 'partner') then
    raise exception 'Unknown sign-in door %', p_intent using errcode = '22023';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then
    insert into public.profiles (id, email) values (v_uid, v_email) returning * into v_profile;
  end if;

  -- Already claimed: report the existing account, whichever door was used.
  if v_profile.account_type is not null then
    return jsonb_build_object(
      'outcome', 'existing',
      'account_type', v_profile.account_type,
      'status', v_profile.status,
      'is_admin', v_profile.is_admin
    );
  end if;

  select team into v_roster_team from public.roster_entries where email = v_email;

  if exists (select 1 from public.admin_allowlist where email = v_email) then
    update public.profiles
      set account_type = 'member', status = 'active', is_admin = true, team = v_roster_team
      where id = v_uid returning * into v_profile;
    return jsonb_build_object('outcome', 'admin', 'account_type', 'member', 'status', 'active', 'is_admin', true);
  end if;

  if p_intent = 'member' then
    if v_roster_team is not null then
      update public.profiles
        set account_type = 'member', status = 'active', team = v_roster_team
        where id = v_uid;
      return jsonb_build_object('outcome', 'roster', 'account_type', 'member', 'status', 'active', 'is_admin', false);
    elsif v_email like '%@utexas.edu' then
      update public.profiles set account_type = 'member', status = 'pending' where id = v_uid;
      return jsonb_build_object('outcome', 'needs_request', 'account_type', 'member', 'status', 'pending', 'is_admin', false);
    else
      return jsonb_build_object('outcome', 'not_utexas', 'account_type', null, 'status', 'pending', 'is_admin', false);
    end if;
  end if;

  -- Partner door.
  if v_email like '%@utexas.edu' and v_roster_team is not null then
    return jsonb_build_object('outcome', 'is_member', 'account_type', null, 'status', 'pending', 'is_admin', false);
  end if;

  select * into v_invite from public.partner_invites
    where email = v_email and accepted_at is null
    order by created_at desc limit 1;

  if found then
    update public.profiles set account_type = 'partner', status = 'active' where id = v_uid;
    insert into public.partner_members (user_id, company_id) values (v_uid, v_invite.company_id)
      on conflict (user_id) do update set company_id = excluded.company_id;
    update public.partner_invites set accepted_at = now() where id = v_invite.id;
    return jsonb_build_object('outcome', 'invited', 'account_type', 'partner', 'status', 'active', 'is_admin', false);
  end if;

  update public.profiles set account_type = 'partner', status = 'pending' where id = v_uid;
  update public.partner_access_requests set user_id = v_uid
    where email = v_email and user_id is null and status = 'pending';
  return jsonb_build_object('outcome', 'needs_request', 'account_type', 'partner', 'status', 'pending', 'is_admin', false);
end;
$$;

-- Pending @utexas.edu members ask to join a team.
create function public.request_membership(p_team text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and account_type = 'member' and status = 'pending'
  ) then
    raise exception 'Only pending LHR members can request to join' using errcode = '42501';
  end if;

  insert into public.member_requests (user_id, team, note)
  values (auth.uid(), p_team, nullif(trim(p_note), ''))
  on conflict (user_id) do update
    set team = excluded.team, note = excluded.note, status = 'pending',
        reviewed_by = null, reviewed_at = null, created_at = now()
    where public.member_requests.status <> 'approved';
end;
$$;

-- Admins review any team; team leads review their own.
create function public.review_member_request(p_request_id uuid, p_approve boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_req public.member_requests;
begin
  select * into v_req from public.member_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if not (public.is_admin() or public.led_team() = v_req.team) then
    raise exception 'Not allowed to review this request' using errcode = '42501';
  end if;

  update public.member_requests
    set status = case when p_approve then 'approved'::public.request_status else 'declined'::public.request_status end,
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id;

  update public.profiles
    set status = case when p_approve then 'active'::public.account_status else 'rejected'::public.account_status end,
        team = case when p_approve then v_req.team else team end
    where id = v_req.user_id;
end;
$$;

-- Partners can edit their company's public details, never its tier, status or parent.
create function public.guard_partner_company_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() and (
    new.tier_id is distinct from old.tier_id
    or new.active is distinct from old.active
    or new.parent_company_id is distinct from old.parent_company_id
    or new.name is distinct from old.name
  ) then
    raise exception 'Only admins can change a partner''s name, tier or status' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger partner_companies_guard before update on public.partner_companies
  for each row execute function public.guard_partner_company_update();

-- ─────────────────────────────────────────────────────────────
-- Resume book: what partners see. GPA is masked unless the student shares it.
-- Owned by postgres so it reads students directly; the where clause is the gate.
-- ─────────────────────────────────────────────────────────────
create view public.resume_book
with (security_barrier = true)
as
select
  s.user_id,
  p.full_name,
  p.email,
  p.avatar_url,
  s.team,
  s.subsystem_id,
  sub.name as subsystem_name,
  s.position,
  s.major,
  s.grad_year,
  s.grad_semester,
  case when s.gpa_visible then s.gpa end as gpa,
  s.career_interest,
  s.technical_focus,
  s.project_experience,
  s.citizenship,
  s.linkedin_url,
  s.github_url,
  s.portfolio_url,
  s.resume_path is not null as has_resume,
  coalesce(
    (select array_agg(ss.skill_id) from public.student_skills ss where ss.student_id = s.user_id),
    '{}'
  ) as skill_ids,
  coalesce(
    (select array_agg(sk.name order by sk.name) from public.student_skills ss
      join public.skills sk on sk.id = ss.skill_id where ss.student_id = s.user_id),
    '{}'
  ) as skill_names,
  s.updated_at
from public.students s
join public.profiles p on p.id = s.user_id
left join public.subsystems sub on sub.id = s.subsystem_id
where s.visible
  and p.account_type = 'member' and p.status = 'active'
  and (public.is_active_partner() or public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────
alter table public.teams enable row level security;
alter table public.subsystems enable row level security;
alter table public.skills enable row level security;
alter table public.profiles enable row level security;
alter table public.admin_allowlist enable row level security;
alter table public.roster_entries enable row level security;
alter table public.member_requests enable row level security;
alter table public.students enable row level security;
alter table public.student_skills enable row level security;
alter table public.student_files enable row level security;
alter table public.partner_tiers enable row level security;
alter table public.partner_companies enable row level security;
alter table public.partner_members enable row level security;
alter table public.partner_invites enable row level security;
alter table public.partner_access_requests enable row level security;
alter table public.jobs enable row level security;
alter table public.job_events enable row level security;
alter table public.job_applications enable row level security;
alter table public.resume_access_log enable row level security;

-- Reference data: readable by everyone, written by admins.
create policy "teams readable" on public.teams for select using (true);
create policy "subsystems readable" on public.subsystems for select using (true);
create policy "subsystems admin write" on public.subsystems for all
  using (public.is_admin()) with check (public.is_admin());
create policy "skills readable" on public.skills for select using (true);
create policy "skills admin write" on public.skills for all
  using (public.is_admin()) with check (public.is_admin());
create policy "tiers readable" on public.partner_tiers for select using (true);
create policy "tiers admin write" on public.partner_tiers for all
  using (public.is_admin()) with check (public.is_admin());

-- Profiles: yourself, admins, and team leads for their own team.
-- Partners reach student names and emails through resume_book, not this table.
create policy "profiles self read" on public.profiles for select
  using (id = auth.uid());
create policy "profiles staff read" on public.profiles for select
  using (public.is_admin() or (account_type = 'member' and team = public.led_team()));
create policy "profiles partner colleagues read" on public.profiles for select
  using (
    account_type = 'partner'
    and exists (
      select 1 from public.partner_members m
      where m.user_id = profiles.id and m.company_id = public.partner_company_id()
    )
  );
create policy "profiles self update" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin update" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());
-- Members may only change their display fields; privileged columns go through admins.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

create policy "allowlist admin" on public.admin_allowlist for all
  using (public.is_admin()) with check (public.is_admin());

create policy "roster staff" on public.roster_entries for all
  using (public.is_admin() or team = public.led_team())
  with check (public.is_admin() or team = public.led_team());

create policy "member requests self read" on public.member_requests for select
  using (user_id = auth.uid());
create policy "member requests staff read" on public.member_requests for select
  using (public.is_admin() or team = public.led_team());

-- Students: own row, plus staff. Partners use resume_book.
create policy "students self" on public.students for all
  using (user_id = auth.uid() and public.is_active_member())
  with check (user_id = auth.uid() and public.is_active_member());
create policy "students staff read" on public.students for select
  using (public.is_admin() or team = public.led_team());

create policy "student skills self" on public.student_skills for all
  using (student_id = auth.uid() and public.is_active_member())
  with check (student_id = auth.uid() and public.is_active_member());
create policy "student skills staff read" on public.student_skills for select
  using (public.is_admin());

create policy "student files self" on public.student_files for all
  using (student_id = auth.uid() and public.is_active_member())
  with check (student_id = auth.uid() and public.is_active_member());
create policy "student files partner read" on public.student_files for select
  using (
    (public.is_active_partner() or public.is_admin())
    and exists (select 1 from public.resume_book rb where rb.user_id = student_files.student_id)
  );

-- Partner companies: active ones are public (logo wall); members edit their own; admins all.
create policy "companies public read" on public.partner_companies for select
  using (active or public.is_admin() or id = public.partner_company_id());
create policy "companies member update" on public.partner_companies for update
  using (id = public.partner_company_id()) with check (id = public.partner_company_id());
create policy "companies admin write" on public.partner_companies for all
  using (public.is_admin()) with check (public.is_admin());

create policy "partner members read" on public.partner_members for select
  using (user_id = auth.uid() or company_id = public.partner_company_id() or public.is_admin());
create policy "partner members admin write" on public.partner_members for all
  using (public.is_admin()) with check (public.is_admin());

create policy "invites admin" on public.partner_invites for all
  using (public.is_admin()) with check (public.is_admin());

-- Anyone may ask for partner access; only admins read and review.
create policy "access requests submit" on public.partner_access_requests for insert
  to anon, authenticated
  with check (
    status = 'pending' and reviewed_by is null and company_id is null
    and (user_id is null or (user_id = auth.uid() and email = lower(auth.jwt() ->> 'email')))
  );
create policy "access requests self read" on public.partner_access_requests for select
  using (user_id = auth.uid());
create policy "access requests admin" on public.partner_access_requests for all
  using (public.is_admin()) with check (public.is_admin());

-- Jobs: open jobs for active members; a partner's own jobs in any state; admins all.
create policy "jobs member read" on public.jobs for select
  using (status = 'open' and public.is_active_member());
create policy "jobs partner read" on public.jobs for select
  using (company_id = public.partner_company_id());
create policy "jobs partner write" on public.jobs for insert
  with check (company_id = public.partner_company_id() and created_by = auth.uid());
create policy "jobs partner update" on public.jobs for update
  using (company_id = public.partner_company_id())
  with check (company_id = public.partner_company_id());
create policy "jobs partner delete" on public.jobs for delete
  using (company_id = public.partner_company_id());
create policy "jobs admin" on public.jobs for all
  using (public.is_admin()) with check (public.is_admin());

create policy "job events member insert" on public.job_events for insert
  with check (user_id = auth.uid() and public.is_active_member());
create policy "job events partner read" on public.job_events for select
  using (
    public.is_admin()
    or exists (select 1 from public.jobs j where j.id = job_events.job_id and j.company_id = public.partner_company_id())
  );

create policy "applications self" on public.job_applications for all
  using (student_id = auth.uid() and public.is_active_member())
  with check (
    student_id = auth.uid() and public.is_active_member()
    and exists (select 1 from public.jobs j where j.id = job_applications.job_id and j.status = 'open')
  );
create policy "applications partner read" on public.job_applications for select
  using (
    public.is_admin()
    or exists (select 1 from public.jobs j where j.id = job_applications.job_id and j.company_id = public.partner_company_id())
  );

-- Written by the server when it signs a download URL; read by admins.
create policy "access log admin read" on public.resume_access_log for select
  using (public.is_admin());

-- Grants: the anon role only needs public reference data and the access request form.
revoke all on public.resume_book from anon;
grant select on public.resume_book to authenticated;
revoke execute on function public.claim_account(text) from anon, public;
revoke execute on function public.request_membership(text, text) from anon, public;
revoke execute on function public.review_member_request(uuid, boolean) from anon, public;
grant execute on function public.claim_account(text) to authenticated;
grant execute on function public.request_membership(text, text) to authenticated;
grant execute on function public.review_member_request(uuid, boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Storage
-- resumes/ and portfolio/: private, {user_id}/<file>. Students manage their own folder.
-- Partners never read these buckets directly: the server checks access, logs it,
-- and hands back a short-lived signed URL.
-- partner-logos/: public, {company_id}/<file>.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('resumes', 'resumes', false, 10485760, array['application/pdf']),
  ('portfolio', 'portfolio', false, 10485760, null),
  ('partner-logos', 'partner-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']);

create policy "students manage own files" on storage.objects for all to authenticated
  using (
    bucket_id in ('resumes', 'portfolio')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_member()
  )
  with check (
    bucket_id in ('resumes', 'portfolio')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_member()
  );

create policy "partner logos public read" on storage.objects for select
  using (bucket_id = 'partner-logos');
create policy "partner logos write" on storage.objects for all to authenticated
  using (
    bucket_id = 'partner-logos'
    and (public.is_admin() or (storage.foldername(name))[1] = public.partner_company_id()::text)
  )
  with check (
    bucket_id = 'partner-logos'
    and (public.is_admin() or (storage.foldername(name))[1] = public.partner_company_id()::text)
  );

-- ─────────────────────────────────────────────────────────────
-- Seed data
-- ─────────────────────────────────────────────────────────────
insert into public.teams (slug, name, acronym, accent_hex, sort) values
  ('solar', 'Solar', 'LHRs', '#FF9404', 1),
  ('electric', 'Electric', 'LHRe', '#FFB526', 2),
  ('combustion', 'Combustion', 'LHRc', '#FFC871', 3);

-- 26-27 subsystems, from the green boxes on each team's lead chart.
insert into public.subsystems (team, name, sort) values
  ('solar', 'Aerodynamics', 1),
  ('solar', 'Composites', 2),
  ('solar', 'Dynamics', 3),
  ('solar', 'Ergonomics', 4),
  ('solar', 'Power Systems', 5),
  ('solar', 'Powertrain', 6),
  ('solar', 'Tracksim', 7),
  ('solar', 'Vehicle Controls & Telemetry', 8),
  ('solar', 'Corporate Relations', 9),
  ('solar', 'Public Relations', 10),
  ('solar', 'Treasury', 11),
  ('electric', 'Aerodynamics', 1),
  ('electric', 'Body', 2),
  ('electric', 'Dynamics', 3),
  ('electric', 'Electronics', 4),
  ('electric', 'Powertrain', 5),
  ('electric', 'Software & Vehicle Modeling', 6),
  ('electric', 'Trackside Engineering', 7),
  ('electric', 'Corporate Relations', 8),
  ('electric', 'Public Relations', 9),
  ('electric', 'Treasury', 10),
  ('combustion', 'Aerodynamics', 1),
  ('combustion', 'Body', 2),
  ('combustion', 'Composites', 3),
  ('combustion', 'Dynamics', 4),
  ('combustion', 'Electronics', 5),
  ('combustion', 'Powertrain', 6),
  ('combustion', 'Simulation & Validation', 7),
  ('combustion', 'Corporate Relations', 8),
  ('combustion', 'Public Relations', 9),
  ('combustion', 'Treasury', 10);

insert into public.admin_allowlist (email) values
  ('ishan.singhal@utexas.edu'),
  ('ravi.sha@utexas.edu'),
  ('solar@longhornracing.org');

-- Starter skills list; admins curate it from the admin panel.
insert into public.skills (name, category) values
  ('SolidWorks', 'CAD & Design'),
  ('Siemens NX', 'CAD & Design'),
  ('CATIA', 'CAD & Design'),
  ('Fusion 360', 'CAD & Design'),
  ('Onshape', 'CAD & Design'),
  ('GD&T', 'CAD & Design'),
  ('ANSYS', 'Simulation & Analysis'),
  ('Abaqus', 'Simulation & Analysis'),
  ('FEA', 'Simulation & Analysis'),
  ('CFD', 'Simulation & Analysis'),
  ('Star-CCM+', 'Simulation & Analysis'),
  ('MATLAB', 'Simulation & Analysis'),
  ('Simulink', 'Simulation & Analysis'),
  ('Vehicle Dynamics Modeling', 'Simulation & Analysis'),
  ('Python', 'Software'),
  ('C', 'Software'),
  ('C++', 'Software'),
  ('Rust', 'Software'),
  ('Embedded Systems', 'Software'),
  ('RTOS', 'Software'),
  ('Linux', 'Software'),
  ('Git', 'Software'),
  ('ROS', 'Software'),
  ('Data Acquisition', 'Software'),
  ('CAN Bus', 'Electrical'),
  ('PCB Design', 'Electrical'),
  ('Altium Designer', 'Electrical'),
  ('KiCad', 'Electrical'),
  ('Wire Harnessing', 'Electrical'),
  ('Battery Systems', 'Electrical'),
  ('High Voltage Systems', 'Electrical'),
  ('Power Electronics', 'Electrical'),
  ('Motor Control', 'Electrical'),
  ('Solar Arrays', 'Electrical'),
  ('CNC Machining', 'Manufacturing'),
  ('Manual Machining', 'Manufacturing'),
  ('Welding', 'Manufacturing'),
  ('Composite Layup', 'Manufacturing'),
  ('Mold Making', 'Manufacturing'),
  ('3D Printing', 'Manufacturing'),
  ('Sheet Metal', 'Manufacturing'),
  ('Design for Manufacturing', 'Manufacturing'),
  ('Engine Tuning', 'Powertrain'),
  ('Drivetrain Design', 'Powertrain'),
  ('Thermal Management', 'Powertrain'),
  ('Suspension Design', 'Vehicle Systems'),
  ('Steering & Brakes', 'Vehicle Systems'),
  ('Aerodynamic Design', 'Vehicle Systems'),
  ('Testing & Validation', 'Vehicle Systems'),
  ('Project Management', 'Business & Operations'),
  ('Corporate Outreach', 'Business & Operations'),
  ('Budgeting & Finance', 'Business & Operations'),
  ('Graphic Design', 'Business & Operations'),
  ('Technical Writing', 'Business & Operations');
