-- Instructor-owned workshops are separate from the official curriculum CMS.
create table public.instructors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  approved_by uuid not null references public.content_admins(user_id) on delete restrict,
  approved_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.instructor_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  institution text not null check (char_length(institution) between 2 and 160),
  reason text not null default '' check (char_length(reason) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'revoked')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.content_admins(user_id) on delete set null
);

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null default auth.uid() references public.instructors(user_id) on delete restrict,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  archived boolean not null default false,
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workshop_lessons (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  stable_id text not null check (stable_id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  position integer not null check (position > 0),
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object'),
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (workshop_id, stable_id),
  unique (workshop_id, position)
);

create table public.workshop_topologies (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  stable_id text not null check (stable_id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  updated_at timestamptz not null default now(),
  unique (workshop_id, stable_id)
);

create table public.workshop_assessments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  stable_id text not null check (stable_id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  title text not null check (char_length(title) between 3 and 120),
  mode text not null check (mode in ('practice', 'graded')),
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (workshop_id, stable_id)
);

create table public.workshop_flashcards (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  stable_id text not null check (stable_id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  lesson_stable_id text not null,
  position integer not null check (position > 0),
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (workshop_id, stable_id),
  unique (workshop_id, position)
);

create table public.workshop_versions (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  version integer not null check (version > 0),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  package jsonb not null check (jsonb_typeof(package) = 'object'),
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  published_by uuid not null references public.instructors(user_id) on delete restrict,
  published_at timestamptz not null default now(),
  unique (workshop_id, version)
);

create table public.workshop_publish_requests (
  request_id uuid primary key,
  instructor_id uuid not null references public.instructors(user_id) on delete restrict,
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  version_id uuid not null references public.workshop_versions(id) on delete restrict,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now()
);
alter table public.workshops add constraint workshops_current_version_fk foreign key (current_version_id) references public.workshop_versions(id) on delete restrict;

-- Correct answers are never exposed through learner-facing version packages.
create table public.workshop_assessment_keys (
  version_id uuid not null references public.workshop_versions(id) on delete cascade,
  assessment_id text not null,
  answer_key jsonb not null check (jsonb_typeof(answer_key) = 'object'),
  explanations jsonb not null default '{}'::jsonb check (jsonb_typeof(explanations) = 'object'),
  primary key (version_id, assessment_id)
);

create table public.workshop_classes (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  version_id uuid not null references public.workshop_versions(id) on delete restrict,
  instructor_id uuid not null references public.instructors(user_id) on delete restrict,
  title text not null check (char_length(title) between 3 and 120),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6,10}$'),
  archived boolean not null default false,
  join_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workshop_join_attempts (
  id bigint generated always as identity primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);

create table public.workshop_enrollments (
  class_id uuid not null references public.workshop_classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (class_id, student_id)
);

create table public.workshop_saved_lessons (
  student_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.workshop_classes(id) on delete set null,
  version_id uuid not null references public.workshop_versions(id) on delete restrict,
  lesson_id text not null,
  saved_at timestamptz not null default now(),
  primary key (student_id, version_id, lesson_id)
);

create table public.workshop_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  class_id uuid not null references public.workshop_classes(id) on delete restrict,
  version_id uuid not null references public.workshop_versions(id) on delete restrict,
  assessment_id text not null,
  student_id uuid not null references auth.users(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  percentage numeric(5,2) not null check (percentage between 0 and 100),
  passed boolean not null,
  late boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (class_id, assessment_id, student_id, attempt_number)
);

create table public.workshop_grades (
  class_id uuid not null references public.workshop_classes(id) on delete cascade,
  assessment_id text not null,
  student_id uuid not null references auth.users(id) on delete cascade,
  recorded_attempt_id uuid not null references public.workshop_attempts(id) on delete restrict,
  recorded_score integer not null,
  total integer not null,
  percentage numeric(5,2) not null,
  updated_at timestamptz not null default now(),
  primary key (class_id, assessment_id, student_id)
);

create table public.workshop_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  workshop_id uuid references public.workshops(id) on delete set null,
  summary text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_instructor()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.instructors where user_id = (select auth.uid()) and revoked_at is null);
$$;

create or replace function public.owns_workshop(target_workshop_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_instructor() and exists (select 1 from public.workshops where id = target_workshop_id and instructor_id = (select auth.uid()));
$$;

create or replace function public.get_mobile_account_role()
returns text language sql stable security definer set search_path = '' as $$
  select case when public.is_instructor() then 'instructor' else 'student' end;
$$;

create or replace function public.request_instructor_access(p_display_name text, p_institution text, p_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(trim(p_display_name)) not between 2 and 80 then raise exception 'INVALID_NAME'; end if;
  if char_length(trim(p_institution)) not between 2 and 160 then raise exception 'INVALID_INSTITUTION'; end if;
  insert into public.instructor_requests (user_id, display_name, institution, reason, status, requested_at, reviewed_at, reviewed_by)
  values ((select auth.uid()), trim(p_display_name), trim(p_institution), left(trim(coalesce(p_reason, '')), 1000), 'pending', now(), null, null)
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    institution = excluded.institution,
    reason = excluded.reason,
    status = case when instructor_requests.status = 'approved' then 'approved' else 'pending' end,
    requested_at = case when instructor_requests.status = 'approved' then instructor_requests.requested_at else now() end,
    reviewed_at = case when instructor_requests.status = 'approved' then instructor_requests.reviewed_at else null end,
    reviewed_by = case when instructor_requests.status = 'approved' then instructor_requests.reviewed_by else null end;
end;
$$;

create or replace function public.review_instructor_request(p_user_id uuid, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_content_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_user_id = (select auth.uid()) then raise exception 'SELF_APPROVAL_FORBIDDEN'; end if;
  if p_decision not in ('approved', 'declined', 'revoked') then raise exception 'INVALID_DECISION'; end if;
  if not exists (select 1 from public.instructor_requests where user_id = p_user_id) then raise exception 'REQUEST_NOT_FOUND'; end if;
  update public.instructor_requests set status = p_decision, reviewed_at = now(), reviewed_by = (select auth.uid()) where user_id = p_user_id;
  if p_decision = 'approved' then
    insert into public.instructors (user_id, approved_by, approved_at, revoked_at)
    values (p_user_id, (select auth.uid()), now(), null)
    on conflict (user_id) do update set approved_by = excluded.approved_by, approved_at = now(), revoked_at = null;
  elsif p_decision = 'revoked' then
    update public.instructors set revoked_at = now() where user_id = p_user_id;
  end if;
end;
$$;

create or replace function public.publish_workshop_release(
  p_actor_id uuid,
  p_request_id uuid,
  p_workshop_id uuid,
  p_version_id uuid,
  p_version integer,
  p_manifest jsonb,
  p_package jsonb,
  p_checksum text,
  p_answer_keys jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare prior jsonb;
declare item jsonb;
declare result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_workshop_id::text, 0));
  select request.result into prior from public.workshop_publish_requests request
  where request.request_id = p_request_id and request.instructor_id = p_actor_id;
  if prior is not null then return prior; end if;
  if not exists (select 1 from public.instructors where user_id = p_actor_id and revoked_at is null) then raise exception 'INSTRUCTOR_REQUIRED'; end if;
  if not exists (select 1 from public.workshops where id = p_workshop_id and instructor_id = p_actor_id and not archived) then raise exception 'WORKSHOP_NOT_FOUND'; end if;
  if p_version <> coalesce((select max(version) + 1 from public.workshop_versions where workshop_id = p_workshop_id), 1) then raise exception 'VERSION_CHANGED'; end if;
  if p_checksum !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_CHECKSUM'; end if;

  insert into public.workshop_versions (id, workshop_id, version, manifest, package, checksum, published_by)
  values (p_version_id, p_workshop_id, p_version, p_manifest, p_package, p_checksum, p_actor_id);
  for item in select * from jsonb_array_elements(coalesce(p_answer_keys, '[]'::jsonb)) loop
    insert into public.workshop_assessment_keys (version_id, assessment_id, answer_key, explanations)
    values (p_version_id, item->>'assessmentId', item->'answerKey', coalesce(item->'explanations', '{}'::jsonb));
  end loop;
  update public.workshops set current_version_id = p_version_id, updated_at = now() where id = p_workshop_id;
  result := jsonb_build_object('versionId', p_version_id, 'version', p_version, 'checksum', left(p_checksum, 12));
  insert into public.workshop_publish_requests (request_id, instructor_id, workshop_id, version_id, result)
  values (p_request_id, p_actor_id, p_workshop_id, p_version_id, result);
  insert into public.workshop_audit_log (actor_id, action, workshop_id, summary)
  values (p_actor_id, 'published', p_workshop_id, format('Published version %s.', p_version));
  return result;
end;
$$;

create or replace function public.record_workshop_submission(
  p_request_id uuid,
  p_student_id uuid,
  p_class_id uuid,
  p_version_id uuid,
  p_assessment_id text,
  p_answers jsonb,
  p_score integer,
  p_total integer,
  p_percentage numeric,
  p_passed boolean,
  p_late boolean,
  p_maximum_attempts integer,
  p_grade_policy text,
  p_submitted_at timestamptz
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare prior public.workshop_attempts;
declare inserted public.workshop_attempts;
declare current_grade public.workshop_grades;
declare next_attempt integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_class_id::text || ':' || p_assessment_id || ':' || p_student_id::text, 0));
  select attempt.* into prior from public.workshop_attempts attempt where attempt.request_id = p_request_id;
  if prior.id is not null then
    if prior.student_id <> p_student_id then raise exception 'REQUEST_CONFLICT'; end if;
    return to_jsonb(prior);
  end if;
  if p_grade_policy not in ('highest', 'latest', 'first') then raise exception 'INVALID_GRADE_POLICY'; end if;
  if p_maximum_attempts < 1 or p_maximum_attempts > 20 then raise exception 'INVALID_ATTEMPT_LIMIT'; end if;
  if not exists (
    select 1 from public.workshop_enrollments enrollment
    join public.workshop_classes class on class.id = enrollment.class_id
    where enrollment.class_id = p_class_id and enrollment.student_id = p_student_id
      and enrollment.left_at is null and class.version_id = p_version_id
  ) then raise exception 'ENROLLMENT_REQUIRED'; end if;

  select count(*)::integer + 1 into next_attempt from public.workshop_attempts
  where class_id = p_class_id and assessment_id = p_assessment_id and student_id = p_student_id;
  if next_attempt > p_maximum_attempts then raise exception 'ATTEMPT_LIMIT'; end if;

  insert into public.workshop_attempts (
    request_id, class_id, version_id, assessment_id, student_id, attempt_number,
    answers, score, total, percentage, passed, late, submitted_at
  ) values (
    p_request_id, p_class_id, p_version_id, p_assessment_id, p_student_id, next_attempt,
    p_answers, p_score, p_total, p_percentage, p_passed, p_late, p_submitted_at
  ) returning * into inserted;

  select grade.* into current_grade from public.workshop_grades grade
  where grade.class_id = p_class_id and grade.assessment_id = p_assessment_id and grade.student_id = p_student_id;
  if current_grade.recorded_attempt_id is null
    or p_grade_policy = 'latest'
    or (p_grade_policy = 'highest' and inserted.percentage > current_grade.percentage) then
    insert into public.workshop_grades (
      class_id, assessment_id, student_id, recorded_attempt_id, recorded_score, total, percentage, updated_at
    ) values (
      p_class_id, p_assessment_id, p_student_id, inserted.id, inserted.score, inserted.total, inserted.percentage, p_submitted_at
    ) on conflict (class_id, assessment_id, student_id) do update set
      recorded_attempt_id = excluded.recorded_attempt_id,
      recorded_score = excluded.recorded_score,
      total = excluded.total,
      percentage = excluded.percentage,
      updated_at = excluded.updated_at;
  end if;
  return to_jsonb(inserted);
end;
$$;

create or replace function public.join_workshop_class(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target public.workshop_classes;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if (select count(*) from public.workshop_join_attempts where student_id = (select auth.uid()) and attempted_at > now() - interval '10 minutes') >= 8 then
    raise exception 'TOO_MANY_ATTEMPTS';
  end if;
  insert into public.workshop_join_attempts (student_id) values ((select auth.uid()));
  select class.* into target from public.workshop_classes class
  join public.workshops workshop on workshop.id = class.workshop_id
  where class.join_code = upper(trim(p_code)) and class.join_enabled and not class.archived and not workshop.archived;
  if target.id is null then raise exception 'CLASS_NOT_FOUND'; end if;
  insert into public.workshop_enrollments (class_id, student_id, left_at)
  values (target.id, (select auth.uid()), null)
  on conflict (class_id, student_id) do update set left_at = null;
  update public.workshop_join_attempts set succeeded = true where id = (select max(id) from public.workshop_join_attempts where student_id = (select auth.uid()));
  return jsonb_build_object('classId', target.id, 'versionId', target.version_id, 'joined', true);
end;
$$;

create or replace function public.get_my_workshop_library()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'classId', class.id,
    'title', class.title,
    'joinedAt', enrollment.joined_at,
    'manifest', version.package,
    'savedLessonIds', coalesce((select jsonb_agg(saved.lesson_id) from public.workshop_saved_lessons saved where saved.student_id = (select auth.uid()) and saved.version_id = version.id), '[]'::jsonb)
  ) order by enrollment.joined_at desc), '[]'::jsonb)
  from public.workshop_enrollments enrollment
  join public.workshop_classes class on class.id = enrollment.class_id
  join public.workshop_versions version on version.id = class.version_id
  where enrollment.student_id = (select auth.uid()) and enrollment.left_at is null;
$$;

create or replace function public.set_workshop_lesson_saved(p_class_id uuid, p_lesson_id text, p_saved boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare target_version uuid;
begin
  select class.version_id into target_version from public.workshop_classes class
  join public.workshop_enrollments enrollment on enrollment.class_id = class.id
  where class.id = p_class_id and enrollment.student_id = (select auth.uid()) and enrollment.left_at is null;
  if target_version is null then raise exception 'ENROLLMENT_REQUIRED'; end if;
  if p_saved then
    insert into public.workshop_saved_lessons (student_id, class_id, version_id, lesson_id)
    values ((select auth.uid()), p_class_id, target_version, p_lesson_id) on conflict do nothing;
  else
    delete from public.workshop_saved_lessons where student_id = (select auth.uid()) and version_id = target_version and lesson_id = p_lesson_id;
  end if;
end;
$$;

do $$ declare name text; begin
  foreach name in array array['instructors','instructor_requests','workshops','workshop_lessons','workshop_topologies','workshop_assessments','workshop_flashcards','workshop_versions','workshop_publish_requests','workshop_assessment_keys','workshop_classes','workshop_join_attempts','workshop_enrollments','workshop_saved_lessons','workshop_attempts','workshop_grades','workshop_audit_log'] loop
    execute format('alter table public.%I enable row level security', name);
  end loop;
end $$;

create policy instructors_read_self on public.instructors for select to authenticated using (user_id = (select auth.uid()));
create policy instructors_admin_all on public.instructors for all to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
create policy instructor_requests_self on public.instructor_requests for select to authenticated using (user_id = (select auth.uid()));
create policy instructor_requests_admin_read on public.instructor_requests for select to authenticated using (public.is_content_admin());
create policy workshops_owner_all on public.workshops for all to authenticated using (instructor_id = (select auth.uid()) and public.is_instructor()) with check (instructor_id = (select auth.uid()) and public.is_instructor());
create policy workshop_lessons_owner_all on public.workshop_lessons for all to authenticated using (public.owns_workshop(workshop_id)) with check (public.owns_workshop(workshop_id));
create policy workshop_topologies_owner_all on public.workshop_topologies for all to authenticated using (public.owns_workshop(workshop_id)) with check (public.owns_workshop(workshop_id));
create policy workshop_assessments_owner_all on public.workshop_assessments for all to authenticated using (public.owns_workshop(workshop_id)) with check (public.owns_workshop(workshop_id));
create policy workshop_flashcards_owner_all on public.workshop_flashcards for all to authenticated using (public.owns_workshop(workshop_id)) with check (public.owns_workshop(workshop_id));
create policy workshop_versions_owner_read on public.workshop_versions for select to authenticated using (public.owns_workshop(workshop_id));
create policy workshop_versions_enrolled_read on public.workshop_versions for select to authenticated using (exists (
  select 1 from public.workshop_classes class join public.workshop_enrollments enrollment on enrollment.class_id = class.id
  where class.version_id = workshop_versions.id and enrollment.student_id = (select auth.uid()) and enrollment.left_at is null
));
create policy workshop_classes_owner_all on public.workshop_classes for all to authenticated using (instructor_id = (select auth.uid()) and public.is_instructor()) with check (instructor_id = (select auth.uid()) and public.owns_workshop(workshop_id));
create policy workshop_enrollments_student_read on public.workshop_enrollments for select to authenticated using (student_id = (select auth.uid()));
create policy workshop_saved_lessons_student_all on public.workshop_saved_lessons for all to authenticated
using (student_id = (select auth.uid()))
with check (
  student_id = (select auth.uid()) and exists (
    select 1 from public.workshop_enrollments enrollment
    join public.workshop_classes class on class.id = enrollment.class_id
    where enrollment.student_id = (select auth.uid())
      and enrollment.left_at is null
      and class.version_id = workshop_saved_lessons.version_id
  )
);
create policy workshop_attempts_student_read on public.workshop_attempts for select to authenticated using (student_id = (select auth.uid()));
create policy workshop_grades_student_read on public.workshop_grades for select to authenticated using (student_id = (select auth.uid()));
create policy workshop_audit_owner_read on public.workshop_audit_log for select to authenticated using (actor_id = (select auth.uid()) or public.owns_workshop(workshop_id));

revoke all on public.workshop_assessment_keys from anon, authenticated;
revoke all on public.workshop_publish_requests, public.workshop_join_attempts from anon, authenticated;
revoke insert, update, delete on public.instructors, public.instructor_requests from authenticated;
revoke insert, update, delete on public.workshop_versions, public.workshop_attempts, public.workshop_grades, public.workshop_audit_log from authenticated;
grant execute on function public.get_mobile_account_role() to authenticated;
grant execute on function public.request_instructor_access(text, text, text) to authenticated;
grant execute on function public.review_instructor_request(uuid, text) to authenticated;
revoke all on function public.publish_workshop_release(uuid, uuid, uuid, uuid, integer, jsonb, jsonb, text, jsonb) from anon, authenticated;
grant execute on function public.publish_workshop_release(uuid, uuid, uuid, uuid, integer, jsonb, jsonb, text, jsonb) to service_role;
revoke all on function public.record_workshop_submission(uuid, uuid, uuid, uuid, text, jsonb, integer, integer, numeric, boolean, boolean, integer, text, timestamptz) from anon, authenticated;
grant execute on function public.record_workshop_submission(uuid, uuid, uuid, uuid, text, jsonb, integer, integer, numeric, boolean, boolean, integer, text, timestamptz) to service_role;
grant execute on function public.join_workshop_class(text) to authenticated;
grant execute on function public.get_my_workshop_library() to authenticated;
grant execute on function public.set_workshop_lesson_saved(uuid, text, boolean) to authenticated;

create index workshop_enrollments_student_idx on public.workshop_enrollments(student_id) where left_at is null;
create index workshop_attempts_gradebook_idx on public.workshop_attempts(class_id, assessment_id, student_id);
create index workshop_versions_workshop_idx on public.workshop_versions(workshop_id, version desc);
