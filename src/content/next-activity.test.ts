import { chapters } from '@/content/chapters';
import { getNextChapterActivity } from '@/content/next-activity';
import { isChapterComplete, type LearningProgress } from '@/content/progress';

describe('next chapter activity', () => {
  const chapter = chapters[0];
  const baseProgress: LearningProgress = {
    completedLessonIds: chapter.lessons.map((lesson) => lesson.id),
    completedLabIds: [chapter.lab.id],
    quizScores: {},
    reviewedFlashcardChapterIds: [],
  };

  test('returns to a quiz that was attempted below mastery', () => {
    expect(getNextChapterActivity(chapter, {
      ...baseProgress,
      quizScores: { [chapter.id]: 3 },
    })).toEqual({ type: 'quiz', id: chapter.id });
  });

  test('continues to flashcards after quiz mastery', () => {
    expect(getNextChapterActivity(chapter, {
      ...baseProgress,
      quizScores: { [chapter.id]: 4 },
    })).toEqual({ type: 'flashcards', id: chapter.id });
  });

  test('selects the first Chapter 3 lesson after Chapters 1 and 2 are complete', () => {
    const firstTwoChapters = chapters.slice(0, 2);
    const progress: LearningProgress = {
      completedLessonIds: firstTwoChapters.flatMap((item) => item.lessons.map((lesson) => lesson.id)),
      completedLabIds: firstTwoChapters.map((item) => item.lab.id),
      quizScores: Object.fromEntries(firstTwoChapters.map((item) => [item.id, 5])),
      reviewedFlashcardChapterIds: firstTwoChapters.map((item) => item.id),
    };
    const currentChapter = chapters.find((item) => !isChapterComplete(item, progress));

    expect(currentChapter?.id).toBe('3');
    expect(getNextChapterActivity(currentChapter!, progress)).toEqual({
      type: 'lesson',
      id: 'mac-addresses',
    });
  });

  test('continues into Chapter 4 and reaches the final Chapter 11 recap', () => {
    const firstThree = chapters.slice(0, 3);
    const throughTen = chapters.slice(0, 10);
    const complete = (selected: typeof chapters): LearningProgress => ({
      completedLessonIds: selected.flatMap(({ lessons }) => lessons.map(({ id }) => id)),
      completedLabIds: selected.map(({ lab }) => lab.id),
      quizScores: Object.fromEntries(selected.map(({ id }) => [id, 5])),
      reviewedFlashcardChapterIds: selected.map(({ id }) => id),
    });
    const chapterFour = chapters.find((item) => !isChapterComplete(item, complete(firstThree)));
    expect(chapterFour?.id).toBe('4');
    expect(getNextChapterActivity(chapterFour!, complete(firstThree))).toEqual({ type: 'lesson', id: 'ipv4-identifies-interfaces' });

    const finalChapter = chapters.find((item) => !isChapterComplete(item, complete(throughTen)));
    expect(finalChapter?.id).toBe('11');
    const finalProgress = complete(chapters);
    expect(getNextChapterActivity(chapters[10], finalProgress)).toEqual({ type: 'chapter', id: '11' });
  });
});
