import type { Lesson } from '@/content/types';

export function isLessonCheckpointBlocking(lesson: Lesson, completedLessonIds: string[], checkpointPassed: boolean) {
  return Boolean(lesson.checkpoint)
    && !completedLessonIds.includes(lesson.id)
    && !checkpointPassed;
}

