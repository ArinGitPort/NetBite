-- Store and expose a concise content label without returning raw audit detail.

create or replace function public.log_content_authoring_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_value jsonb;
  record_id text;
  safe_label text;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  record_value := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  record_id := record_value ->> 'id';
  safe_label := case tg_table_name
    when 'content_lessons' then record_value -> 'draft' ->> 'title'
    when 'content_quiz_questions' then record_value -> 'draft' ->> 'prompt'
    when 'content_flashcards' then record_value -> 'draft' ->> 'prompt'
    when 'content_sources' then record_value ->> 'label'
    when 'content_assets' then record_value ->> 'alt_text'
    else null
  end;
  insert into public.content_audit_log (actor_id, action, entity_type, entity_id, detail)
  values (
    (select auth.uid()), lower(tg_op), tg_table_name, record_id,
    jsonb_strip_nulls(jsonb_build_object(
      'chapterId', record_value ->> 'chapter_id',
      'contentLabel', nullif(left(safe_label, 180), '')
    ))
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

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
    coalesce(
      nullif(audit.detail ->> 'contentLabel', ''),
      case when audit.entity_type = 'content_release' and audit.detail ? 'releaseVersion'
        then 'Curriculum version ' || (audit.detail ->> 'releaseVersion')
        else initcap(replace(replace(audit.entity_type, 'content_', ''), '_', ' '))
      end
    ),
    coalesce(profile.display_name, 'NetBite administrator'),
    case audit.action
      when 'publish' then 'Published a new curriculum version.'
      when 'rollback' then 'Restored an earlier curriculum version as a new published version.'
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

revoke all on function public.get_sanitized_content_audit(integer) from public, anon;
grant execute on function public.get_sanitized_content_audit(integer) to authenticated;
