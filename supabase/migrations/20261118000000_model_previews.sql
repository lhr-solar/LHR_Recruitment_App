-- ─────────────────────────────────────────────────────────────
-- 3D models in the portfolio: STEP and STL files up to 50 MB (other files stay at 10 MB), each
-- with a small mesh the student's browser makes at upload. Partners open the mesh, never the CAD.
-- ─────────────────────────────────────────────────────────────
alter type public.resume_access_kind add value 'portfolio_view';

alter table public.student_files
  add column preview_path text,
  add constraint preview_in_own_folder check (preview_path is null or preview_path like student_id::text || '/%'),
  drop constraint piece_shape,
  add constraint piece_shape check (
    case kind
      when 'file' then path is not null and url is null and video_seconds is null
        and (size_bytes <= 10485760 or (preview_path is not null and size_bytes <= 52428800))
      when 'video' then path is not null and size_bytes is not null and video_seconds is not null and url is null and preview_path is null
      else url is not null and path is null and size_bytes is null and video_seconds is null and preview_path is null
    end
  );

-- Supabase's own per-file limit still applies (50 MB on the free plan), so this is the ceiling.
update storage.buckets set file_size_limit = 52428800 where id = 'portfolio';
