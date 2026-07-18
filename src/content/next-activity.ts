import { isQuizMastered, type LearningProgress } from '@/content/progress';
import type { ChapterDefinition } from '@/content/types';

export type NextChapterActivity =
  | { type: 'lesson'; id: string }
  | { type: 'lab'; id: string }
  | { type: 'quiz'; id: string }
  | { type: 'flashcards'; id: string }
  | { type: 'chapter'; id: string };

export function getNextChapterActivity(
  chapter: ChapterDefinition,
  progress: LearningProgress,
): NextChapterActivity {
  const nextLesson = chapter.lessons.find((lesson) => !progress.completedLessonIds.includes(lesson.id));
  if (nextLesson) return { type: 'lesson', id: nextLesson.id };
  if (!progress.completedLabIds.includes(chapter.lab.id)) return { type: 'lab', id: chapter.lab.id };
  if (!isQuizMastered(chapter, progress.quizScores[chapter.id])) return { type: 'quiz', id: chapter.id };
  if (!progress.reviewedFlashcardChapterIds.includes(chapter.id)) return { type: 'flashcards', id: chapter.id };
  return { type: 'chapter', id: chapter.id };
}
