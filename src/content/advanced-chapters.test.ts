import { advancedChapters } from '@/content/advanced-chapters';
import { chapters } from '@/content/chapters';
import { educationalIllustrations } from '@/features/lessons/educational-illustration-registry';
import { practiceConfigs } from '@/features/practice/practice-configs';

describe('complete curriculum', () => {
  const expectedLessonCounts: Record<string, number> = { 4: 7, 5: 9, 6: 6, 7: 6, 8: 6, 9: 8, 10: 7, 11: 11 };
  const expectedQuizCounts: Record<string, number> = { 4: 8, 5: 8, 6: 7, 7: 7, 8: 7, 9: 8, 10: 8, 11: 8 };
  test('registers eleven unique chapters', () => {
    expect(chapters).toHaveLength(11);
    expect(new Set(chapters.map(({ id }) => id)).size).toBe(11);
  });

  test.each(advancedChapters.map((chapter) => [chapter.id, chapter]))('chapter %s is complete', (_id, chapter) => {
    expect(chapter.lessons).toHaveLength(expectedLessonCounts[chapter.id]);
    expect(chapter.quiz).toHaveLength(expectedQuizCounts[chapter.id]);
    expect(chapter.flashcards.length).toBeGreaterThanOrEqual(7);
    expect(practiceConfigs[chapter.lab.id]?.chapterId).toBe(chapter.id);
    const lessonIds = new Set(chapter.lessons.map(({ id }) => id));
    chapter.quiz.forEach(({ lessonId, answers, correctAnswerIndex }) => {
      expect(lessonIds.has(lessonId)).toBe(true);
      expect(answers.length).toBeGreaterThanOrEqual(3);
      expect(correctAnswerIndex).toBeGreaterThanOrEqual(0);
      expect(correctAnswerIndex).toBeLessThan(answers.length);
    });
    chapter.lessons.forEach(({ illustration }) => expect(educationalIllustrations[illustration]).toBeDefined());
    chapter.lessons.forEach((lesson, index) => {
      expect(lesson.order).toBe(index + 1);
      expect(lesson.eyebrow).toBe(`Lesson ${index + 1} of ${chapter.lessons.length}`);
      expect(lesson.sections?.length).toBeGreaterThanOrEqual(1);
      expect(lesson.example).toBeDefined();
      if (lesson.checkpoint) expect(lesson.checkpoint.choices.some(({ id }) => id === lesson.checkpoint?.correctChoiceId)).toBe(true);
    });
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
      config.stages.forEach((stage) => {
        expect(stage.choices.some(({ id }) => id === stage.correctChoiceId)).toBe(true);
        stage.choices.forEach(({ feedback }) => expect(feedback.length).toBeGreaterThan(20));
      });
    });
  });

});
