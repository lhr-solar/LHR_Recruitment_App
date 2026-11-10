-- Phase 2: student profiles, resumes and portfolio files.

-- ─────────────────────────────────────────────────────────────
-- A student's team always follows their account's team, which only staff change.
-- ─────────────────────────────────────────────────────────────
create function public.sync_student_team()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_team text;
begin
  select team into v_team from public.profiles where id = new.user_id;
  if v_team is null then
    raise exception 'Choose your team before filling in your profile' using errcode = 'check_violation';
  end if;
  new.team := v_team;

  if new.subsystem_id is not null
    and not exists (select 1 from public.subsystems where id = new.subsystem_id and team = v_team) then
    -- A team change orphans the old subsystem; anything else is a bad pick.
    if tg_op = 'UPDATE' and new.subsystem_id is not distinct from old.subsystem_id then
      new.subsystem_id := null;
    else
      raise exception 'That subsystem belongs to another team' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;
create trigger students_team before insert or update on public.students
  for each row execute function public.sync_student_team();

-- When staff move someone to another team, their student profile follows.
create function public.sync_profile_team_to_student()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.team is not null then
    update public.students set team = new.team where user_id = new.id;
  end if;
  return new;
end;
$$;
create trigger profiles_team_to_student after update of team on public.profiles
  for each row when (old.team is distinct from new.team)
  execute function public.sync_profile_team_to_student();

-- Admins seeded without a roster team pick one once, themselves.
create function public.choose_my_team(p_team text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.teams where slug = p_team) then
    raise exception 'Unknown team %', p_team using errcode = '22023';
  end if;
  update public.profiles set team = p_team
    where id = auth.uid() and account_type = 'member' and status = 'active' and team is null;
  if not found then
    raise exception 'Your team is already set; ask an admin to change it' using errcode = '42501';
  end if;
end;
$$;
grant execute on function public.choose_my_team(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Files live in the owner's own storage folder, so a profile can't point at someone else's.
-- ─────────────────────────────────────────────────────────────
alter table public.students
  add constraint resume_in_own_folder check (resume_path is null or resume_path like user_id::text || '/%');
alter table public.student_files
  add constraint file_in_own_folder check (path like student_id::text || '/%');

-- At most 20 skills, so profiles stay a signal rather than a keyword list.
create function public.enforce_skill_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.student_skills where student_id = new.student_id) >= 20 then
    raise exception 'Pick at most 20 skills' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger student_skills_limit before insert on public.student_skills
  for each row execute function public.enforce_skill_limit();

-- ─────────────────────────────────────────────────────────────
-- Partners see a profile once it has the basics: a resume, a major and a graduation date.
-- ─────────────────────────────────────────────────────────────
create or replace view public.resume_book
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
  and s.resume_path is not null and s.major is not null and s.grad_year is not null
  and p.account_type = 'member' and p.status = 'active'
  and (public.is_active_partner() or public.is_admin());
