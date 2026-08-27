import { mergeCompatibleWorkshopLibrary } from '@/core/workshops/workshop-library';
import type { WorkshopLibraryEntry } from '@/core/workshops/types';

function entry(versionId: string, lessonIds: string[], savedLessonIds: string[]): WorkshopLibraryEntry {
  return {
    classId: 'class-1', joinedAt: '2026-08-27T00:00:00.000Z', savedLessonIds,
    manifest: {
      workshopId: 'workshop-1', versionId, version: Number(versionId.at(-1)), title: 'Workshop', description: '', instructorName: 'Instructor', publishedAt: '2026-08-27T00:00:00.000Z', archived: false,
      lessons: lessonIds.map((id, index) => ({ id, title: id, summary: '', order: index + 1, blocks: [] })), topologies: [], flashcards: [], assessments: [],
    },
  };
}

describe('compatible workshop library updates', () => {
  test('retains saved stable lesson references that still exist', () => {
    const merged = mergeCompatibleWorkshopLibrary([entry('version-1', ['lesson-1', 'removed'], ['lesson-1', 'removed'])], [entry('version-2', ['lesson-1', 'lesson-2'], ['lesson-2'])]);
    expect(merged[0].savedLessonIds).toEqual(['lesson-2', 'lesson-1']);
  });
});
