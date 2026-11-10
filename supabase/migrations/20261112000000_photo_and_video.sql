-- Phase 2b: an optional profile photo, a short video as one of the three portfolio pieces, and a
-- word limit (not a character limit) on "what you built".

-- ─────────────────────────────────────────────────────────────
-- Profile photo
-- ─────────────────────────────────────────────────────────────
alter table public.students
  add column photo_path text,
  add constraint photo_in_own_folder check (photo_path is null or photo_path like user_id::text || '/%');

-- The app holds "what you built" to 350 words; this is only a safety bound.
alter table public.students drop constraint students_project_experience_check;
alter table public.students
  add constraint students_project_experience_check check (char_length(project_experience) <= 3000);

-- ─────────────────────────────────────────────────────────────
-- Portfolio pieces: a file, an uploaded video, or a link to a video hosted elsewhere.
-- Still three at most (the existing trigger), and only one of them a video.
-- ─────────────────────────────────────────────────────────────
alter table public.student_files
  add column kind text not null default 'file' check (kind in ('file', 'video', 'video_link')),
  add column video_seconds int check (video_seconds between 1 and 190),
  add column url text check (url ~ '^https://' and char_length(url) <= 300),
  alter column path drop not null,
  alter column size_bytes drop not null,
  drop constraint student_files_size_bytes_check,
  add constraint student_files_size_bytes_check check (size_bytes between 1 and 104857600),
  add constraint piece_shape check (
    case kind
      when 'file' then path is not null and size_bytes <= 10485760 and url is null and video_seconds is null
      when 'video' then path is not null and size_bytes is not null and video_seconds is not null and url is null
      else url is not null and path is null and size_bytes is null and video_seconds is null
    end
  );
create unique index student_files_one_video on public.student_files (student_id) where kind <> 'file';

-- ─────────────────────────────────────────────────────────────
-- Storage: private, {user_id}/<file>, like resumes. Partners get signed URLs from the server.
-- Supabase's own per-file limit also applies (50 MB on the free plan).
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('videos', 'videos', false, 104857600, array['video/mp4', 'video/webm', 'video/quicktime']);

create policy "students manage own photos and videos" on storage.objects for all to authenticated
  using (
    bucket_id in ('photos', 'videos')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_member()
  )
  with check (
    bucket_id in ('photos', 'videos')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_member()
  );

-- ─────────────────────────────────────────────────────────────
-- The resume book says whether there's a photo; the server signs it.
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
  s.photo_path is not null as has_photo
from public.students s
join public.profiles p on p.id = s.user_id
left join public.subsystems sub on sub.id = s.subsystem_id
where s.visible
  and s.resume_path is not null and s.major is not null and s.grad_year is not null
  and p.account_type = 'member' and p.status = 'active'
  and (public.is_active_partner() or public.is_admin());
