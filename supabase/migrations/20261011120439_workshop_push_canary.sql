-- Canary-only push operations. Neither function is available to app clients.
create index if not exists workshop_push_deliveries_canary_idx
  on public.workshop_push_deliveries(class_id, created_at)
  where status in ('pending', 'processing');

create or replace function public.enqueue_workshop_due_reminders_for_class(p_class_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare queued integer;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if p_class_id is null then raise exception 'CANARY_CLASS_REQUIRED'; end if;
  with due as (
    select schedule.*, '24h'::text as reminder from public.workshop_assessment_due schedule
    where schedule.class_id = p_class_id
      and schedule.due_at > now() + interval '23 hours 50 minutes'
      and schedule.due_at <= now() + interval '24 hours'
    union all
    select schedule.*, '1h'::text as reminder from public.workshop_assessment_due schedule
    where schedule.class_id = p_class_id
      and schedule.due_at > now() + interval '50 minutes'
      and schedule.due_at <= now() + interval '1 hour'
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
revoke all on function public.enqueue_workshop_due_reminders_for_class(uuid) from public, anon, authenticated;
grant execute on function public.enqueue_workshop_due_reminders_for_class(uuid) to service_role;

create or replace function public.claim_workshop_push_deliveries_for_class(p_class_id uuid, p_limit integer default 100)
returns setof public.workshop_push_deliveries language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if p_class_id is null then raise exception 'CANARY_CLASS_REQUIRED'; end if;

  -- Never release an old queue after a rollout flag is enabled.
  update public.workshop_push_deliveries delivery
  set status = 'failed', expo_receipt = 'expired'
  where delivery.class_id = p_class_id and delivery.status in ('pending', 'processing')
    and delivery.created_at < now() - interval '1 hour';

  return query
  update public.workshop_push_deliveries delivery
  set status = 'processing', attempted_at = now(), attempt_count = delivery.attempt_count + 1
  where delivery.id in (
    select queued.id from public.workshop_push_deliveries queued
    where queued.class_id = p_class_id
      and queued.created_at >= now() - interval '1 hour'
      and ((queued.status = 'pending' and (queued.attempted_at is null or queued.attempted_at < now() - interval '5 minutes'))
        or (queued.status = 'processing' and queued.attempted_at < now() - interval '15 minutes'))
    order by queued.created_at limit least(greatest(p_limit, 1), 100)
    for update skip locked
  )
  returning delivery.*;
end;
$$;
revoke all on function public.claim_workshop_push_deliveries_for_class(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_workshop_push_deliveries_for_class(uuid, integer) to service_role;
