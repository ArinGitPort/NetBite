const { readFileSync } = require('fs');
const { join } = require('path');

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/202608260003_instructor_workshops.sql'), 'utf8');

describe('workshop database security migration', () => {
  test('keeps protected answers and server writes away from browser roles', () => {
    expect(migration).toContain('revoke all on public.workshop_assessment_keys from anon, authenticated');
    expect(migration).toContain('revoke insert, update, delete on public.workshop_versions, public.workshop_attempts, public.workshop_grades, public.workshop_audit_log from authenticated');
    expect(migration).toContain('grant execute on function public.record_workshop_submission');
    expect(migration).toContain('to service_role');
  });

  test('requires administrator review and prevents self-approval', () => {
    expect(migration).toContain("if p_user_id = (select auth.uid()) then raise exception 'SELF_APPROVAL_FORBIDDEN'");
    expect(migration).toContain('if not public.is_content_admin() then raise exception');
    expect(migration).toContain('revoke insert, update, delete on public.instructors, public.instructor_requests from authenticated');
  });

  test('rate-limits and revokes class enrollment', () => {
    expect(migration).toContain("raise exception 'TOO_MANY_ATTEMPTS'");
    expect(migration).toContain('class.join_enabled and not class.archived');
  });

  test('publishes and records submissions transactionally and idempotently', () => {
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('where request.request_id = p_request_id');
    expect(migration).toContain('where attempt.request_id = p_request_id');
  });
});
