import { corsHeaders, json, preflight } from '../_shared/http.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';
import { authenticatedAdmin } from '../_shared/content-admin.ts';

Deno.serve(async (request) => {
  const early = preflight(request); if (early) return early;
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const body = await request.json();
    if (typeof body.releaseId !== 'string') return json({ error: 'Release ID is required.' }, 400);
    const admin = adminClient();
    const user = await authenticatedAdmin(request, userClient(request), admin, 'publisher');
    const { data: target, error: targetError } = await admin.from('content_releases').select('*').eq('id', body.releaseId).single();
    if (targetError) throw targetError;
    const { data: releaseVersion, error: versionError } = await admin.rpc('reserve_content_release_version');
    if (versionError) throw versionError;
    const changelog = `Rollback to release ${target.release_version}: ${target.changelog}`;
    const { data: release, error: releaseError } = await admin.from('content_releases').insert({ release_version: releaseVersion, schema_version: target.schema_version, minimum_app_version: target.minimum_app_version, changelog, checksum: target.checksum, package: target.package, published_by: user.id, rollback_of: target.id }).select().single();
    if (releaseError) throw releaseError;
    const { error: publicationError } = await admin.from('content_publication').update({ active_release_id: release.id, updated_at: new Date().toISOString() }).eq('singleton', true);
    if (publicationError) throw publicationError;
    await admin.from('content_audit_log').insert({ actor_id: user.id, action: 'rollback', entity_type: 'content_release', entity_id: release.id, detail: { releaseVersion, rollbackOf: target.id } });
    return json({ releaseId: release.id, releaseVersion, schemaVersion: release.schema_version, minimumAppVersion: release.minimum_app_version, checksum: release.checksum, publishedAt: release.published_at, changelog });
  } catch (error) {
    if (error instanceof Response) return new Response(error.body, { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return json({ error: error instanceof Error ? error.message : 'Rollback failed.' }, 500);
  }
});
