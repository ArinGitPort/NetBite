import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

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

export async function authenticatedAdmin(request: Request, userClient: SupabaseClient, admin: SupabaseClient) {
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Response(JSON.stringify({ error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.' } }), { status: 401 });
  const { data: access, error: accessError } = await admin.from('content_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (accessError) throw accessError;
  if (!access) throw new Response(JSON.stringify({ error: { code: 'ADMIN_REQUIRED', message: 'This account does not have administrator access.' } }), { status: 403 });
  return user;
}

function nonEmpty(value: unknown) { return typeof value === 'string' && value.trim().length > 0; }
function record(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function lessonSections(value: unknown) {
  return Array.isArray(value) ? value.map((item) => record(item)).map((item) => ({ heading: item.heading, body: item.body })) : undefined;
}
function lessonExample(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const item = record(value); const visual = record(item.visual);
  const steps = Array.isArray(item.steps) ? item.steps.map((step) => record(step)).map((step) => ({
    id: step.id, label: step.label, explanation: step.explanation,
    ...(step.value !== undefined ? { value: step.value } : {}),
  })) : undefined;
  return {
    label: item.label, setup: item.setup,
    ...(item.presentation !== undefined ? { presentation: item.presentation } : {}),
    ...(item.visual && typeof item.visual === 'object' ? { visual: { illustration: visual.illustration, stageIds: strings(visual.stageIds) } } : {}),
    ...(steps ? { steps } : {}), result: item.result,
  };
}
function lessonCheckpoint(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const item = record(value);
  return {
    prompt: item.prompt,
    choices: Array.isArray(item.choices) ? item.choices.map((choice) => record(choice)).map((choice) => ({ id: choice.id, label: choice.label, feedback: choice.feedback })) : [],
    correctChoiceId: item.correctChoiceId,
    ...(Array.isArray(item.hints) ? { hints: strings(item.hints) } : {}),
    ...(item.presentation !== undefined ? { presentation: item.presentation } : {}),
    ...(item.reviewIdentity !== undefined ? { reviewIdentity: item.reviewIdentity } : {}),
  };
}
function lessonCallout(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const item = record(value);
  return { label: item.label, text: item.text, ...(item.visual !== undefined ? { visual: item.visual } : {}) };
}

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
    const exampleVisual = record(record(lesson.example).visual).illustration;
    if (exampleVisual !== undefined && !allowedIllustrations.has(String(exampleVisual))) issues.push({ path: `lessons.${row.id}.example`, message: 'The worked example uses a lesson visual that this app version does not support.' });
    if (coreLessonIds.has(row.id) && row.requirement !== 'core') issues.push({ path: `lessons.${row.id}.requirement`, message: 'A bundled core lesson cannot become supplemental.' });
    if (!coreLessonIds.has(row.id) && row.requirement !== 'supplemental') issues.push({ path: `lessons.${row.id}.requirement`, message: 'New lessons must remain supplemental.' });
    if (lesson.id !== row.id || lesson.chapterId !== row.chapter_id) issues.push({ path: `lessons.${row.id}`, message: 'A permanent lesson code or chapter assignment changed.' });
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
  for (const source of draft.sources) {
    let validUrl = false;
    try {
      const parsed = new URL(String(source.url));
      const host = parsed.hostname.toLowerCase();
      validUrl = parsed.protocol === 'https:' && !parsed.username && !parsed.password &&
        !['localhost', '::1'].includes(host) && !/^127\./.test(host) && !/^10\./.test(host) &&
        !/^192\.168\./.test(host) && !/^169\.254\./.test(host) && !/^172\.(1[6-9]|2\d|3[01])\./.test(host);
    } catch { validUrl = false; }
    if (!nonEmpty(source.label) || !validUrl) issues.push({ path: `sources.${source.id}`, message: 'Sources require a label and a safe HTTPS URL.' });
  }
  return issues;
}

export function sanitizeValidationIssues(issues: Array<{ path: string; message: string }>) {
  const labels: Record<string, string> = {
    courses: 'Courses', chapters: 'Chapters', lessons: 'Lessons', quiz: 'Quiz questions',
    flashcards: 'Flashcards', assets: 'Supporting images', sources: 'Source references',
  };
  return issues.map(({ path, message }) => ({
    area: labels[path.split('.')[0]] ?? 'Curriculum',
    message,
  }));
}

function readUint24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function imageMetadata(bytes: Uint8Array, mimeType: string) {
  if (mimeType === 'image/png' && bytes.length >= 24 && bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mimeType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      if (length < 2) break;
      offset += length + 2;
    }
  }
  if (mimeType === 'image/webp' && bytes.length >= 30 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') {
    const kind = new TextDecoder().decode(bytes.slice(12, 16));
    if (kind === 'VP8X') return { width: readUint24(bytes, 24) + 1, height: readUint24(bytes, 27) + 1 };
    if (kind === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (kind === 'VP8 ' && bytes.length >= 30) {
      return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
    }
  }
  return undefined;
}

export async function validateAssetFiles(admin: SupabaseClient, assets: Array<Record<string, unknown>>) {
  const issues: Array<{ path: string; message: string }> = [];
  for (const asset of assets) {
    const { data, error } = await admin.storage.from('netbite-content').download(String(asset.object_path));
    if (error || !data) {
      issues.push({ path: `assets.${asset.id}`, message: 'The supporting image could not be read.' });
      continue;
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    const metadata = imageMetadata(bytes, String(asset.mime_type));
    if (!metadata || bytes.length !== Number(asset.byte_size) || metadata.width !== Number(asset.width) || metadata.height !== Number(asset.height)) {
      issues.push({ path: `assets.${asset.id}`, message: 'The image file does not match its recorded type, size, or dimensions.' });
    }
  }
  return issues;
}

export async function buildPackage(admin: SupabaseClient, draft: Awaited<ReturnType<typeof loadDraft>>, releaseNamespace: string | number) {
  const { data: previousRelease, error: previousError } = await admin.from('content_releases').select('package').order('release_version', { ascending: false }).limit(1).maybeSingle();
  if (previousError) throw previousError;
  const previousChapters = new Map<string, Record<string, unknown>>(
    (Array.isArray(previousRelease?.package?.chapters) ? previousRelease.package.chapters : []).map((chapter: Record<string, unknown>) => [String(chapter.id), chapter]),
  );
  const assets = [];
  for (const asset of draft.assets) {
    const extension = String(asset.object_path).split('.').pop()?.toLowerCase() || 'bin';
    const publishedPath = `releases/${releaseNamespace}/${asset.id}.${extension}`;
    const { data: file, error: downloadError } = await admin.storage.from('netbite-content').download(asset.object_path);
    if (downloadError) throw downloadError;
    const { error: uploadError } = await admin.storage.from('netbite-content-public').upload(publishedPath, file, { contentType: asset.mime_type, upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = admin.storage.from('netbite-content-public').getPublicUrl(publishedPath);
    assets.push({ id: asset.id, lessonId: asset.lesson_id ?? undefined, url: publicUrl.publicUrl, mimeType: asset.mime_type, width: asset.width, height: asset.height, altText: asset.alt_text });
  }
  const chapters = draft.chapters.map((chapter) => {
    const definition = chapter.definition as Record<string, unknown>;
    const lessons = draft.lessons.filter((lesson) => lesson.chapter_id === chapter.id).map((lesson) => {
      const value = lesson.draft as Record<string, unknown>;
      return {
        id: lesson.id, chapterId: lesson.chapter_id, order: lesson.position,
        title: value.title, eyebrow: value.eyebrow, body: value.body,
        takeaway: value.takeaway, illustration: value.illustration,
        ...(Array.isArray(value.sections) ? { sections: lessonSections(value.sections) } : {}),
        ...(value.example !== undefined ? { example: lessonExample(value.example) } : {}),
        ...(value.checkpoint !== undefined ? { checkpoint: lessonCheckpoint(value.checkpoint) } : {}),
        ...(value.fieldNote !== undefined ? { fieldNote: lessonCallout(value.fieldNote) } : {}),
        ...(value.termNote !== undefined ? { termNote: { term: record(value.termNote).term, definition: record(value.termNote).definition } } : {}),
        requirement: lesson.requirement,
      };
    });
    const quiz = draft.quiz.filter((question) => question.chapter_id === chapter.id).map((question) => {
      const value = question.draft as Record<string, unknown>;
      return { id: question.id, lessonId: question.lesson_id, prompt: value.prompt, answers: strings(value.answers), correctAnswerIndex: value.correctAnswerIndex, explanation: value.explanation };
    });
    const flashcards = draft.flashcards.filter((card) => card.chapter_id === chapter.id).map((card) => {
      const value = card.draft as Record<string, unknown>;
      return { id: card.id, lessonId: card.lesson_id, prompt: value.prompt, answer: value.answer, explanation: value.explanation };
    });
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
      id: chapter.id,
      courseId: chapter.course_id,
      courseOrder: chapter.position,
      accessTier: definition.accessTier,
      prerequisiteChapterIds: definition.prerequisiteChapterIds,
      simulationReleaseState: definition.simulationReleaseState,
      contentVersion: previous && canonicalize(previous.quiz) !== canonicalize(quiz) ? previousQuizVersion + 1 : Math.max(baseQuizVersion, previousQuizVersion),
      flashcardVersion: previous && canonicalize(previous.flashcards) !== canonicalize(flashcards) ? previousFlashcardVersion + 1 : Math.max(baseFlashcardVersion, previousFlashcardVersion),
      checkpointVersion: previous && canonicalize(previousCheckpoints) !== canonicalize(checkpoints) ? previousCheckpointVersion + 1 : Math.max(baseCheckpointVersion, previousCheckpointVersion),
      numberLabel: definition.numberLabel,
      title: definition.title,
      summary: definition.summary,
      lessons,
      quiz,
      flashcards,
      lab: { id: record(definition.lab).id, title: record(definition.lab).title, detail: record(definition.lab).detail },
      recap: { built: record(definition.recap).built, learned: record(definition.recap).learned, next: record(definition.recap).next },
    };
  });
  return {
    courses: draft.courses.map((course) => {
      const value = course.definition as Record<string, unknown>;
      const policy = record(value.prerequisitePolicy); const capstone = record(value.capstone);
      return {
        id: course.id, version: value.version, title: value.title, shortTitle: value.shortTitle,
        summary: value.summary, accessTier: value.accessTier,
        ...(value.prerequisiteCourseId !== undefined ? { prerequisiteCourseId: value.prerequisiteCourseId } : {}),
        ...(value.prerequisitePolicy !== undefined ? { prerequisitePolicy: { diagnosticId: policy.diagnosticId, questionCount: policy.questionCount, masteryScore: policy.masteryScore } } : {}),
        chapterIds: strings(value.chapterIds),
        ...(value.capstone !== undefined ? { capstone: { id: capstone.id, title: capstone.title, detail: capstone.detail } } : {}),
        certificateTitle: value.certificateTitle,
      };
    }),
    chapters,
    assets,
    sources: draft.sources.map((source) => ({ id: source.id, lessonId: source.lesson_id ?? undefined, label: source.label, url: source.url })),
    supportedIllustrations: draft.illustrations.map(({ id }) => id),
  };
}
