import { advancedChapters } from '@/content/advanced-chapters';
import { chapters } from '@/content/chapters';
import { advancedIllustrationTypes } from '@/features/lessons/components/advanced-lesson-illustration';
import { practiceConfigs } from '@/features/practice/practice-configs';

describe('complete curriculum', () => {
  test('registers eleven unique chapters', () => {
    expect(chapters).toHaveLength(11);
    expect(new Set(chapters.map(({ id }) => id)).size).toBe(11);
  });

  test.each(advancedChapters.map((chapter) => [chapter.id, chapter]))('chapter %s is complete', (_id, chapter) => {
    expect(chapter.lessons).toHaveLength(4);
    expect(chapter.quiz).toHaveLength(5);
    expect(chapter.flashcards.length).toBeGreaterThanOrEqual(7);
    expect(practiceConfigs[chapter.lab.id]?.chapterId).toBe(chapter.id);
    const lessonIds = new Set(chapter.lessons.map(({ id }) => id));
    chapter.quiz.forEach(({ lessonId, answers, correctAnswerIndex }) => {
      expect(lessonIds.has(lessonId)).toBe(true);
      expect(answers.length).toBeGreaterThanOrEqual(3);
      expect(correctAnswerIndex).toBeGreaterThanOrEqual(0);
      expect(correctAnswerIndex).toBeLessThan(answers.length);
    });
    chapter.lessons.forEach(({ illustration }) => expect(advancedIllustrationTypes).toContain(illustration));
  });

  test('uses globally unique lesson, activity, question, and flashcard IDs', () => {
    const unique = (values: string[]) => expect(new Set(values).size).toBe(values.length);
    unique(chapters.flatMap(({ lessons }) => lessons.map(({ id }) => id)));
    unique(chapters.map(({ lab }) => lab.id));
    unique(chapters.flatMap(({ quiz }) => quiz.map(({ id }) => id)));
    unique(chapters.flatMap(({ flashcards }) => flashcards.map(({ id }) => id)));
  });

  test('every advanced practice has four immutable prediction stages', () => {
    Object.values(practiceConfigs).forEach((config) => {
      expect(config.stages).toHaveLength(4);
      config.stages.forEach((stage) => expect(stage.choices.some(({ id }) => id === stage.correctChoiceId)).toBe(true));
    });
  });

});
