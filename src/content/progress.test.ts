import { chapters } from '@/content/chapters';
import { getChapterProgress, getQuizMasteryScore, isChapterComplete, isQuizMastered, type LearningProgress } from '@/content/progress';

describe('chapter progress', () => {
  const firstChapter = chapters[0];

  test('counts only activities that belong to the selected chapter', () => {
    const progress: LearningProgress = {
      completedLessonIds: [firstChapter.lessons[0].id, 'ethernet-frames'],
      completedLabIds: [firstChapter.lab.id],
      quizScores: { 1: 5, 2: 5 },
      quizContentVersions: { 1: 2, 2: 1 },
      reviewedFlashcardChapterIds: ['2'],
      flashcardContentVersions: { 2: 1 },
    };

    expect(getChapterProgress(firstChapter, progress)).toEqual({ completed: 3, total: 8 });
  });

  test('does not treat a below-mastery quiz attempt as chapter completion', () => {
    const progress: LearningProgress = {
      completedLessonIds: firstChapter.lessons.map((lesson) => lesson.id),
      completedLabIds: [firstChapter.lab.id],
      quizScores: { 1: 3 },
      quizContentVersions: { 1: 2 },
      reviewedFlashcardChapterIds: ['1'],
      flashcardContentVersions: { 1: 2 },
    };

    expect(isChapterComplete(firstChapter, progress)).toBe(false);
    expect(getChapterProgress(firstChapter, progress)).toEqual({ completed: 7, total: 8 });
  });

  test('completes a chapter after the quiz mastery score is reached', () => {
    const progress: LearningProgress = {
      completedLessonIds: firstChapter.lessons.map((lesson) => lesson.id),
      completedLabIds: [firstChapter.lab.id],
      quizScores: { 1: getQuizMasteryScore(firstChapter) },
      quizContentVersions: { 1: 2 },
      reviewedFlashcardChapterIds: ['1'],
      flashcardContentVersions: { 1: 2 },
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

  test('sets Chapter 3 mastery at six of seven questions', () => {
    const chapterThree = chapters.find((chapter) => chapter.id === '3');
    expect(chapterThree).toBeDefined();
    expect(getQuizMasteryScore(chapterThree!)).toBe(6);
  });

  test('treats an older quiz and flashcard review as historical', () => {
    const progress: LearningProgress = {
      completedLessonIds: firstChapter.lessons.map(({ id }) => id),
      completedLabIds: [firstChapter.lab.id],
      quizScores: { 1: 5 },
      quizContentVersions: { 1: 1 },
      reviewedFlashcardChapterIds: ['1'],
      flashcardContentVersions: { 1: 1 },
    };
    expect(getChapterProgress(firstChapter, progress)).toEqual({ completed: 6, total: 8 });
  });

  test('revises only the rebuilt subnetting and routing assessments', () => {
    expect(chapters.find(({ id }) => id === '5')?.contentVersion).toBe(3);
    expect(chapters.find(({ id }) => id === '9')?.contentVersion).toBe(3);
    expect(chapters.filter(({ id }) => id !== '5' && id !== '9').every(({ contentVersion }) => contentVersion === 2)).toBe(true);

    for (const chapterId of ['5', '9']) {
      const chapter = chapters.find(({ id }) => id === chapterId)!;
      const progress: LearningProgress = {
        completedLessonIds: chapter.lessons.map(({ id }) => id),
        completedLabIds: [chapter.lab.id],
        quizScores: { [chapter.id]: getQuizMasteryScore(chapter) },
        quizContentVersions: { [chapter.id]: 2 },
        reviewedFlashcardChapterIds: [chapter.id],
        flashcardContentVersions: { [chapter.id]: 2 },
      };
      expect(getChapterProgress(chapter, progress).completed).toBe(chapter.lessons.length + 1);
    }
  });
});
