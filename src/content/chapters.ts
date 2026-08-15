import { chapterOneLessons, chapterOneQuiz, chapterOneFlashcards, chapterOneLab } from '@/content/chapter-one';
import { chapterTwo } from '@/content/chapter-two';
import { chapterThree } from '@/content/chapter-three';
import { advancedChapters } from '@/content/advanced-chapters';
import { operationsChapters } from '@/content/operations-chapters';
import type { ChapterDefinition, Lesson } from '@/content/types';

const foundationSource: ChapterDefinition[] = [
  {
    id: '1',
    contentVersion: 2,
    flashcardVersion: 3,
    numberLabel: '01',
    title: 'Introduction to Networks',
    summary: 'Discover what networks are, meet the devices, then build your first connection.',
    lessons: chapterOneLessons,
    quiz: chapterOneQuiz,
    flashcards: chapterOneFlashcards,
    lab: {
      id: chapterOneLab.id,
      title: chapterOneLab.title,
      detail: 'Connect two PCs to a switch',
    },
    recap: {
      built: 'A small local area network',
      learned: 'Device roles, physical links, and LANs',
      next: 'How Ethernet carries data across each link',
    },
  },
  chapterTwo,
  chapterThree,
  ...advancedChapters,
];

export const foundationChapters: ChapterDefinition[] = foundationSource.map((chapter, index) => ({
  ...chapter,
  checkpointVersion: chapter.checkpointVersion ?? 1,
  lessons: chapter.lessons.map((lesson) => lesson.checkpoint ? {
    ...lesson,
    checkpoint: { ...lesson.checkpoint, presentation: 'pause-and-apply', reviewIdentity: lesson.id },
  } : lesson),
  courseId: 'network-foundations',
  courseOrder: index + 1,
  accessTier: Number(chapter.id) <= 4 ? 'free' : 'pro',
  prerequisiteChapterIds: [],
}));

export { operationsChapters };
export const chapters: ChapterDefinition[] = [...foundationChapters, ...operationsChapters];

export function getChapter(chapterId: string | undefined) {
  return chapters.find((chapter) => chapter.id === chapterId);
}

export function getChapterByLabId(labId: string | undefined) {
  return chapters.find((chapter) => chapter.lab.id === labId);
}

export function getLesson(lessonId: string | undefined): { chapter: ChapterDefinition; lesson: Lesson; index: number } | undefined {
  for (const chapter of chapters) {
    const index = chapter.lessons.findIndex((lesson) => lesson.id === lessonId);
    if (index >= 0) return { chapter, lesson: chapter.lessons[index], index };
  }
  return undefined;
}
