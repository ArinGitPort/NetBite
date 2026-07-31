import { deserializeCloudProgress } from '@/services/cloud-progress';

describe('cloud progress records', () => {
  test('sanitizes malformed remote data instead of breaking local learning', () => {
    const result = deserializeCloudProgress({
      schema_version: -1,
      completed_lesson_ids: ['lesson-a', 42, null],
      completed_lab_ids: 'not-an-array',
      quiz_scores: { 1: 6, broken: 'high' },
      quiz_content_versions: null,
      reviewed_flashcard_chapter_ids: [1, '2'],
      flashcard_positions: { 2: 4, bad: Number.NaN },
      haptics_enabled: 'wrong',
      motion_preference: 'unknown',
      updated_at: 'not-a-date',
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.completedLessonIds).toEqual(['lesson-a']);
    expect(result.completedLabIds).toEqual([]);
    expect(result.quizScores).toEqual({ 1: 6 });
    expect(result.reviewedFlashcardChapterIds).toEqual(['2']);
    expect(result.flashcardPositions).toEqual({ 2: 4 });
    expect(result.motionPreference).toBe('system');
    expect(result.updatedAt).toBe('1970-01-01T00:00:00.000Z');
  });
});
