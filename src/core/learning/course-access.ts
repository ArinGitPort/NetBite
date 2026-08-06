import { getCourseChapters, canEnterOperations } from '@/content/courses';
import { isChapterComplete, type LearningProgress } from '@/content/progress';
import type { ChapterDefinition } from '@/content/types';

export interface CourseAccessProgress extends LearningProgress {
  readinessScores?: Record<string, number>;
}

export function canOpenChapter(chapter: ChapterDefinition, progress: CourseAccessProgress, presentationBypass = false) {
  if (presentationBypass || chapter.courseId !== 'network-operations') return true;
  if (chapter.simulationReleaseState && chapter.simulationReleaseState !== 'released') return false;
  if (!canEnterOperations(progress)) return false;
  const chapters = getCourseChapters('network-operations');
  const index = chapters.findIndex(({ id }) => id === chapter.id);
  return index <= 0 || isChapterComplete(chapters[index - 1], progress);
}

export function getChapterLockReason(chapter: ChapterDefinition, progress: CourseAccessProgress, presentationBypass = false) {
  if (canOpenChapter(chapter, progress, presentationBypass)) return undefined;
  if (chapter.simulationReleaseState === 'validation') return 'SIMULATOR IN VALIDATION';
  if (chapter.simulationReleaseState === 'comingSoon') return 'GUIDED SIMULATOR COMING SOON';
  if (!canEnterOperations(progress)) return 'COMPLETE FOUNDATIONS OR PASS THE READINESS CHECK';
  const chapters = getCourseChapters('network-operations');
  const index = chapters.findIndex(({ id }) => id === chapter.id);
  return index > 0 ? `COMPLETE ${chapters[index - 1].title.toUpperCase()} FIRST` : 'COURSE PREREQUISITE REQUIRED';
}
