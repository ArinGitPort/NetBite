import { chapters, foundationChapters } from '@/content/chapters';
import { courses } from '@/content/courses';
import { operationsChapters } from '@/content/operations-chapters';
import type { ChapterDefinition, CourseDefinition } from '@/content/types';
import type { RemoteCurriculumPackage } from '@/core/content-delivery/types';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const bundledCourses = clone(courses);
const bundledChapters = clone(chapters);

function replaceArray<T>(target: T[], source: T[]) {
  target.splice(0, target.length, ...source);
}

export function activateRemoteCurriculum(content: RemoteCurriculumPackage) {
  const nextChapters = clone(content.chapters) as ChapterDefinition[];
  for (const chapter of nextChapters) for (const lesson of chapter.lessons) {
    lesson.sources = content.sources.filter(({ lessonId }) => lessonId === lesson.id).map(({ id, label, url }) => ({ id, label, url }));
    lesson.supportingAssets = content.assets.filter(({ lessonId }) => lessonId === lesson.id).map(({ id, url, mimeType, width, height, altText }) => ({ id, url, mimeType, width, height, altText }));
  }
  replaceArray(courses, clone(content.courses) as CourseDefinition[]);
  replaceArray(foundationChapters, nextChapters.filter(({ courseId }) => courseId === 'network-foundations'));
  replaceArray(operationsChapters, nextChapters.filter(({ courseId }) => courseId === 'network-operations'));
  replaceArray(chapters, nextChapters);
}

export function restoreBundledCurriculum() {
  const nextChapters = clone(bundledChapters);
  replaceArray(courses, clone(bundledCourses));
  replaceArray(foundationChapters, nextChapters.filter(({ courseId }) => courseId === 'network-foundations'));
  replaceArray(operationsChapters, nextChapters.filter(({ courseId }) => courseId === 'network-operations'));
  replaceArray(chapters, nextChapters);
}
