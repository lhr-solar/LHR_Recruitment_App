-- Phase 5: admin and team lead tools. The roster, member roles and status, Partner invites and
-- tiers all change privileged columns, so each change goes through a function that checks who
-- is asking.

-- ─────────────────────────────────────────────────────────────
-- Roster: admins add to any team, team leads to their own. Anyone already waiting to join (or
-- turned down earlier) with a listed email is let in on the spot.
-- Returns counts, plus the emails that were skipped and why.
-- ─────────────────────────────────────────────────────────────
create function public.add_to_roster(p_emails text[], p_team text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text;
  v_existing text;
  v_uid uuid;
  v_admin boolean := public.is_admin();
  v_added int := 0;
  v_moved int := 0;
  v_kept int := 0;
  v_let_in int := 0;
  v_other_team text[] := '{}';
  v_invalid text[] := '{}';
begin
  if not (v_admin or public.led_team() = p_team) then
    raise exception 'Not allowed to change this team''s roster' using errcode = '42501';
  end if;
  if not exists (select 1 from public.teams where slug = p_team) then
    raise exception 'Unknown team %', p_team using errcode = '22023';
  end if;

  foreach v_email in array coalesce(p_emails, '{}') loop
    v_email := lower(btrim(v_email));
    continue when v_email = '';
    if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(v_email) > 254 then
      v_invalid := v_invalid || v_email;
      continue;
    end if;

    select team into v_existing from public.roster_entries where email = v_email;
    if found then
      if v_existing = p_team then
        v_kept := v_kept + 1;
      elsif v_admin then
        update public.roster_entries set team = p_team, added_by = auth.uid() where email = v_email;
        v_moved := v_moved + 1;
      else
        -- A team lead can't take someone off another team's roster.
        v_other_team := v_other_team || v_email;
        continue;
      end if;
    else
      insert into public.roster_entries (email, team, added_by) values (v_email, p_team, auth.uid());
      v_added := v_added + 1;
    end if;

    v_uid := null;
    update public.profiles set status = 'active', team = p_team
      where lower(email) = v_email and account_type = 'member' and status in ('pending', 'rejected')
      returning id into v_uid;
    if v_uid is not null then
      v_let_in := v_let_in + 1;
      update public.member_requests
        set status = 'approved', team = p_team, reviewed_by = auth.uid(), reviewed_at = now()
        where user_id = v_uid and status <> 'approved';
    end if;
  end loop;

  return jsonb_build_object(
    'added', v_added, 'moved', v_moved, 'kept', v_kept, 'let_in', v_let_in,
    'other_team', to_jsonb(v_other_team), 'invalid', to_jsonb(v_invalid)
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Pausing and restoring accounts. Admins can pause anyone but themselves; team leads can pause
-- students on their own team (not other leads or admins). Paused accounts lose all access: every
-- access rule requires an active status.
-- ─────────────────────────────────────────────────────────────
create function public.set_account_status(p_user uuid, p_status public.account_status)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_target public.profiles;
begin
  if p_status not in ('active', 'suspended') then
    raise exception 'Accounts can only be paused or restored here' using errcode = '22023';
  end if;
  select * into v_target from public.profiles where id = p_user for update;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;
  if v_target.id = auth.uid() then
    raise exception 'You can''t pause your own account' using errcode = '42501';
  end if;
  if not (
    public.is_admin()
    or (v_target.account_type = 'member' and v_target.team = public.led_team()
        and not v_target.is_admin and not v_target.is_team_lead)
  ) then
    raise exception 'Not allowed to change this account' using errcode = '42501';
  end if;
  if p_status = 'suspended' and v_target.status <> 'active' then
    raise exception 'Only active accounts can be paused' using errcode = '55000';
  end if;
  if p_status = 'active' and v_target.status <> 'suspended' then
    raise exception 'Only paused accounts can be restored' using errcode = '55000';
  end if;

  update public.profiles set status = p_status where id = p_user;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Roles and teams, admins only. Nobody removes their own admin role, so there's always an admin.
-- Moving a student to another team clears a subsystem that belonged to the old one.
-- ─────────────────────────────────────────────────────────────
create function public.set_member_role(p_user uuid, p_is_admin boolean, p_is_team_lead boolean, p_team text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_target public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change roles' using errcode = '42501';
  end if;
  select * into v_target from public.profiles where id = p_user for update;
  if not found or v_target.account_type is distinct from 'member' then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
  if v_target.id = auth.uid() and not p_is_admin then
    raise exception 'You can''t remove your own admin role' using errcode = '42501';
  end if;
  if p_team is not null and not exists (select 1 from public.teams where slug = p_team) then
    raise exception 'Unknown team %', p_team using errcode = '22023';
  end if;
  if p_is_team_lead and p_team is null then
    raise exception 'Team leads need a team' using errcode = '22023';
  end if;

  update public.profiles
    set is_admin = p_is_admin, is_team_lead = p_is_team_lead, team = coalesce(p_team, team)
    where id = p_user;
  update public.students s set subsystem_id = null
    where s.user_id = p_user and s.subsystem_id is not null
      and not exists (select 1 from public.subsystems sub where sub.id = s.subsystem_id and sub.team = s.team);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Partner invites, admins only.
--   Someone who already signed in through the Partner door joins the company right away.
--   Otherwise an invite waits for their first sign-in (claim_account accepts it).
-- Any pending access request from that email is closed as approved.
-- Returns 'added', 'invited' or 'already'.
-- ─────────────────────────────────────────────────────────────
create function public.invite_partner(p_email text, p_company_id uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_profile public.profiles;
  v_current uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can invite Partners' using errcode = '42501';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(v_email) > 254 then
    raise exception 'That isn''t an email address' using errcode = '22023';
  end if;
  if not exists (select 1 from public.partner_companies where id = p_company_id) then
    raise exception 'Company not found' using errcode = 'P0002';
  end if;

  select * into v_profile from public.profiles where lower(email) = v_email for update;
  if found then
    if v_profile.account_type = 'member' then
      raise exception 'That email belongs to an LHR member account' using errcode = '22023';
    end if;
    if v_profile.status = 'suspended' then
      raise exception 'That recruiter''s account is paused; restore it instead' using errcode = '55000';
    end if;
    select company_id into v_current from public.partner_members where user_id = v_profile.id;
    if v_profile.account_type = 'partner' and v_profile.status = 'active' and v_current is not null then
      if v_current = p_company_id then
        return 'already';
      end if;
      raise exception 'That recruiter already belongs to another company' using errcode = '23505';
    end if;

    update public.profiles set account_type = 'partner', status = 'active' where id = v_profile.id;
    insert into public.partner_members (user_id, company_id) values (v_profile.id, p_company_id)
      on conflict (user_id) do update set company_id = excluded.company_id;
    update public.partner_access_requests
      set status = 'approved', company_id = p_company_id, reviewed_by = auth.uid(), reviewed_at = now()
      where email = v_email and status = 'pending';
    return 'added';
  end if;

  insert into public.partner_invites (email, company_id, invited_by)
    values (v_email, p_company_id, auth.uid())
    on conflict (email) where accepted_at is null
    do update set company_id = excluded.company_id, invited_by = excluded.invited_by, created_at = now();
  update public.partner_access_requests
    set status = 'approved', company_id = p_company_id, reviewed_by = auth.uid(), reviewed_at = now()
    where email = v_email and status = 'pending';
  return 'invited';
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Tiers are ordered by rank (1 first). Moving one swaps it with its neighbour.
-- ─────────────────────────────────────────────────────────────
create function public.move_partner_tier(p_tier uuid, p_up boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_tier public.partner_tiers;
  v_other public.partner_tiers;
begin
  if not public.is_admin() then
    raise exception 'Only admins can reorder tiers' using errcode = '42501';
  end if;
  select * into v_tier from public.partner_tiers where id = p_tier for update;
  if not found then
    raise exception 'Tier not found' using errcode = 'P0002';
  end if;
  if p_up then
    select * into v_other from public.partner_tiers where rank < v_tier.rank order by rank desc limit 1 for update;
  else
    select * into v_other from public.partner_tiers where rank > v_tier.rank order by rank asc limit 1 for update;
  end if;
  if not found then
    return;
  end if;

  -- rank is unique, so step through a free value.
  update public.partner_tiers set rank = (select min(rank) - 1 from public.partner_tiers) where id = v_tier.id;
  update public.partner_tiers set rank = v_tier.rank where id = v_other.id;
  update public.partner_tiers set rank = v_other.rank where id = v_tier.id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- The public landing page's numbers. Counts only, so anyone may call it.
-- ─────────────────────────────────────────────────────────────
create function public.landing_stats()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with listed as (
    select s.team from public.students s
    join public.profiles p on p.id = s.user_id
    where p.account_type = 'member' and p.status = 'active'
      and s.visible and s.resume_path is not null and s.major is not null and s.grad_year is not null
  )
  select jsonb_build_object(
    'students', (select count(*) from listed),
    'by_team', coalesce((select jsonb_object_agg(team, n) from (select team, count(*) as n from listed group by team) t), '{}'::jsonb),
    'jobs', (
      select count(*) from public.jobs
      where status = 'open' and (deadline is null or deadline >= (now() at time zone 'America/Chicago')::date)
    ),
    'partners', (select count(*) from public.partner_companies where active)
  );
$$;

revoke execute on function public.add_to_roster(text[], text) from anon, public;
revoke execute on function public.set_account_status(uuid, public.account_status) from anon, public;
revoke execute on function public.set_member_role(uuid, boolean, boolean, text) from anon, public;
revoke execute on function public.invite_partner(text, uuid) from anon, public;
revoke execute on function public.move_partner_tier(uuid, boolean) from anon, public;
grant execute on function public.add_to_roster(text[], text) to authenticated;
grant execute on function public.set_account_status(uuid, public.account_status) to authenticated;
grant execute on function public.set_member_role(uuid, boolean, boolean, text) to authenticated;
grant execute on function public.invite_partner(text, uuid) to authenticated;
grant execute on function public.move_partner_tier(uuid, boolean) to authenticated;
grant execute on function public.landing_stats() to anon, authenticated;

-- A tier name is a label on the admin screens and the logo wall.
alter table public.partner_tiers
  add constraint tier_name_length check (char_length(btrim(name)) between 1 and 40);

-- Company names are unique however they're capitalized ("Acme" and "ACME" are one Partner).
-- Approvals already match names this way.
create unique index partner_companies_name_ci on public.partner_companies (lower(btrim(name)));
