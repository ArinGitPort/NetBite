export type ReviewKind = 'quiz' | 'flashcard' | 'checkpoint';
export type SavedTargetType = 'lesson' | 'illustration' | 'flashcard' | 'cli-command';
export type ActivityType = 'lesson' | 'lab' | 'quiz' | 'flashcards' | 'review';

export interface ReviewSignal {
  key: string;
  kind: ReviewKind;
  contentId: string;
  lessonId: string;
  chapterId: string;
  contentVersion: number;
  missCount: number;
  due: boolean;
  updatedAt: string;
}

export interface SavedLearningItem {
  key: string;
  targetType: SavedTargetType;
  targetId: string;
  chapterId: string;
  title: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  chapterId: string;
  targetId: string;
  label: string;
  occurredAt: string;
}

export interface ReviewQueueItem {
  key: string;
  kind: ReviewKind;
  chapterId: string;
  lessonId: string;
  contentId: string;
  missCount: number;
}

export interface ReviewResultInput {
  kind: ReviewKind;
  contentId: string;
  lessonId: string;
  chapterId: string;
  contentVersion: number;
}

export const reviewSignalKey = (kind: ReviewKind, contentId: string, contentVersion: number) => `${kind}:${contentId}:v${contentVersion}`;
export const savedLearningKey = (targetType: SavedTargetType, targetId: string) => `${targetType}:${targetId}`;

export function updateReviewSignals(signals: Record<string, ReviewSignal>, input: ReviewResultInput, correct: boolean, updatedAt = new Date().toISOString()) {
  const key = reviewSignalKey(input.kind, input.contentId, input.contentVersion);
  const current = signals[key];
  if (correct && !current) return signals;
  return { ...signals, [key]: { key, ...input, missCount: (current?.missCount ?? 0) + Number(!correct), due: !correct, updatedAt } };
}

export type ReviewContentVersions = Record<string, { quiz: number; flashcard: number; checkpoint: number }>;

export function getActiveReviewQueue(signals: Record<string, ReviewSignal>, versions: ReviewContentVersions, accessibleChapterIds?: Set<string>): ReviewQueueItem[] {
  return Object.values(signals)
    .filter((signal) => signal.due && (accessibleChapterIds?.has(signal.chapterId) ?? true))
    .filter((signal) => signal.contentVersion === versions[signal.chapterId]?.[signal.kind])
    .sort((a, b) => b.missCount - a.missCount || a.updatedAt.localeCompare(b.updatedAt) || a.key.localeCompare(b.key))
    .map(({ key, kind, chapterId, lessonId, contentId, missCount }) => ({ key, kind, chapterId, lessonId, contentId, missCount }));
}

export function upsertSavedLearningItem(items: Record<string, SavedLearningItem>, input: Omit<SavedLearningItem, 'key' | 'createdAt' | 'updatedAt' | 'deletedAt'>, updatedAt = new Date().toISOString()) {
  const key = savedLearningKey(input.targetType, input.targetId);
  const current = items[key];
  return { ...items, [key]: { key, ...input, createdAt: current?.createdAt ?? updatedAt, updatedAt } };
}

export function tombstoneSavedLearningItem(items: Record<string, SavedLearningItem>, key: string, updatedAt = new Date().toISOString()) {
  const current = items[key];
  return current ? { ...items, [key]: { ...current, updatedAt, deletedAt: updatedAt } } : items;
}

export function migrateIllustrationBookmarks(items: Record<string, SavedLearningItem>, updatedAt = new Date().toISOString()) {
  const migrated = { ...items };
  Object.values(items)
    .filter((item) => item.targetType === 'illustration' && !item.deletedAt)
    .forEach((illustration) => {
      const lessonId = illustration.targetId.split(':')[0];
      if (!lessonId) return;
      const lessonKey = savedLearningKey('lesson', lessonId);
      const lesson = migrated[lessonKey];
      const notes = [lesson?.deletedAt ? '' : lesson?.note, illustration.note]
        .map((note) => note?.trim() ?? '')
        .filter((note, index, values) => note && values.indexOf(note) === index);
      migrated[lessonKey] = {
        key: lessonKey,
        targetType: 'lesson',
        targetId: lessonId,
        chapterId: lesson?.chapterId ?? illustration.chapterId,
        title: lesson?.title ?? illustration.title.replace(/\s+visual$/i, ''),
        note: notes.join('\n\n').slice(0, 1000),
        createdAt: lesson && lesson.createdAt < illustration.createdAt ? lesson.createdAt : illustration.createdAt,
        updatedAt,
      };
      migrated[illustration.key] = { ...illustration, updatedAt, deletedAt: updatedAt };
    });
  return migrated;
}

export function appendActivity(history: ActivityEvent[], input: Omit<ActivityEvent, 'id' | 'occurredAt'>, occurredAt = new Date().toISOString()) {
  const event = { ...input, occurredAt, id: `${occurredAt}:${input.type}:${input.targetId}` };
  return [event, ...history.filter((candidate) => candidate.id !== event.id)].slice(0, 50);
}
