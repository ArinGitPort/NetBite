import { corsHeaders, json, preflight } from '../_shared/http.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';
import { authenticatedAdmin, loadDraft, validateDraft } from '../_shared/content-admin.ts';

Deno.serve(async (request) => {
  const early = preflight(request); if (early) return early;
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const admin = adminClient();
    await authenticatedAdmin(request, userClient(request), admin, 'editor');
    const draft = await loadDraft(admin);
    const issues = validateDraft(draft);
    return json({ valid: issues.length === 0, issues, totals: { courses: draft.courses.length, chapters: draft.chapters.length, lessons: draft.lessons.length, quizQuestions: draft.quiz.length, flashcards: draft.flashcards.length, assets: draft.assets.length } });
  } catch (error) {
    if (error instanceof Response) return new Response(error.body, { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return json({ error: error instanceof Error ? error.message : 'Validation failed.' }, 500);
  }
});
