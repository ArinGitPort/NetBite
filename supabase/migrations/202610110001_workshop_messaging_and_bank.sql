-- Additive instructor tools. Existing version packages and student submissions are unchanged.
create table public.workshop_question_bank (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null default auth.uid() references public.instructors(user_id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  question jsonb not null check (jsonb_typeof(question) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workshop_question_bank_owner_idx on public.workshop_question_bank(instructor_id, updated_at desc);
alter table public.workshop_question_bank enable row level security;
create policy workshop_question_bank_owner on public.workshop_question_bank for all to authenticated
  using (instructor_id = (select auth.uid()) and public.is_instructor())
  with check (instructor_id = (select auth.uid()) and public.is_instructor());
revoke all on public.workshop_question_bank from anon;
grant select, insert, update, delete on public.workshop_question_bank to authenticated;

create table public.workshop_announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.workshop_classes(id) on delete cascade,
  instructor_id uuid not null references public.instructors(user_id) on delete restrict,
  title text not null check (char_length(title) between 2 and 120),
  body text not null check (char_length(body) between 2 and 2000),
  created_at timestamptz not null default now()
);
create index workshop_announcements_class_time_idx on public.workshop_announcements(class_id, created_at desc);
alter table public.workshop_announcements enable row level security;
create policy workshop_announcements_owner_read on public.workshop_announcements for select to authenticated
  using (instructor_id = (select auth.uid()) and public.is_instructor());
create policy workshop_announcements_enrolled_read on public.workshop_announcements for select to authenticated
  using (exists (select 1 from public.workshop_enrollments e where e.class_id = workshop_announcements.class_id and e.student_id = (select auth.uid()) and e.left_at is null));
revoke all on public.workshop_announcements from anon, authenticated;
grant select on public.workshop_announcements to authenticated;

create table public.workshop_inbox_items (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.workshop_announcements(id) on delete cascade,
  class_id uuid not null references public.workshop_classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (announcement_id, student_id)
);
create index workshop_inbox_student_time_idx on public.workshop_inbox_items(student_id, created_at desc);
alter table public.workshop_inbox_items enable row level security;
create policy workshop_inbox_student_read on public.workshop_inbox_items for select to authenticated using (student_id = (select auth.uid()));
create policy workshop_inbox_student_mark_read on public.workshop_inbox_items for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
revoke all on public.workshop_inbox_items from anon, authenticated;
grant select, update(read_at) on public.workshop_inbox_items to authenticated;

create table public.workshop_push_tokens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  token text not null unique check (char_length(token) between 20 and 512),
  enabled boolean not null default true,
  invalidated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, device_id)
);
create index workshop_push_tokens_student_idx on public.workshop_push_tokens(student_id) where enabled and invalidated_at is null;
alter table public.workshop_push_tokens enable row level security;
create policy workshop_push_tokens_owner on public.workshop_push_tokens for all to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
revoke all on public.workshop_push_tokens from anon, authenticated;
grant select, insert, update, delete on public.workshop_push_tokens to authenticated;

create table public.workshop_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.workshop_push_tokens(id) on delete cascade,
  event_key text not null check (char_length(event_key) between 2 and 200),
  class_id uuid not null references public.workshop_classes(id) on delete cascade,
  assessment_id text,
  title text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'invalid')),
  expo_ticket_id text,
  expo_receipt text,
  attempted_at timestamptz,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (token_id, event_key)
);
create index workshop_push_deliveries_pending_idx on public.workshop_push_deliveries(status, created_at) where status = 'pending';
alter table public.workshop_push_deliveries enable row level security;
revoke all on public.workshop_push_deliveries from anon, authenticated;

-- One transaction inserts the announcement and its inbox copies; a class is
-- bounded so a mistaken bulk send cannot fan out indefinitely.
create or replace function public.post_workshop_announcement(p_class_id uuid, p_title text, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := (select auth.uid());
  announcement_id uuid;
  recipient_count integer;
begin
  if owner_id is null or not public.is_instructor() then raise exception 'INSTRUCTOR_REQUIRED'; end if;
  if not exists (select 1 from public.workshop_classes c where c.id = p_class_id and c.instructor_id = owner_id and not c.archived) then raise exception 'CLASS_NOT_FOUND'; end if;
  if char_length(trim(coalesce(p_title, ''))) not between 2 and 120 or char_length(trim(coalesce(p_body, ''))) not between 2 and 2000 then raise exception 'INVALID_ANNOUNCEMENT'; end if;
  select count(*) into recipient_count from public.workshop_enrollments e where e.class_id = p_class_id and e.left_at is null;
  if recipient_count > 1000 then raise exception 'CLASS_TOO_LARGE'; end if;
  insert into public.workshop_announcements(class_id, instructor_id, title, body)
  values (p_class_id, owner_id, trim(p_title), trim(p_body)) returning id into announcement_id;
  insert into public.workshop_inbox_items(announcement_id, class_id, student_id)
  select announcement_id, p_class_id, e.student_id from public.workshop_enrollments e
  where e.class_id = p_class_id and e.left_at is null;
  insert into public.workshop_push_deliveries(token_id, event_key, class_id, title, body)
  select token.id, 'announcement:' || announcement_id::text, p_class_id, trim(p_title), trim(p_body)
  from public.workshop_enrollments e
  join public.workshop_push_tokens token on token.student_id = e.student_id and token.enabled and token.invalidated_at is null
  where e.class_id = p_class_id and e.left_at is null;
  return announcement_id;
end;
$$;
revoke all on function public.post_workshop_announcement(uuid, text, text) from public, anon;
grant execute on function public.post_workshop_announcement(uuid, text, text) to authenticated;

create index workshop_attempts_analytics_idx on public.workshop_attempts(class_id, assessment_id, id);

create table public.workshop_assessment_due (
  class_id uuid not null references public.workshop_classes(id) on delete cascade,
  assessment_id text not null,
  title text not null,
  due_at timestamptz not null,
  primary key (class_id, assessment_id)
);
create index workshop_assessment_due_time_idx on public.workshop_assessment_due(due_at, class_id);
alter table public.workshop_assessment_due enable row level security;
revoke all on public.workshop_assessment_due from anon, authenticated;

create or replace function public.pin_workshop_assessment_due()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.workshop_assessment_due(class_id, assessment_id, title, due_at)
  select new.id, activity->>'id', activity->>'title', (activity->'settings'->>'dueAt')::timestamptz
  from public.workshop_versions version,
       jsonb_array_elements(coalesce(version.package->'assessments', '[]'::jsonb)) activity
  where version.id = new.version_id and activity->>'mode' = 'graded'
    and activity->'settings'->>'dueAt' is not null;
  return new;
end;
$$;
create trigger workshop_class_pin_due after insert on public.workshop_classes
for each row execute function public.pin_workshop_assessment_due();
revoke all on function public.pin_workshop_assessment_due() from public, anon, authenticated;
insert into public.workshop_assessment_due(class_id, assessment_id, title, due_at)
select class.id, activity->>'id', activity->>'title', (activity->'settings'->>'dueAt')::timestamptz
from public.workshop_classes class
join public.workshop_versions version on version.id = class.version_id,
     jsonb_array_elements(coalesce(version.package->'assessments', '[]'::jsonb)) activity
where activity->>'mode' = 'graded' and activity->'settings'->>'dueAt' is not null
on conflict do nothing;

create or replace function public.enqueue_workshop_due_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare queued integer;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  with due as (
    select schedule.*, '24h'::text as reminder from public.workshop_assessment_due schedule
    where schedule.due_at > now() + interval '23 hours 50 minutes' and schedule.due_at <= now() + interval '24 hours'
    union all
    select schedule.*, '1h'::text as reminder from public.workshop_assessment_due schedule
    where schedule.due_at > now() + interval '50 minutes' and schedule.due_at <= now() + interval '1 hour'
  ), queued_rows as (
    insert into public.workshop_push_deliveries(token_id, event_key, class_id, assessment_id, title, body)
    select token.id, 'due:' || due.class_id::text || ':' || due.assessment_id || ':' || due.reminder,
      due.class_id, due.assessment_id, 'Assessment due soon',
      due.title || ' is due in ' || case when due.reminder = '24h' then '24 hours.' else 'about one hour.' end
    from due
    join public.workshop_classes class on class.id = due.class_id and not class.archived
    join public.workshop_enrollments enrollment on enrollment.class_id = due.class_id and enrollment.left_at is null
    join public.workshop_push_tokens token on token.student_id = enrollment.student_id and token.enabled and token.invalidated_at is null
    where not exists (
      select 1 from public.workshop_attempts attempt where attempt.class_id = due.class_id
        and attempt.assessment_id = due.assessment_id and attempt.student_id = enrollment.student_id
    )
    on conflict (token_id, event_key) do nothing returning id
  ) select count(*) into queued from queued_rows;
  return queued;
end;
$$;
revoke all on function public.enqueue_workshop_due_reminders() from public, anon, authenticated;
grant execute on function public.enqueue_workshop_due_reminders() to service_role;

create or replace function public.claim_workshop_push_deliveries(p_limit integer default 100)
returns setof public.workshop_push_deliveries language sql security definer set search_path = '' as $$
  update public.workshop_push_deliveries delivery
  set status = 'processing', attempted_at = now(), attempt_count = delivery.attempt_count + 1
  where delivery.id in (
    select queued.id from public.workshop_push_deliveries queued
    where (queued.status = 'pending' and (queued.attempted_at is null or queued.attempted_at < now() - interval '5 minutes'))
       or (queued.status = 'processing' and queued.attempted_at < now() - interval '15 minutes')
    order by queued.created_at limit least(greatest(p_limit, 1), 100)
    for update skip locked
  )
  returning delivery.*;
$$;
revoke all on function public.claim_workshop_push_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_workshop_push_deliveries(integer) to service_role;

create table public.workshop_roster_import_runs (
  id bigint generated always as identity primary key,
  instructor_id uuid not null references public.instructors(user_id) on delete cascade,
  class_id uuid not null references public.workshop_classes(id) on delete cascade,
  committed boolean not null,
  created_at timestamptz not null default now()
);
create index workshop_roster_runs_owner_time_idx on public.workshop_roster_import_runs(instructor_id, created_at desc);
alter table public.workshop_roster_import_runs enable row level security;
revoke all on public.workshop_roster_import_runs from anon, authenticated;

create or replace function public.process_workshop_roster(p_class_id uuid, p_rows jsonb, p_commit boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := (select auth.uid());
  row_item record;
  email_value text;
  seen text[] := '{}';
  matched_id uuid;
  existing_enrollment boolean;
  result jsonb := '[]'::jsonb;
  outcome text;
begin
  if owner_id is null or not public.is_instructor() then raise exception 'INSTRUCTOR_REQUIRED'; end if;
  if not exists (select 1 from public.workshop_classes c where c.id = p_class_id and c.instructor_id = owner_id and not c.archived) then raise exception 'CLASS_NOT_FOUND'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 200 then raise exception 'ROSTER_LIMIT'; end if;
  if (select count(*) from public.workshop_roster_import_runs run where run.instructor_id = owner_id and run.created_at > now() - interval '1 hour') >= 20 then raise exception 'ROSTER_RATE_LIMIT'; end if;
  insert into public.workshop_roster_import_runs(instructor_id, class_id, committed) values (owner_id, p_class_id, p_commit);
  for row_item in select value, ordinality from jsonb_array_elements(p_rows) with ordinality loop
    email_value := lower(trim(coalesce(row_item.value->>'email', '')));
    matched_id := null;
    if char_length(email_value) > 254 or email_value !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      outcome := 'invalid';
    elsif email_value = any(seen) then
      outcome := 'duplicate';
    else
      seen := array_append(seen, email_value);
      -- Supabase Auth stores normalized email addresses; its existing email index
      -- supports this lookup without altering the managed auth.users table.
      select user_row.id into matched_id from auth.users user_row where user_row.email = email_value limit 1;
      if matched_id is null then outcome := 'unmatched';
      else
        select exists (select 1 from public.workshop_enrollments enrollment where enrollment.class_id = p_class_id and enrollment.student_id = matched_id and enrollment.left_at is null) into existing_enrollment;
        outcome := case when existing_enrollment then 'already-enrolled' else 'ready' end;
      end if;
    end if;
    if p_commit and outcome = 'ready' then
      insert into public.workshop_enrollments(class_id, student_id, left_at)
      values (p_class_id, matched_id, null)
      on conflict (class_id, student_id) do update set left_at = null, joined_at = now();
      outcome := 'enrolled';
    end if;
    result := result || jsonb_build_array(jsonb_build_object('row', row_item.ordinality, 'email', email_value, 'status', outcome));
  end loop;
  return result;
end;
$$;
revoke all on function public.process_workshop_roster(uuid, jsonb, boolean) from public, anon;
grant execute on function public.process_workshop_roster(uuid, jsonb, boolean) to authenticated;
