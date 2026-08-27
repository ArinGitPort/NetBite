import type { WorkshopLibraryEntry } from '@/core/workshops/types';

export function mergeCompatibleWorkshopLibrary(previous: WorkshopLibraryEntry[], incoming: WorkshopLibraryEntry[]) {
  const previousByClass = new Map(previous.map((entry) => [entry.classId, entry]));
  return incoming.map((entry) => {
    const prior = previousByClass.get(entry.classId);
    if (!prior) return entry;
    const availableLessonIds = new Set(entry.manifest.lessons.map((lesson) => lesson.id));
    const savedLessonIds = [...new Set([...entry.savedLessonIds, ...prior.savedLessonIds])].filter((lessonId) => availableLessonIds.has(lessonId));
    return { ...entry, savedLessonIds };
  });
}
