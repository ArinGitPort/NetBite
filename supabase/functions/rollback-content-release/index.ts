import { adminCorsHeaders, adminJson, adminPreflight, requestId, safeAdminFailure } from '../_shared/admin-http.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';
import { authenticatedAdmin } from '../_shared/content-admin.ts';

Deno.serve(async (request) => {
  const early = adminPreflight(request); if (early) return early;
  if (request.method !== 'POST') return adminJson(request, { error: { code: 'METHOD_NOT_ALLOWED', message: 'This request is not supported.' } }, 405);
  const failureId = requestId();
  try {
    const body = await request.json();
    const operationId = typeof body.requestId === 'string' && /^[0-9a-f-]{36}$/i.test(body.requestId) ? body.requestId : '';
    if (typeof body.releaseId !== 'string' || !operationId) return adminJson(request, { error: { code: 'INVALID_RESTORE_REQUEST', message: 'Choose a published version and try again.' } }, 400);
    const admin = adminClient();
    const user = await authenticatedAdmin(request, userClient(request), admin);
    const { data: target, error: targetError } = await admin.from('content_releases').select('*').eq('id', body.releaseId).single();
    if (targetError || !target) return adminJson(request, { error: { code: 'RELEASE_NOT_FOUND', message: 'That published version is no longer available.' } }, 404);
    const changelog = `Restored version ${target.release_version}: ${target.changelog}`;
    const { data, error } = await admin.rpc('commit_content_release', {
      p_request_id: operationId,
      p_schema_version: target.schema_version,
      p_minimum_app_version: target.minimum_app_version,
      p_changelog: changelog,
      p_checksum: target.checksum,
      p_package: target.package,
      p_published_by: user.id,
      p_rollback_of: target.id,
      p_published_asset_ids: [],
    });
    if (error) throw error;
    return adminJson(request, data);
  } catch (error) {
    if (error instanceof Response) return new Response(error.body, { status: error.status, headers: { ...adminCorsHeaders(request), 'Content-Type': 'application/json' } });
    console.error(`[${failureId}] Curriculum restore failed.`);
    return safeAdminFailure(request, failureId, 'The previous version could not be restored. The active curriculum is unchanged.', 500);
  }
});
