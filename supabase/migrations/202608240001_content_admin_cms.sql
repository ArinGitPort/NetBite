create type public.content_admin_role as enum ('editor', 'publisher');

create table public.content_admin_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.content_admin_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.content_courses (
  id text primary key,
  position integer not null check (position > 0),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_chapters (
  id text primary key,
  course_id text not null references public.content_courses(id) on delete restrict,
  position integer not null check (position > 0),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create table public.content_allowed_illustrations (
  id text primary key
);

create table public.content_core_lessons (
  id text primary key
);

create table public.content_lessons (
  id text primary key,
  chapter_id text not null references public.content_chapters(id) on delete restrict,
  position integer not null check (position > 0),
  requirement text not null default 'supplemental' check (requirement in ('core', 'supplemental')),
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  archived boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, position)
);

create table public.content_quiz_questions (
  id text primary key,
  chapter_id text not null references public.content_chapters(id) on delete cascade,
  lesson_id text not null references public.content_lessons(id) on delete restrict,
  position integer not null check (position > 0),
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  archived boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, position)
);

create table public.content_flashcards (
  id text primary key,
  chapter_id text not null references public.content_chapters(id) on delete cascade,
  lesson_id text not null references public.content_lessons(id) on delete restrict,
  position integer not null check (position > 0),
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  archived boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, position)
);

create table public.content_sources (
  id uuid primary key default gen_random_uuid(),
  lesson_id text references public.content_lessons(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 160),
  url text not null check (url ~ '^https://'),
  notes text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id text references public.content_lessons(id) on delete set null,
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 5242880),
  width integer not null check (width between 1 and 4096),
  height integer not null check (height between 1 and 4096),
  alt_text text not null check (char_length(alt_text) between 5 and 500),
  published boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_releases (
  id uuid primary key default gen_random_uuid(),
  release_version integer not null unique check (release_version > 0),
  schema_version integer not null check (schema_version > 0),
  minimum_app_version text not null,
  changelog text not null check (char_length(changelog) between 3 and 2000),
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  package jsonb not null check (jsonb_typeof(package) = 'object'),
  published_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz not null default now(),
  rollback_of uuid references public.content_releases(id) on delete restrict
);

create sequence public.content_release_version_seq;
create or replace function public.reserve_content_release_version()
returns integer language sql security definer set search_path = '' as $$
  select nextval('public.content_release_version_seq')::integer;
$$;
revoke all on function public.reserve_content_release_version() from public, anon, authenticated;
grant execute on function public.reserve_content_release_version() to service_role;

create table public.content_publication (
  singleton boolean primary key default true check (singleton),
  active_release_id uuid references public.content_releases(id) on delete restrict,
  updated_at timestamptz not null default now()
);
insert into public.content_publication (singleton) values (true) on conflict do nothing;

create table public.content_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.log_content_authoring_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  record_value jsonb;
  record_id text;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  record_value := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  record_id := record_value ->> 'id';
  insert into public.content_audit_log (actor_id, action, entity_type, entity_id, detail)
  values ((select auth.uid()), lower(tg_op), tg_table_name, record_id, jsonb_build_object('chapterId', record_value ->> 'chapter_id'));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.has_content_role(requested_role public.content_admin_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.content_admin_roles
    where user_id = (select auth.uid())
      and (role = requested_role or (requested_role = 'editor' and role = 'publisher'))
  );
$$;

create or replace function public.reorder_content_lessons(target_chapter_id text, ordered_ids text[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  expected_count integer;
begin
  if not public.has_content_role('editor') then
    raise exception 'Editor permission required';
  end if;
  select count(*) into expected_count
  from public.content_lessons
  where chapter_id = target_chapter_id and not archived;
  if expected_count <> cardinality(ordered_ids)
    or expected_count <> (select count(distinct id) from unnest(ordered_ids) item(id))
    or exists (
      select 1 from unnest(ordered_ids) item(id)
      left join public.content_lessons lesson on lesson.id = item.id
      where lesson.id is null or lesson.chapter_id <> target_chapter_id or lesson.archived
    ) then
    raise exception 'The ordered lesson list must contain every active lesson in the chapter exactly once';
  end if;
  update public.content_lessons
  set position = position + 100000
  where chapter_id = target_chapter_id and not archived;
  update public.content_lessons lesson
  set position = ordered.position
  from (select id, position::integer from unnest(ordered_ids) with ordinality as item(id, position)) ordered
  where lesson.id = ordered.id;
end;
$$;

revoke all on function public.has_content_role(public.content_admin_role) from public;
grant execute on function public.has_content_role(public.content_admin_role) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'content_admin_roles','content_courses','content_chapters','content_allowed_illustrations','content_core_lessons','content_lessons',
    'content_quiz_questions','content_flashcards','content_sources','content_assets',
    'content_releases','content_publication','content_audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy content_roles_read_own on public.content_admin_roles for select to authenticated using (user_id = (select auth.uid()));
create policy content_courses_admin_read on public.content_courses for select to authenticated using (public.has_content_role('editor'));
create policy content_chapters_admin_read on public.content_chapters for select to authenticated using (public.has_content_role('editor'));
create policy content_illustrations_admin_read on public.content_allowed_illustrations for select to authenticated using (public.has_content_role('editor'));
create policy content_core_lessons_admin_read on public.content_core_lessons for select to authenticated using (public.has_content_role('editor'));

create policy content_lessons_admin_read on public.content_lessons for select to authenticated using (public.has_content_role('editor'));
create policy content_lessons_admin_insert on public.content_lessons for insert to authenticated with check (public.has_content_role('editor') and requirement = 'supplemental');
create policy content_lessons_admin_update on public.content_lessons for update to authenticated using (public.has_content_role('editor')) with check (
  public.has_content_role('editor') and (
    requirement = 'supplemental' or exists (select 1 from public.content_core_lessons core where core.id = content_lessons.id and not content_lessons.archived)
  )
);

create policy content_quiz_admin_all on public.content_quiz_questions for all to authenticated using (public.has_content_role('editor')) with check (public.has_content_role('editor'));
create policy content_flashcards_admin_all on public.content_flashcards for all to authenticated using (public.has_content_role('editor')) with check (public.has_content_role('editor'));
create policy content_sources_admin_all on public.content_sources for all to authenticated using (public.has_content_role('editor')) with check (public.has_content_role('editor'));
create policy content_assets_admin_read on public.content_assets for select to authenticated using (public.has_content_role('editor'));
create policy content_assets_admin_insert on public.content_assets for insert to authenticated with check (public.has_content_role('editor') and not published);
create policy content_assets_admin_update on public.content_assets for update to authenticated using (public.has_content_role('editor') and not published) with check (public.has_content_role('editor') and not published);
create policy content_assets_admin_delete on public.content_assets for delete to authenticated using (public.has_content_role('editor') and not published);

create policy content_releases_admin_read on public.content_releases for select to authenticated using (public.has_content_role('editor'));
create policy content_releases_public_active on public.content_releases for select to anon, authenticated using (
  id = (select active_release_id from public.content_publication where singleton)
);
create policy content_publication_public_read on public.content_publication for select to anon, authenticated using (true);
create policy content_audit_admin_read on public.content_audit_log for select to authenticated using (public.has_content_role('editor'));

revoke all on public.content_admin_roles, public.content_courses, public.content_chapters,
  public.content_allowed_illustrations, public.content_core_lessons,
  public.content_lessons, public.content_quiz_questions, public.content_flashcards,
  public.content_sources, public.content_assets, public.content_releases,
  public.content_publication, public.content_audit_log from anon, authenticated;
grant select on public.content_admin_roles, public.content_courses, public.content_chapters,
  public.content_allowed_illustrations, public.content_core_lessons,
  public.content_lessons, public.content_quiz_questions, public.content_flashcards,
  public.content_sources, public.content_assets, public.content_releases,
  public.content_publication, public.content_audit_log to authenticated;
grant insert, update on public.content_lessons, public.content_quiz_questions,
  public.content_flashcards, public.content_sources, public.content_assets to authenticated;
grant delete on public.content_quiz_questions, public.content_flashcards,
  public.content_sources, public.content_assets to authenticated;
grant select on public.content_releases, public.content_publication to anon;
revoke all on function public.reorder_content_lessons(text, text[]) from public, anon;
grant execute on function public.reorder_content_lessons(text, text[]) to authenticated;

create trigger content_courses_updated before update on public.content_courses for each row execute function public.set_updated_at();
create trigger content_chapters_updated before update on public.content_chapters for each row execute function public.set_updated_at();
create trigger content_lessons_updated before update on public.content_lessons for each row execute function public.set_updated_at();
create trigger content_quiz_updated before update on public.content_quiz_questions for each row execute function public.set_updated_at();
create trigger content_flashcards_updated before update on public.content_flashcards for each row execute function public.set_updated_at();
create trigger content_sources_updated before update on public.content_sources for each row execute function public.set_updated_at();
create trigger content_assets_updated before update on public.content_assets for each row execute function public.set_updated_at();
create trigger content_lessons_audit after insert or update or delete on public.content_lessons for each row execute function public.log_content_authoring_change();
create trigger content_quiz_audit after insert or update or delete on public.content_quiz_questions for each row execute function public.log_content_authoring_change();
create trigger content_flashcards_audit after insert or update or delete on public.content_flashcards for each row execute function public.log_content_authoring_change();
create trigger content_sources_audit after insert or update or delete on public.content_sources for each row execute function public.log_content_authoring_change();
create trigger content_assets_audit after insert or update or delete on public.content_assets for each row execute function public.log_content_authoring_change();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('netbite-content', 'netbite-content', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('netbite-content-public', 'netbite-content-public', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy content_asset_admin_read on storage.objects for select to authenticated using (bucket_id = 'netbite-content' and public.has_content_role('editor'));
create policy content_asset_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'netbite-content' and name like 'drafts/%' and public.has_content_role('editor'));
create policy content_asset_admin_update on storage.objects for update to authenticated using (bucket_id = 'netbite-content' and public.has_content_role('editor') and exists (select 1 from public.content_assets asset where asset.object_path = name and not asset.published)) with check (bucket_id = 'netbite-content' and public.has_content_role('editor'));
create policy content_asset_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'netbite-content' and public.has_content_role('editor') and exists (select 1 from public.content_assets asset where asset.object_path = name and not asset.published));
comment on table public.content_admin_roles is 'Bootstrap the first administrator manually in Supabase; the application cannot self-grant roles.';

do $$
begin
  alter publication supabase_realtime add table public.content_publication;
exception when duplicate_object then null;
end $$;
