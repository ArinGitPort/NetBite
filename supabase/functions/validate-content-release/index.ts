import { adminCorsHeaders, adminJson, adminPreflight, requestId, safeAdminFailure } from '../_shared/admin-http.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';
import { authenticatedAdmin, loadDraft, sanitizeValidationIssues, validateAssetFiles, validateDraft } from '../_shared/content-admin.ts';

Deno.serve(async (request) => {
  const early = adminPreflight(request); if (early) return early;
  if (request.method !== 'POST') return adminJson(request, { error: { code: 'METHOD_NOT_ALLOWED', message: 'This request is not supported.' } }, 405);
  const failureId = requestId();
  try {
    const admin = adminClient();
    await authenticatedAdmin(request, userClient(request), admin);
    const draft = await loadDraft(admin);
    const issues = [...validateDraft(draft), ...await validateAssetFiles(admin, draft.assets)];
    return adminJson(request, { valid: issues.length === 0, issues: sanitizeValidationIssues(issues), totals: { courses: draft.courses.length, chapters: draft.chapters.length, lessons: draft.lessons.length, quizQuestions: draft.quiz.length, flashcards: draft.flashcards.length, assets: draft.assets.length } });
  } catch (error) {
    if (error instanceof Response) return new Response(error.body, { status: error.status, headers: { ...adminCorsHeaders(request), 'Content-Type': 'application/json' } });
    console.error(`[${failureId}] Curriculum validation failed.`);
    return safeAdminFailure(request, failureId, 'Validation could not be completed. Try again.', 500);
  }
});
