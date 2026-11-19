-- ─────────────────────────────────────────────────────────────
-- STEP and STL models up to 250 MB. One too detailed to preview in a browser uploads without a
-- preview mesh, and Partners download it instead. Other files stay at 10 MB.
-- ─────────────────────────────────────────────────────────────
alter table public.student_files
  drop constraint student_files_size_bytes_check,
  add constraint student_files_size_bytes_check check (size_bytes between 1 and 262144000),
  drop constraint piece_shape,
  add constraint piece_shape check (
    case kind
      when 'file' then path is not null and url is null and video_seconds is null
        and (size_bytes <= 10485760 or (path ~* '\.(step|stp|stl)$' and size_bytes <= 262144000))
        and (preview_path is null or path ~* '\.(step|stp|stl)$')
      when 'video' then path is not null and size_bytes is not null and video_seconds is not null and url is null and preview_path is null
      else url is not null and path is null and size_bytes is null and video_seconds is null and preview_path is null
    end
  );

-- Supabase's project-wide upload limit (Storage settings) has to allow this too: 50 MB on Free.
update storage.buckets set file_size_limit = 262144000 where id = 'portfolio';
