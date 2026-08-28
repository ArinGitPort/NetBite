import { getWorkshopImageUrls, resolveWorkshopImageUri } from '@/core/workshops/workshop-assets';
import type { WorkshopLibraryEntry } from '@/core/workshops/types';

jest.mock('expo-file-system', () => ({
  Directory: class Directory {},
  File: class MockFile { exists = true; uri: string; constructor(value: string) { this.uri = value; } },
  Paths: { document: { uri: 'file:///documents' } },
}));

const entry: WorkshopLibraryEntry = {
  classId: 'class-1', joinedAt: '2026-08-27T00:00:00.000Z', savedLessonIds: [],
  manifest: {
    workshopId: 'workshop-1', versionId: 'version-1', version: 1, title: 'Routing review', description: '', instructorName: 'Instructor', publishedAt: '2026-08-27T00:00:00.000Z', archived: false,
    lessons: [{ id: 'lesson-1', title: 'Routes', summary: '', order: 1, blocks: [
      { id: 'image-1', type: 'image', imageUrl: 'https://cdn.example.edu/route.png', altText: 'Route diagram' },
      { id: 'image-2', type: 'image', imageUrl: 'https://cdn.example.edu/route.png', altText: 'Same route diagram' },
      { id: 'paragraph-1', type: 'paragraph', text: 'Read the route.' },
    ] }],
    topologies: [], flashcards: [], assessments: [],
  },
};

describe('workshop offline assets', () => {
  test('collects each public lesson image once', () => {
    expect(getWorkshopImageUrls(entry)).toEqual(['https://cdn.example.edu/route.png']);
  });

  test('uses the versioned local file and falls back to the remote address', () => {
    const mapping = { 'version-1': { 'https://cdn.example.edu/route.png': 'file:///documents/netbite-workshops/version-1/route.png' } };
    expect(resolveWorkshopImageUri('version-1', 'https://cdn.example.edu/route.png', mapping)).toContain('file:///documents');
    expect(resolveWorkshopImageUri('version-2', 'https://cdn.example.edu/route.png', mapping)).toBe('https://cdn.example.edu/route.png');
  });
});
