-- Keep project administration and instructor workshop ownership separate.
-- The administrator retains content_admins membership but no active instructor
-- membership. The dedicated instructor account receives instructor access only.

do $$
declare
  administrator_id uuid;
  instructor_id uuid;
begin
  select id into administrator_id
  from auth.users
  where lower(email) = 'instructor.admin@netbite.local'
  limit 1;

  select id into instructor_id
  from auth.users
  where lower(email) = 'instructor.demo@netbite.local'
  limit 1;

  if administrator_id is null then
    raise exception 'ADMINISTRATOR_ACCOUNT_NOT_FOUND';
  end if;
  if instructor_id is null then
    raise exception 'INSTRUCTOR_ACCOUNT_NOT_FOUND';
  end if;

  insert into public.content_admins (user_id, granted_by)
  values (administrator_id, null)
  on conflict (user_id) do nothing;

  delete from public.content_admins
  where user_id = instructor_id;

  update public.instructors
  set revoked_at = now()
  where user_id = administrator_id;

  update public.instructor_requests
  set status = 'revoked',
      reviewed_at = now(),
      reviewed_by = administrator_id
  where user_id = administrator_id;

  insert into public.instructors (user_id, approved_by, approved_at, revoked_at)
  values (instructor_id, administrator_id, now(), null)
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
    instructor_id,
    'NetBite Instructor',
    'NetBite',
    'Dedicated instructor demonstration account.',
    'approved',
    now(),
    now(),
    administrator_id
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      institution = excluded.institution,
      reason = excluded.reason,
      status = 'approved',
      reviewed_at = now(),
      reviewed_by = administrator_id;
end;
$$;
