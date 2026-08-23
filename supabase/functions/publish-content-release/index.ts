import { corsHeaders, json, preflight } from '../_shared/http.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';
import { authenticatedAdmin, buildPackage, loadDraft, sha256, validateDraft } from '../_shared/content-admin.ts';

Deno.serve(async (request) => {
  const early = preflight(request); if (early) return early;
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const body = await request.json();
    const changelog = typeof body.changelog === 'string' ? body.changelog.trim() : '';
    const minimumAppVersion = typeof body.minimumAppVersion === 'string' ? body.minimumAppVersion.trim() : '1.0.0';
    if (changelog.length < 3) return json({ error: 'A release changelog is required.' }, 400);
    const admin = adminClient();
    const user = await authenticatedAdmin(request, userClient(request), admin, 'publisher');
    const draft = await loadDraft(admin);
    const issues = validateDraft(draft);
    if (issues.length) return json({ error: 'Draft validation failed.', issues }, 422);
    const { data: releaseVersion, error: versionError } = await admin.rpc('reserve_content_release_version');
    if (versionError) throw versionError;
    const packagePayload = await buildPackage(admin, draft, Number(releaseVersion));
    const checksum = await sha256(packagePayload);
    const { data: release, error: releaseError } = await admin.from('content_releases').insert({ release_version: releaseVersion, schema_version: 1, minimum_app_version: minimumAppVersion, changelog, checksum, package: packagePayload, published_by: user.id }).select().single();
    if (releaseError) throw releaseError;
    const { error: publicationError } = await admin.from('content_publication').update({ active_release_id: release.id, updated_at: new Date().toISOString() }).eq('singleton', true);
    if (publicationError) throw publicationError;
    if (draft.assets.length) await admin.from('content_assets').update({ published: true }).in('id', draft.assets.map(({ id }) => id));
    await admin.from('content_audit_log').insert({ actor_id: user.id, action: 'publish', entity_type: 'content_release', entity_id: release.id, detail: { releaseVersion, changelog } });
    return json({ releaseId: release.id, releaseVersion, schemaVersion: 1, minimumAppVersion, checksum, publishedAt: release.published_at, changelog });
  } catch (error) {
    if (error instanceof Response) return new Response(error.body, { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return json({ error: error instanceof Error ? error.message : 'Publishing failed.' }, 500);
  }
});
