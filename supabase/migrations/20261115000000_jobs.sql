-- Phase 4: jobs. The jobs, job_events and job_applications tables (and their access rules) date
-- from the first migration; this adds what posting, the board and the stats need.

-- ─────────────────────────────────────────────────────────────
-- Posts
-- ─────────────────────────────────────────────────────────────
alter table public.jobs
  add constraint target_teams_known check (target_teams <@ array['solar', 'electric', 'combustion']::text[]);

-- published_at is when a post first opened; the board sorts by it.
create function public.stamp_job_published()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'open' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;
create trigger jobs_stamp_published before insert or update of status on public.jobs
  for each row execute function public.stamp_job_published();

-- ─────────────────────────────────────────────────────────────
-- Views and clicks count people: one row per student, job and kind.
-- ─────────────────────────────────────────────────────────────
create unique index job_events_once on public.job_events (job_id, user_id, kind);

-- Only open posts can be viewed or clicked.
drop policy "job events member insert" on public.job_events;
create policy "job events member insert" on public.job_events for insert
  with check (
    user_id = auth.uid() and public.is_active_member()
    and exists (select 1 from public.jobs j where j.id = job_events.job_id and j.status = 'open')
  );

-- Per-post counts for the Partner's jobs list. Runs as the caller, so the access rules on
-- job_events and job_applications decide what's counted.
create view public.job_stats
with (security_invoker = true)
as
select
  j.id as job_id,
  (select count(*) from public.job_events e where e.job_id = j.id and e.kind = 'view') as views,
  (select count(*) from public.job_events e where e.job_id = j.id and e.kind = 'click') as clicks,
  (select count(*) from public.job_applications a where a.job_id = j.id) as applicants
from public.jobs j;

revoke all on public.job_stats from anon;
grant select on public.job_stats to authenticated;

-- ─────────────────────────────────────────────────────────────
-- "I applied" shares a student's profile with that job's company, even when the student hides it
-- from the resume book. The resume book view now returns those students too, and says which rows
-- belong in the browsable list (`listed`): visible, finished profiles.
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
  s.updated_at,
  s.photo_path is not null as has_photo,
  (s.visible and s.resume_path is not null and s.major is not null and s.grad_year is not null) as listed
from public.students s
join public.profiles p on p.id = s.user_id
left join public.subsystems sub on sub.id = s.subsystem_id
where p.account_type = 'member' and p.status = 'active'
  and (public.is_active_partner() or public.is_admin())
  and (
    (s.visible and s.resume_path is not null and s.major is not null and s.grad_year is not null)
    or exists (
      select 1 from public.job_applications a
      join public.jobs j on j.id = a.job_id
      where a.student_id = s.user_id and j.company_id = public.partner_company_id()
    )
  );
