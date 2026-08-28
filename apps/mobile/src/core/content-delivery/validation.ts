import { chapters as bundledChapters } from '@/content/chapters';
import type { ContentValidationIssue, ContentValidationResult, RemoteCurriculumPackage, RemoteCurriculumPayload } from '@/core/content-delivery/types';
import { educationalIllustrations } from '@/features/lessons/educational-illustration-registry';

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export function validateRemoteCurriculumPayload(value: unknown): ContentValidationResult {
  const issues: ContentValidationIssue[] = [];
  if (!isRecord(value)) return { valid: false, issues: [{ path: 'package', message: 'Content package must be an object.' }] };
  const courses = Array.isArray(value.courses) ? value.courses : [];
  const chapters = Array.isArray(value.chapters) ? value.chapters : [];
  const assets = Array.isArray(value.assets) ? value.assets : [];
  const sources = Array.isArray(value.sources) ? value.sources : [];
  if (courses.length !== 2) issues.push({ path: 'courses', message: 'Both fixed NetBite courses are required.' });
  const allowedChapterIds = new Set(bundledChapters.map(({ id }) => id));
  const chapterIds = new Set<string>();
  const lessonIds = new Set<string>();
  for (const [chapterIndex, candidate] of chapters.entries()) {
    const path = `chapters[${chapterIndex}]`;
    if (!isRecord(candidate) || !nonEmpty(candidate.id)) { issues.push({ path, message: 'Chapter ID is required.' }); continue; }
    if (!allowedChapterIds.has(candidate.id)) issues.push({ path: `${path}.id`, message: 'Remote releases cannot create chapters.' });
    if (chapterIds.has(candidate.id)) issues.push({ path: `${path}.id`, message: 'Chapter IDs must be unique.' });
    chapterIds.add(candidate.id);
    if (!Array.isArray(candidate.lessons) || candidate.lessons.length === 0) issues.push({ path: `${path}.lessons`, message: 'A chapter must contain lessons.' });
    for (const [lessonIndex, lesson] of (Array.isArray(candidate.lessons) ? candidate.lessons : []).entries()) {
      const lessonPath = `${path}.lessons[${lessonIndex}]`;
      if (!isRecord(lesson) || !nonEmpty(lesson.id) || !nonEmpty(lesson.title) || !nonEmpty(lesson.body) || !nonEmpty(lesson.takeaway)) {
        issues.push({ path: lessonPath, message: 'Lesson ID, title, body, and takeaway are required.' });
        continue;
      }
      if (lesson.chapterId !== candidate.id) issues.push({ path: `${lessonPath}.chapterId`, message: 'Lesson chapter mapping is invalid.' });
      if (lessonIds.has(lesson.id)) issues.push({ path: `${lessonPath}.id`, message: 'Lesson IDs must be globally unique.' });
      lessonIds.add(lesson.id);
      if (!nonEmpty(lesson.illustration) || !educationalIllustrations[lesson.illustration]) {
        issues.push({ path: `${lessonPath}.illustration`, message: 'Lesson must use a supported code-rendered illustration.' });
      }
      if (lesson.requirement && lesson.requirement !== 'core' && lesson.requirement !== 'supplemental') issues.push({ path: `${lessonPath}.requirement`, message: 'Lesson requirement must be core or supplemental.' });
    }
    const quiz = Array.isArray(candidate.quiz) ? candidate.quiz : [];
    quiz.forEach((question, questionIndex) => {
      const questionPath = `${path}.quiz[${questionIndex}]`;
      if (!isRecord(question) || !nonEmpty(question.id) || !nonEmpty(question.lessonId) || !Array.isArray(question.answers) || question.answers.length < 2 || !Number.isInteger(question.correctAnswerIndex) || Number(question.correctAnswerIndex) < 0 || Number(question.correctAnswerIndex) >= question.answers.length) {
        issues.push({ path: questionPath, message: 'Quiz question is incomplete or has an invalid correct answer.' });
      } else if (!lessonIds.has(question.lessonId)) issues.push({ path: `${questionPath}.lessonId`, message: 'Quiz question references an unknown lesson.' });
    });
    const flashcards = Array.isArray(candidate.flashcards) ? candidate.flashcards : [];
    flashcards.forEach((card, cardIndex) => {
      const cardPath = `${path}.flashcards[${cardIndex}]`;
      if (!isRecord(card) || !nonEmpty(card.id) || !nonEmpty(card.lessonId) || !nonEmpty(card.prompt) || !nonEmpty(card.answer)) issues.push({ path: cardPath, message: 'Flashcard is incomplete.' });
      else if (!lessonIds.has(card.lessonId)) issues.push({ path: `${cardPath}.lessonId`, message: 'Flashcard references an unknown lesson.' });
    });
  }
  if (chapterIds.size !== allowedChapterIds.size || [...allowedChapterIds].some((id) => !chapterIds.has(id))) issues.push({ path: 'chapters', message: 'Every fixed chapter must be included exactly once.' });
  for (const [assetIndex, asset] of assets.entries()) {
    const path = `assets[${assetIndex}]`;
    if (!isRecord(asset) || !nonEmpty(asset.id) || !nonEmpty(asset.url) || !nonEmpty(asset.mimeType) || !asset.mimeType.startsWith('image/') || !nonEmpty(asset.altText) || !Number.isFinite(asset.width) || !Number.isFinite(asset.height)) issues.push({ path, message: 'Image assets require an ID, image MIME type, dimensions, URL, and alternative text.' });
    else if (asset.lessonId && !lessonIds.has(String(asset.lessonId))) issues.push({ path: `${path}.lessonId`, message: 'Image references an unknown lesson.' });
  }
  for (const [sourceIndex, source] of sources.entries()) {
    const path = `sources[${sourceIndex}]`;
    if (!isRecord(source) || !nonEmpty(source.id) || !nonEmpty(source.label) || !nonEmpty(source.url) || !source.url.startsWith('https://')) issues.push({ path, message: 'Sources require an ID, label, and HTTPS URL.' });
    else if (source.lessonId && !lessonIds.has(String(source.lessonId))) issues.push({ path: `${path}.lessonId`, message: 'Source references an unknown lesson.' });
  }
  return { valid: issues.length === 0, issues };
}

export function isRemoteCurriculumPackage(value: unknown): value is RemoteCurriculumPackage {
  if (!isRecord(value) || !isRecord(value.manifest)) return false;
  const manifest = value.manifest;
  if (!nonEmpty(manifest.releaseId) || !Number.isInteger(manifest.releaseVersion) || !Number.isInteger(manifest.schemaVersion) || !nonEmpty(manifest.minimumAppVersion) || !nonEmpty(manifest.checksum) || !nonEmpty(manifest.publishedAt)) return false;
  return validateRemoteCurriculumPayload(value as unknown as RemoteCurriculumPayload).valid;
}
