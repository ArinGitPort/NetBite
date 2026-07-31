alter table public.learning_progress
  add column if not exists review_signals jsonb not null default '{}'::jsonb,
  add column if not exists saved_learning_items jsonb not null default '{}'::jsonb,
  add column if not exists activity_history jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'learning_progress_review_signals_object') then
    alter table public.learning_progress add constraint learning_progress_review_signals_object check (jsonb_typeof(review_signals) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'learning_progress_saved_items_object') then
    alter table public.learning_progress add constraint learning_progress_saved_items_object check (jsonb_typeof(saved_learning_items) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'learning_progress_activity_history_array') then
    alter table public.learning_progress add constraint learning_progress_activity_history_array check (jsonb_typeof(activity_history) = 'array');
  end if;
end $$;
