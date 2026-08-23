import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type ContentRole = 'editor' | 'publisher';

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
    .join(',')}}`;
}

export async function sha256(value: unknown) {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function authenticatedAdmin(request: Request, userClient: SupabaseClient, admin: SupabaseClient, required: ContentRole) {
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401 });
  const { data: roles, error: roleError } = await admin.from('content_admin_roles').select('role').eq('user_id', user.id);
  if (roleError) throw roleError;
  const allowed = roles?.some(({ role }) => role === required || (required === 'editor' && role === 'publisher'));
  if (!allowed) throw new Response(JSON.stringify({ error: `${required === 'publisher' ? 'Publisher' : 'Editor'} permission required.` }), { status: 403 });
  return user;
}

function nonEmpty(value: unknown) { return typeof value === 'string' && value.trim().length > 0; }

export async function loadDraft(admin: SupabaseClient) {
  const [courses, chapters, lessons, quiz, flashcards, sources, assets, illustrations, coreLessons] = await Promise.all([
    admin.from('content_courses').select('*').order('position'),
    admin.from('content_chapters').select('*').order('course_id').order('position'),
    admin.from('content_lessons').select('*').eq('archived', false).order('chapter_id').order('position'),
    admin.from('content_quiz_questions').select('*').eq('archived', false).order('chapter_id').order('position'),
    admin.from('content_flashcards').select('*').eq('archived', false).order('chapter_id').order('position'),
    admin.from('content_sources').select('*').order('created_at'),
    admin.from('content_assets').select('*').order('created_at'),
    admin.from('content_allowed_illustrations').select('id'),
    admin.from('content_core_lessons').select('id'),
  ]);
  const failed = [courses, chapters, lessons, quiz, flashcards, sources, assets, illustrations, coreLessons].find(({ error }) => error);
  if (failed?.error) throw failed.error;
  return { courses: courses.data ?? [], chapters: chapters.data ?? [], lessons: lessons.data ?? [], quiz: quiz.data ?? [], flashcards: flashcards.data ?? [], sources: sources.data ?? [], assets: assets.data ?? [], illustrations: illustrations.data ?? [], coreLessons: coreLessons.data ?? [] };
}

export function validateDraft(draft: Awaited<ReturnType<typeof loadDraft>>) {
  const issues: Array<{ path: string; message: string }> = [];
  if (draft.courses.length !== 2) issues.push({ path: 'courses', message: 'Seed both fixed NetBite courses before publishing.' });
  if (draft.chapters.length !== 23) issues.push({ path: 'chapters', message: 'All 23 fixed chapters must be present.' });
  const lessonIds = new Set<string>();
  const allowedIllustrations = new Set(draft.illustrations.map(({ id }) => id));
  const coreLessonIds = new Set(draft.coreLessons.map(({ id }) => id));
  for (const row of draft.lessons) {
    const lesson = row.draft as Record<string, unknown>;
    if (lessonIds.has(row.id)) issues.push({ path: `lessons.${row.id}`, message: 'Lesson ID is duplicated.' });
    lessonIds.add(row.id);
    if (!nonEmpty(lesson.title) || !nonEmpty(lesson.body) || !nonEmpty(lesson.takeaway) || !nonEmpty(lesson.illustration)) issues.push({ path: `lessons.${row.id}`, message: 'Title, body, takeaway, and illustration are required.' });
    if (!allowedIllustrations.has(String(lesson.illustration))) issues.push({ path: `lessons.${row.id}.illustration`, message: 'The lesson uses an illustration type that this app version does not support.' });
    if (coreLessonIds.has(row.id) && row.requirement !== 'core') issues.push({ path: `lessons.${row.id}.requirement`, message: 'A bundled core lesson cannot become supplemental.' });
    if (!coreLessonIds.has(row.id) && row.requirement !== 'supplemental') issues.push({ path: `lessons.${row.id}.requirement`, message: 'New lessons must remain supplemental.' });
    if (lesson.id !== row.id || lesson.chapterId !== row.chapter_id) issues.push({ path: `lessons.${row.id}`, message: 'Stable lesson ID or chapter mapping changed.' });
  }
  for (const coreLessonId of coreLessonIds) if (!lessonIds.has(coreLessonId)) issues.push({ path: `lessons.${coreLessonId}`, message: 'Bundled core lessons cannot be archived or removed.' });
  for (const row of draft.quiz) {
    const item = row.draft as Record<string, unknown>;
    const answers = Array.isArray(item.answers) ? item.answers : [];
    if (!lessonIds.has(row.lesson_id) || answers.length < 2 || !Number.isInteger(item.correctAnswerIndex) || Number(item.correctAnswerIndex) < 0 || Number(item.correctAnswerIndex) >= answers.length) issues.push({ path: `quiz.${row.id}`, message: 'Question mapping, answers, or correct answer is invalid.' });
  }
  for (const row of draft.flashcards) {
    const item = row.draft as Record<string, unknown>;
    if (!lessonIds.has(row.lesson_id) || !nonEmpty(item.prompt) || !nonEmpty(item.answer)) issues.push({ path: `flashcards.${row.id}`, message: 'Flashcard mapping, question, and answer are required.' });
  }
  for (const asset of draft.assets) if (!nonEmpty(asset.alt_text) || !String(asset.mime_type).startsWith('image/')) issues.push({ path: `assets.${asset.id}`, message: 'Supporting images require valid metadata and alternative text.' });
  for (const source of draft.sources) if (!nonEmpty(source.label) || !String(source.url).startsWith('https://')) issues.push({ path: `sources.${source.id}`, message: 'Sources require a label and HTTPS URL.' });
  return issues;
}

export async function buildPackage(admin: SupabaseClient, draft: Awaited<ReturnType<typeof loadDraft>>, releaseVersion: number) {
  const { data: previousRelease, error: previousError } = await admin.from('content_releases').select('package').order('release_version', { ascending: false }).limit(1).maybeSingle();
  if (previousError) throw previousError;
  const previousChapters = new Map<string, Record<string, unknown>>(
    (Array.isArray(previousRelease?.package?.chapters) ? previousRelease.package.chapters : []).map((chapter: Record<string, unknown>) => [String(chapter.id), chapter]),
  );
  const assets = [];
  for (const asset of draft.assets) {
    const extension = String(asset.object_path).split('.').pop()?.toLowerCase() || 'bin';
    const publishedPath = `releases/${releaseVersion}/${asset.id}.${extension}`;
    const { data: file, error: downloadError } = await admin.storage.from('netbite-content').download(asset.object_path);
    if (downloadError) throw downloadError;
    const { error: uploadError } = await admin.storage.from('netbite-content-public').upload(publishedPath, file, { contentType: asset.mime_type, upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = admin.storage.from('netbite-content-public').getPublicUrl(publishedPath);
    assets.push({ id: asset.id, lessonId: asset.lesson_id ?? undefined, url: publicUrl.publicUrl, mimeType: asset.mime_type, width: asset.width, height: asset.height, altText: asset.alt_text });
  }
  const chapters = draft.chapters.map((chapter) => {
    const definition = chapter.definition as Record<string, unknown>;
    const lessons = draft.lessons.filter((lesson) => lesson.chapter_id === chapter.id).map((lesson) => ({ ...(lesson.draft as Record<string, unknown>), order: lesson.position, requirement: lesson.requirement }));
    const quiz = draft.quiz.filter((question) => question.chapter_id === chapter.id).map((question) => ({ ...(question.draft as Record<string, unknown>) }));
    const flashcards = draft.flashcards.filter((card) => card.chapter_id === chapter.id).map((card) => ({ ...(card.draft as Record<string, unknown>) }));
    const previous = previousChapters.get(chapter.id);
    const baseQuizVersion = Number(definition.contentVersion ?? 1);
    const baseFlashcardVersion = Number(definition.flashcardVersion ?? 1);
    const baseCheckpointVersion = Number(definition.checkpointVersion ?? 1);
    const previousQuizVersion = Number(previous?.contentVersion ?? baseQuizVersion);
    const previousFlashcardVersion = Number(previous?.flashcardVersion ?? baseFlashcardVersion);
    const previousCheckpointVersion = Number(previous?.checkpointVersion ?? baseCheckpointVersion);
    const previousCheckpoints = Array.isArray(previous?.lessons) ? previous.lessons.map((lesson: Record<string, unknown>) => ({ id: lesson.id, checkpoint: lesson.checkpoint })) : [];
    const checkpoints = lessons.map((lesson) => ({ id: lesson.id, checkpoint: lesson.checkpoint }));
    return {
      ...definition,
      id: chapter.id,
      courseId: chapter.course_id,
      courseOrder: chapter.position,
      contentVersion: previous && canonicalize(previous.quiz) !== canonicalize(quiz) ? previousQuizVersion + 1 : Math.max(baseQuizVersion, previousQuizVersion),
      flashcardVersion: previous && canonicalize(previous.flashcards) !== canonicalize(flashcards) ? previousFlashcardVersion + 1 : Math.max(baseFlashcardVersion, previousFlashcardVersion),
      checkpointVersion: previous && canonicalize(previousCheckpoints) !== canonicalize(checkpoints) ? previousCheckpointVersion + 1 : Math.max(baseCheckpointVersion, previousCheckpointVersion),
      lessons,
      quiz,
      flashcards,
    };
  });
  return {
    courses: draft.courses.map((course) => ({ ...(course.definition as Record<string, unknown>), id: course.id })),
    chapters,
    assets,
    sources: draft.sources.map((source) => ({ id: source.id, lessonId: source.lesson_id ?? undefined, label: source.label, url: source.url, notes: source.notes })),
    supportedIllustrations: draft.illustrations.map(({ id }) => id),
  };
}
