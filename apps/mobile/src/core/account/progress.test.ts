import { emptyLearningProgress, hasLearningProgress, mergeLearningProgress, serializeLearningProgress } from '@/core/account/progress';

describe('cloud learning progress', () => {
  test('serializes only learning and settings state', () => {
    const result = serializeLearningProgress({
      completedLessonIds: ['network-definition', 'network-definition'],
      completedLabIds: ['first-network'],
      quizScores: { 1: 5 },
      quizContentVersions: { 1: 2 },
      reviewedFlashcardChapterIds: ['1'],
      flashcardContentVersions: { 1: 2 },
      flashcardPositions: { 1: 3 },
      cliGuideSeen: true,
      hapticsEnabled: false,
      motionPreference: 'reduced',
    }, '2026-07-30T00:00:00.000Z');

    expect(result.completedLessonIds).toEqual(['network-definition']);
    expect(result).not.toHaveProperty('topology');
    expect(result).not.toHaveProperty('workspace');
    expect(result.updatedAt).toBe('2026-07-30T00:00:00.000Z');
  });

  test('unions completions and keeps the highest score for the same version', () => {
    const local = {
      ...emptyLearningProgress('2026-07-29T00:00:00.000Z'),
      completedLessonIds: ['local-lesson'],
      completedLabIds: ['local-lab'],
      quizScores: { 5: 6 },
      quizContentVersions: { 5: 3 },
    };
    const cloud = {
      ...emptyLearningProgress('2026-07-30T00:00:00.000Z'),
      completedLessonIds: ['cloud-lesson'],
      completedLabIds: ['cloud-lab'],
      quizScores: { 5: 7 },
      quizContentVersions: { 5: 3 },
    };

    const result = mergeLearningProgress(local, cloud);
    expect(result.completedLessonIds).toEqual(expect.arrayContaining(['local-lesson', 'cloud-lesson']));
    expect(result.completedLabIds).toEqual(expect.arrayContaining(['local-lab', 'cloud-lab']));
    expect(result.quizScores['5']).toBe(7);
  });

  test('prefers the score from the newer content version', () => {
    const local = {
      ...emptyLearningProgress('2026-07-30T00:00:00.000Z'),
      quizScores: { 9: 8 },
      quizContentVersions: { 9: 2 },
    };
    const cloud = {
      ...emptyLearningProgress('2026-07-29T00:00:00.000Z'),
      quizScores: { 9: 5 },
      quizContentVersions: { 9: 3 },
    };
    const result = mergeLearningProgress(local, cloud);
    expect(result.quizContentVersions['9']).toBe(3);
    expect(result.quizScores['9']).toBe(5);
  });

  test('uses recently updated settings and flashcard positions', () => {
    const local = {
      ...emptyLearningProgress('2026-07-29T00:00:00.000Z'),
      flashcardPositions: { 2: 1 },
      hapticsEnabled: true,
      motionPreference: 'system' as const,
    };
    const cloud = {
      ...emptyLearningProgress('2026-07-30T00:00:00.000Z'),
      flashcardPositions: { 2: 5 },
      hapticsEnabled: false,
      motionPreference: 'reduced' as const,
    };
    const result = mergeLearningProgress(local, cloud);
    expect(result.flashcardPositions).toEqual({ 2: 5 });
    expect(result.hapticsEnabled).toBe(false);
    expect(result.motionPreference).toBe('reduced');
  });

  test('distinguishes untouched guest state from meaningful progress', () => {
    expect(hasLearningProgress(emptyLearningProgress())).toBe(false);
    expect(hasLearningProgress({ ...emptyLearningProgress(), completedLessonIds: ['lesson'] })).toBe(true);
  });

  test('keeps the latest saved-item tombstone and highest historical miss count', () => {
    const local = {
      ...emptyLearningProgress('2026-07-29T00:00:00.000Z'),
      reviewSignals: { q: { key: 'q', kind: 'quiz' as const, contentId: 'q', lessonId: 'l', chapterId: '1', contentVersion: 1, missCount: 4, due: true, updatedAt: '2026-07-29T00:00:00.000Z' } },
      savedLearningItems: { s: { key: 's', targetType: 'lesson' as const, targetId: 'l', chapterId: '1', title: 'Lesson', note: 'old', createdAt: '2026-07-28T00:00:00.000Z', updatedAt: '2026-07-29T00:00:00.000Z' } },
    };
    const cloud = {
      ...emptyLearningProgress('2026-07-30T00:00:00.000Z'),
      reviewSignals: { q: { ...local.reviewSignals.q, missCount: 2, due: false, updatedAt: '2026-07-30T00:00:00.000Z' } },
      savedLearningItems: { s: { ...local.savedLearningItems.s, updatedAt: '2026-07-30T00:00:00.000Z', deletedAt: '2026-07-30T00:00:00.000Z' } },
    };
    const result = mergeLearningProgress(local, cloud);
    expect(result.reviewSignals.q).toMatchObject({ missCount: 4, due: false });
    expect(result.savedLearningItems.s.deletedAt).toBeDefined();
  });
});
