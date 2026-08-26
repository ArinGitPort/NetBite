-- NetBite instructor portal security hardening.
-- Consolidates the original editor/publisher roles into one approved admin list.

create table public.content_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.content_admins (user_id, granted_by, created_at)
select user_id, max(granted_by::text)::uuid, min(created_at)
from public.content_admin_roles
group by user_id
on conflict (user_id) do nothing;

alter table public.content_admins enable row level security;

alter table public.content_sources drop constraint if exists content_sources_url_check;
alter table public.content_sources add constraint content_sources_url_check check (
  url ~ '^https://[^/@:]+(?:\.[^/@:]+)+(?:[:/].*)?$'
  and url !~* '^https://(?:localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|\[?::1\]?)(?:[:/]|$)'
);

create or replace function public.is_content_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.content_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_content_admin() from public, anon;
grant execute on function public.is_content_admin() to authenticated;

create policy content_admins_read_own
on public.content_admins
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on public.content_admins from anon, authenticated;
grant select (user_id) on public.content_admins to authenticated;

-- Author identity comes from the verified JWT, never from browser payloads.
create or replace function public.stamp_content_lesson_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if tg_op = 'INSERT' then new.created_by := (select auth.uid()); end if;
    new.updated_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create or replace function public.stamp_content_update_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then new.updated_by := (select auth.uid()); end if;
  return new;
end;
$$;

create or replace function public.stamp_content_asset_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and tg_op = 'INSERT' then
    new.uploaded_by := (select auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists content_lessons_actor on public.content_lessons;
create trigger content_lessons_actor
before insert or update on public.content_lessons
for each row execute function public.stamp_content_lesson_actor();

drop trigger if exists content_quiz_actor on public.content_quiz_questions;
create trigger content_quiz_actor
before insert or update on public.content_quiz_questions
for each row execute function public.stamp_content_update_actor();

drop trigger if exists content_flashcards_actor on public.content_flashcards;
create trigger content_flashcards_actor
before insert or update on public.content_flashcards
for each row execute function public.stamp_content_update_actor();

drop trigger if exists content_sources_actor on public.content_sources;
create trigger content_sources_actor
before insert or update on public.content_sources
for each row execute function public.stamp_content_update_actor();

drop trigger if exists content_assets_actor on public.content_assets;
create trigger content_assets_actor
before insert on public.content_assets
for each row execute function public.stamp_content_asset_actor();

-- Replace all authoring policies with the single administrator check.
drop policy if exists content_courses_admin_read on public.content_courses;
drop policy if exists content_chapters_admin_read on public.content_chapters;
drop policy if exists content_illustrations_admin_read on public.content_allowed_illustrations;
drop policy if exists content_core_lessons_admin_read on public.content_core_lessons;
drop policy if exists content_lessons_admin_read on public.content_lessons;
drop policy if exists content_lessons_admin_insert on public.content_lessons;
drop policy if exists content_lessons_admin_update on public.content_lessons;
drop policy if exists content_quiz_admin_all on public.content_quiz_questions;
drop policy if exists content_flashcards_admin_all on public.content_flashcards;
drop policy if exists content_sources_admin_all on public.content_sources;
drop policy if exists content_assets_admin_read on public.content_assets;
drop policy if exists content_assets_admin_insert on public.content_assets;
drop policy if exists content_assets_admin_update on public.content_assets;
drop policy if exists content_assets_admin_delete on public.content_assets;
drop policy if exists content_releases_admin_read on public.content_releases;
drop policy if exists content_releases_public_active on public.content_releases;
drop policy if exists content_audit_admin_read on public.content_audit_log;

create policy content_courses_admin_read on public.content_courses for select to authenticated using (public.is_content_admin());
create policy content_chapters_admin_read on public.content_chapters for select to authenticated using (public.is_content_admin());
create policy content_illustrations_admin_read on public.content_allowed_illustrations for select to authenticated using (public.is_content_admin());
create policy content_core_lessons_admin_read on public.content_core_lessons for select to authenticated using (public.is_content_admin());
create policy content_lessons_admin_read on public.content_lessons for select to authenticated using (public.is_content_admin());
create policy content_lessons_admin_insert on public.content_lessons for insert to authenticated with check (public.is_content_admin() and requirement = 'supplemental');
create policy content_lessons_admin_update on public.content_lessons for update to authenticated using (public.is_content_admin()) with check (
  public.is_content_admin() and (
    requirement = 'supplemental' or exists (
      select 1 from public.content_core_lessons core
      where core.id = content_lessons.id and not content_lessons.archived
    )
  )
);
create policy content_quiz_admin_all on public.content_quiz_questions for all to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
create policy content_flashcards_admin_all on public.content_flashcards for all to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
create policy content_sources_admin_all on public.content_sources for all to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
create policy content_assets_admin_read on public.content_assets for select to authenticated using (public.is_content_admin());
create policy content_assets_admin_insert on public.content_assets for insert to authenticated with check (public.is_content_admin() and not published);
create policy content_assets_admin_update on public.content_assets for update to authenticated using (public.is_content_admin() and not published) with check (public.is_content_admin() and not published);
create policy content_assets_admin_delete on public.content_assets for delete to authenticated using (public.is_content_admin() and not published);
create policy content_releases_admin_read on public.content_releases for select to authenticated using (public.is_content_admin());

drop policy if exists content_asset_admin_read on storage.objects;
drop policy if exists content_asset_admin_insert on storage.objects;
drop policy if exists content_asset_admin_update on storage.objects;
drop policy if exists content_asset_admin_delete on storage.objects;
create policy content_asset_admin_read on storage.objects for select to authenticated using (bucket_id = 'netbite-content' and public.is_content_admin());
create policy content_asset_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'netbite-content' and name like 'drafts/%' and public.is_content_admin());
create policy content_asset_admin_update on storage.objects for update to authenticated using (
  bucket_id = 'netbite-content' and public.is_content_admin() and exists (
    select 1 from public.content_assets asset where asset.object_path = name and not asset.published
  )
) with check (bucket_id = 'netbite-content' and public.is_content_admin());
create policy content_asset_admin_delete on storage.objects for delete to authenticated using (
  bucket_id = 'netbite-content' and public.is_content_admin() and exists (
    select 1 from public.content_assets asset where asset.object_path = name and not asset.published
  )
);

create or replace function public.reorder_content_lessons(target_chapter_id text, ordered_ids text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare expected_count integer;
begin
  if not public.is_content_admin() then raise exception 'Administrator permission required'; end if;
  select count(*) into expected_count from public.content_lessons where chapter_id = target_chapter_id and not archived;
  if expected_count <> cardinality(ordered_ids)
    or expected_count <> (select count(distinct id) from unnest(ordered_ids) item(id))
    or exists (
      select 1 from unnest(ordered_ids) item(id)
      left join public.content_lessons lesson on lesson.id = item.id
      where lesson.id is null or lesson.chapter_id <> target_chapter_id or lesson.archived
    ) then
    raise exception 'The ordered lesson list must contain every active lesson in the chapter exactly once';
  end if;
  update public.content_lessons set position = position + 100000 where chapter_id = target_chapter_id and not archived;
  update public.content_lessons lesson
  set position = ordered.position
  from (select id, position::integer from unnest(ordered_ids) with ordinality as item(id, position)) ordered
  where lesson.id = ordered.id;
end;
$$;

-- The browser receives a human-readable audit projection, never raw detail JSON.
create or replace function public.get_sanitized_content_audit(requested_limit integer default 100)
returns table (
  id bigint,
  action_label text,
  content_label text,
  administrator_name text,
  summary text,
  occurred_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_content_admin() then raise exception 'Administrator permission required'; end if;
  return query
  select
    audit.id,
    case audit.action
      when 'insert' then 'Created'
      when 'update' then 'Updated'
      when 'delete' then 'Deleted'
      when 'publish' then 'Published'
      when 'rollback' then 'Restored previous version'
      else 'Changed'
    end,
    initcap(replace(replace(audit.entity_type, 'content_', ''), '_', ' ')),
    coalesce(profile.display_name, 'NetBite administrator'),
    case audit.action
      when 'publish' then 'Published a new curriculum version.'
      when 'rollback' then 'Restored an earlier curriculum version as a new release.'
      when 'insert' then 'Created a curriculum record.'
      when 'update' then 'Updated a curriculum record.'
      when 'delete' then 'Removed a curriculum record.'
      else 'Changed curriculum content.'
    end,
    audit.created_at
  from public.content_audit_log audit
  left join public.profiles profile on profile.id = audit.actor_id
  order by audit.created_at desc
  limit greatest(1, least(coalesce(requested_limit, 100), 100));
end;
$$;

revoke all on public.content_audit_log from anon, authenticated;
revoke all on function public.get_sanitized_content_audit(integer) from public, anon;
grant execute on function public.get_sanitized_content_audit(integer) to authenticated;

-- Learners receive only the active manifest and package, not release authorship.
create or replace function public.get_active_content_release()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'manifest', jsonb_build_object(
      'releaseId', release.id,
      'releaseVersion', release.release_version,
      'schemaVersion', release.schema_version,
      'minimumAppVersion', release.minimum_app_version,
      'checksum', release.checksum,
      'publishedAt', release.published_at,
      'changelog', release.changelog
    ),
    'package', release.package
  )
  from public.content_publication publication
  join public.content_releases release on release.id = publication.active_release_id
  where publication.singleton;
$$;

revoke select on public.content_releases from anon;
revoke all on function public.get_active_content_release() from public;
grant execute on function public.get_active_content_release() to anon, authenticated;

-- Realtime exposes only a version counter, never the internal active-release UUID.
drop policy if exists content_publication_public_read on public.content_publication;
revoke all on public.content_publication from anon, authenticated;

create table public.content_publication_notice (
  singleton boolean primary key default true check (singleton),
  release_version integer not null default 0 check (release_version >= 0),
  updated_at timestamptz not null default now()
);
insert into public.content_publication_notice (singleton, release_version)
select true, coalesce(release.release_version, 0)
from public.content_publication publication
left join public.content_releases release on release.id = publication.active_release_id
where publication.singleton
on conflict (singleton) do update set release_version = excluded.release_version, updated_at = now();
alter table public.content_publication_notice enable row level security;
create policy content_publication_notice_read on public.content_publication_notice
for select to anon, authenticated using (true);
grant select on public.content_publication_notice to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime drop table public.content_publication;
  exception when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.content_publication_notice;
  exception when duplicate_object then null;
  end;
end;
$$;

-- Idempotent, transactional release activation. Only trusted server code may call it.
create table public.content_release_requests (
  request_id uuid primary key,
  release_id uuid references public.content_releases(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.content_release_requests enable row level security;
revoke all on public.content_release_requests from anon, authenticated;

create or replace function public.commit_content_release(
  p_request_id uuid,
  p_schema_version integer,
  p_minimum_app_version text,
  p_changelog text,
  p_checksum text,
  p_package jsonb,
  p_published_by uuid,
  p_rollback_of uuid default null,
  p_published_asset_ids uuid[] default array[]::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_version integer;
  created_release public.content_releases;
  existing_release public.content_releases;
  inserted_request uuid;
begin
  insert into public.content_release_requests (request_id)
  values (p_request_id)
  on conflict do nothing
  returning content_release_requests.request_id into inserted_request;

  if inserted_request is null then
    select release.* into existing_release
    from public.content_release_requests request
    join public.content_releases release on release.id = request.release_id
    where request.request_id = p_request_id;
    if existing_release.id is null then raise exception 'Release request is still being processed'; end if;
    return jsonb_build_object(
      'releaseId', existing_release.id,
      'releaseVersion', existing_release.release_version,
      'schemaVersion', existing_release.schema_version,
      'minimumAppVersion', existing_release.minimum_app_version,
      'checksum', existing_release.checksum,
      'publishedAt', existing_release.published_at,
      'changelog', existing_release.changelog
    );
  end if;

  reserved_version := nextval('public.content_release_version_seq')::integer;
  insert into public.content_releases (
    release_version, schema_version, minimum_app_version, changelog,
    checksum, package, published_by, rollback_of
  ) values (
    reserved_version, p_schema_version, p_minimum_app_version,
    p_changelog, p_checksum, p_package, p_published_by,
    p_rollback_of
  ) returning * into created_release;

  update public.content_publication
  set active_release_id = created_release.id, updated_at = now()
  where singleton;

  update public.content_publication_notice
  set release_version = reserved_version, updated_at = now()
  where singleton;

  if cardinality(p_published_asset_ids) > 0 then
    update public.content_assets set published = true where id = any(p_published_asset_ids);
  end if;

  update public.content_release_requests set release_id = created_release.id
  where content_release_requests.request_id = p_request_id;

  insert into public.content_audit_log (actor_id, action, entity_type, entity_id, detail)
  values (
    p_published_by,
    case when p_rollback_of is null then 'publish' else 'rollback' end,
    'content_release',
    created_release.id::text,
    jsonb_build_object('releaseVersion', reserved_version)
  );

  return jsonb_build_object(
    'releaseId', created_release.id,
    'releaseVersion', created_release.release_version,
    'schemaVersion', created_release.schema_version,
    'minimumAppVersion', created_release.minimum_app_version,
    'checksum', created_release.checksum,
    'publishedAt', created_release.published_at,
    'changelog', created_release.changelog
  );
end;
$$;

revoke all on function public.commit_content_release(uuid, integer, text, text, text, jsonb, uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.commit_content_release(uuid, integer, text, text, text, jsonb, uuid, uuid, uuid[]) to service_role;

-- Remove the superseded role model after every dependency has moved.
drop policy if exists content_roles_read_own on public.content_admin_roles;
revoke all on public.content_admin_roles from anon, authenticated;
drop function if exists public.has_content_role(public.content_admin_role);
drop table public.content_admin_roles;
drop type public.content_admin_role;

comment on table public.content_admins is 'Administrators are assigned only by the Supabase project owner; the portal cannot grant access.';
