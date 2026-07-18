import type { ChapterDefinition } from '@/content/types';

export interface LearningProgress {
  completedLessonIds: string[];
  quizScores: Record<string, number>;
  reviewedFlashcardChapterIds: string[];
  completedLabIds: string[];
}

export const QUIZ_MASTERY_RATIO = 0.8;

export function getQuizMasteryScore(chapter: ChapterDefinition) {
  return Math.ceil(chapter.quiz.length * QUIZ_MASTERY_RATIO);
}

export function isQuizMastered(chapter: ChapterDefinition, score: number | undefined) {
  return score !== undefined && score >= getQuizMasteryScore(chapter);
}

export function getChapterProgress(chapter: ChapterDefinition, progress: LearningProgress) {
  const completedLessons = chapter.lessons.filter((lesson) =>
    progress.completedLessonIds.includes(lesson.id),
  ).length;
  const completed = completedLessons
    + Number(progress.completedLabIds.includes(chapter.lab.id))
    + Number(isQuizMastered(chapter, progress.quizScores[chapter.id]))
    + Number(progress.reviewedFlashcardChapterIds.includes(chapter.id));

  return { completed, total: chapter.lessons.length + 3 };
}

export function isChapterComplete(chapter: ChapterDefinition, progress: LearningProgress) {
  const { completed, total } = getChapterProgress(chapter, progress);
  return completed === total;
}
