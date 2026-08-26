import { adminCorsHeaders, adminJson, adminPreflight, requestId, safeAdminFailure } from '../_shared/admin-http.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';
import { authenticatedAdmin, buildPackage, loadDraft, sanitizeValidationIssues, sha256, validateAssetFiles, validateDraft } from '../_shared/content-admin.ts';

Deno.serve(async (request) => {
  const early = adminPreflight(request); if (early) return early;
  if (request.method !== 'POST') return adminJson(request, { error: { code: 'METHOD_NOT_ALLOWED', message: 'This request is not supported.' } }, 405);
  const failureId = requestId();
  try {
    const body = await request.json();
    const changelog = typeof body.changelog === 'string' ? body.changelog.trim() : '';
    const minimumAppVersion = typeof body.minimumAppVersion === 'string' ? body.minimumAppVersion.trim() : '1.0.0';
    const operationId = typeof body.requestId === 'string' && /^[0-9a-f-]{36}$/i.test(body.requestId) ? body.requestId : '';
    if (changelog.length < 3) return adminJson(request, { error: { code: 'CHANGELOG_REQUIRED', message: 'Describe what changed before publishing.' } }, 400);
    if (!/^\d+\.\d+\.\d+$/.test(minimumAppVersion)) return adminJson(request, { error: { code: 'INVALID_APP_VERSION', message: 'Use an Android app version such as 1.0.0.' } }, 400);
    if (!operationId) return adminJson(request, { error: { code: 'REQUEST_ID_REQUIRED', message: 'Start a new publish request and try again.' } }, 400);
    const admin = adminClient();
    const user = await authenticatedAdmin(request, userClient(request), admin);
    const draft = await loadDraft(admin);
    const issues = [...validateDraft(draft), ...await validateAssetFiles(admin, draft.assets)];
    if (issues.length) return adminJson(request, { error: { code: 'VALIDATION_FAILED', message: 'Resolve the listed content issues before publishing.' }, issues: sanitizeValidationIssues(issues) }, 422);
    const packagePayload = await buildPackage(admin, draft, operationId);
    const checksum = await sha256(packagePayload);
    const { data, error } = await admin.rpc('commit_content_release', {
      p_request_id: operationId,
      p_schema_version: 1,
      p_minimum_app_version: minimumAppVersion,
      p_changelog: changelog,
      p_checksum: checksum,
      p_package: packagePayload,
      p_published_by: user.id,
      p_rollback_of: null,
      p_published_asset_ids: draft.assets.map(({ id }) => id),
    });
    if (error) throw error;
    return adminJson(request, data);
  } catch (error) {
    if (error instanceof Response) return new Response(error.body, { status: error.status, headers: { ...adminCorsHeaders(request), 'Content-Type': 'application/json' } });
    console.error(`[${failureId}] Curriculum publication failed.`);
    return safeAdminFailure(request, failureId, 'The curriculum could not be published. Your draft is unchanged.', 500);
  }
});
