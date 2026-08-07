import { appendActivity, getActiveReviewQueue, tombstoneSavedLearningItem, updateReviewSignals, upsertSavedLearningItem } from '@/core/learning/adaptive-learning';

describe('adaptive learning', () => {
  const quizInput = { kind: 'quiz' as const, contentId: 'q-1', lessonId: 'lesson-1', chapterId: '1', contentVersion: 2 };

  it('creates, increments, and resolves a due review signal', () => {
    const first = updateReviewSignals({}, quizInput, false, '2026-01-01T00:00:00.000Z');
    const second = updateReviewSignals(first, quizInput, false, '2026-01-02T00:00:00.000Z');
    const resolved = updateReviewSignals(second, quizInput, true, '2026-01-03T00:00:00.000Z');
    expect(Object.values(second)[0]).toMatchObject({ due: true, missCount: 2 });
    expect(Object.values(resolved)[0]).toMatchObject({ due: false, missCount: 2 });
  });

  it('excludes obsolete versions and inaccessible chapters', () => {
    const signals = updateReviewSignals({}, quizInput, false);
    expect(getActiveReviewQueue(signals, { '1': { quiz: 3, flashcard: 1, checkpoint: 1 } }, new Set(['1']))).toHaveLength(0);
    expect(getActiveReviewQueue(signals, { '1': { quiz: 2, flashcard: 1, checkpoint: 1 } }, new Set(['2']))).toHaveLength(0);
  });

  it('queues checkpoint misses independently from quiz and flashcard versions', () => {
    const checkpointInput = { kind: 'checkpoint' as const, contentId: 'lesson-1', lessonId: 'lesson-1', chapterId: '1', contentVersion: 2 };
    const signals = updateReviewSignals({}, checkpointInput, false);
    expect(getActiveReviewQueue(signals, { '1': { quiz: 9, flashcard: 8, checkpoint: 2 } })).toMatchObject([{ kind: 'checkpoint', contentId: 'lesson-1' }]);
    expect(getActiveReviewQueue(signals, { '1': { quiz: 9, flashcard: 8, checkpoint: 3 } })).toHaveLength(0);
  });

  it('keeps saved notes as deletion tombstones and caps history at fifty', () => {
    const saved = upsertSavedLearningItem({}, { targetType: 'lesson', targetId: 'lesson-1', chapterId: '1', title: 'Lesson', note: 'Remember this' }, '2026-01-01T00:00:00.000Z');
    expect(tombstoneSavedLearningItem(saved, 'lesson:lesson-1', '2026-01-02T00:00:00.000Z')['lesson:lesson-1']).toMatchObject({ note: 'Remember this', deletedAt: '2026-01-02T00:00:00.000Z' });
    let history: ReturnType<typeof appendActivity> = [];
    for (let index = 0; index < 55; index += 1) history = appendActivity(history, { type: 'lesson', chapterId: '1', targetId: String(index), label: 'Lesson' }, new Date(index * 1000).toISOString());
    expect(history).toHaveLength(50);
  });
});
