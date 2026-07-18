import { chapters } from '@/content/chapters';
import { getChapterProgress, getQuizMasteryScore, isChapterComplete, isQuizMastered, type LearningProgress } from '@/content/progress';

describe('chapter progress', () => {
  const firstChapter = chapters[0];

  test('counts only activities that belong to the selected chapter', () => {
    const progress: LearningProgress = {
      completedLessonIds: [firstChapter.lessons[0].id, 'ethernet-frames'],
      completedLabIds: [firstChapter.lab.id],
      quizScores: { 1: 4, 2: 5 },
      reviewedFlashcardChapterIds: ['2'],
    };

    expect(getChapterProgress(firstChapter, progress)).toEqual({ completed: 3, total: 7 });
  });

  test('does not treat a below-mastery quiz attempt as chapter completion', () => {
    const progress: LearningProgress = {
      completedLessonIds: firstChapter.lessons.map((lesson) => lesson.id),
      completedLabIds: [firstChapter.lab.id],
      quizScores: { 1: 3 },
      reviewedFlashcardChapterIds: ['1'],
    };

    expect(isChapterComplete(firstChapter, progress)).toBe(false);
    expect(getChapterProgress(firstChapter, progress)).toEqual({ completed: 6, total: 7 });
  });

  test('completes a chapter after the quiz mastery score is reached', () => {
    const progress: LearningProgress = {
      completedLessonIds: firstChapter.lessons.map((lesson) => lesson.id),
      completedLabIds: [firstChapter.lab.id],
      quizScores: { 1: getQuizMasteryScore(firstChapter) },
      reviewedFlashcardChapterIds: ['1'],
    };

    expect(isQuizMastered(firstChapter, progress.quizScores[1])).toBe(true);
    expect(isChapterComplete(firstChapter, progress)).toBe(true);
  });

  test('maps every quiz question back to a lesson in its chapter', () => {
    for (const chapter of chapters) {
      const lessonIds = new Set(chapter.lessons.map((lesson) => lesson.id));
      for (const question of chapter.quiz) {
        expect(lessonIds.has(question.lessonId)).toBe(true);
      }
    }
  });

  test('sets Chapter 3 mastery at four of five questions', () => {
    const chapterThree = chapters.find((chapter) => chapter.id === '3');
    expect(chapterThree).toBeDefined();
    expect(getQuizMasteryScore(chapterThree!)).toBe(4);
  });
});
