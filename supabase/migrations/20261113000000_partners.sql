-- Phase 3: Partners. The resume book itself is the resume_book view (earlier migrations); this adds
-- what the company page and the access log need.

-- ─────────────────────────────────────────────────────────────
-- Company page: a Partner's logo lives in its own folder of the public partner-logos bucket.
-- ─────────────────────────────────────────────────────────────
alter table public.partner_companies
  add constraint logo_in_own_folder check (logo_path is null or logo_path like id::text || '/%'),
  add constraint description_has_text check (description is null or char_length(btrim(description)) > 0);

-- ─────────────────────────────────────────────────────────────
-- Access log: admins read it newest first, across every student.
-- Rows are written by the server (secret key) right before it signs a resume or file URL.
-- ─────────────────────────────────────────────────────────────
create index resume_access_log_recent_idx on public.resume_access_log (created_at desc);
create index resume_access_log_company_idx on public.resume_access_log (company_id, created_at desc);

-- The log names the student a Partner opened, so admins need their name and email even after the
-- student hides their profile (profiles staff read already covers this) and the file's name.
create policy "student files admin read" on public.student_files for select
  using (public.is_admin());
