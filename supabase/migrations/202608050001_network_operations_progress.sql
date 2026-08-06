alter table public.learning_progress
  add column if not exists readiness_scores jsonb not null default '{}'::jsonb,
  add column if not exists completed_capstone_ids jsonb not null default '[]'::jsonb,
  add column if not exists course_achievements jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'learning_progress_readiness_object') then
    alter table public.learning_progress add constraint learning_progress_readiness_object check (jsonb_typeof(readiness_scores) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'learning_progress_capstones_array') then
    alter table public.learning_progress add constraint learning_progress_capstones_array check (jsonb_typeof(completed_capstone_ids) = 'array');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'learning_progress_achievements_object') then
    alter table public.learning_progress add constraint learning_progress_achievements_object check (jsonb_typeof(course_achievements) = 'object');
  end if;
end $$;
