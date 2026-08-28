import type { Lesson } from '@/content/types';

export type LessonSeed = Omit<Lesson, 'chapterId' | 'order' | 'eyebrow'>;

export function buildLessons(chapterId: string, seeds: LessonSeed[]): Lesson[] {
  return seeds.map((seed, index) => ({
    ...seed,
    chapterId,
    order: index + 1,
    eyebrow: `Lesson ${index + 1} of ${seeds.length}`,
  }));
}

