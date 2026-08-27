-- One-time project-owner bootstrap for the existing NetBite administration account.
-- This is intentionally performed through a reviewed database migration rather
-- than a browser-accessible role assignment path.

do $$
declare
  target_user_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = 'instructor.admin@netbite.local'
  limit 1;

  if target_user_id is null then
    raise exception 'BOOTSTRAP_ACCOUNT_NOT_FOUND';
  end if;

  insert into public.content_admins (user_id, granted_by)
  values (target_user_id, null)
  on conflict (user_id) do nothing;

  insert into public.instructors (user_id, approved_by, approved_at, revoked_at)
  values (target_user_id, target_user_id, now(), null)
  on conflict (user_id) do update
  set approved_by = excluded.approved_by,
      approved_at = excluded.approved_at,
      revoked_at = null;

  insert into public.instructor_requests (
    user_id,
    display_name,
    institution,
    reason,
    status,
    requested_at,
    reviewed_at,
    reviewed_by
  )
  values (
    target_user_id,
    'NetBite Administrator',
    'NetBite',
    'Project-owner administration account.',
    'approved',
    now(),
    now(),
    target_user_id
  )
  on conflict (user_id) do update
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = target_user_id;
end;
$$;
