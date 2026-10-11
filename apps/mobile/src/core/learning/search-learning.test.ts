import { chapters } from '@/content/chapters';
import { buildLearningSearchIndex, searchLearning } from '@/core/learning/search-learning';

describe('offline learning search', () => {
  const entries = buildLearningSearchIndex(chapters, [], {});

  it('indexes bundled lessons, sections, and flashcards without a network request', () => {
    const lesson = chapters[0].lessons[0];
    expect(entries).toContainEqual(expect.objectContaining({ kind: 'lesson', title: lesson.title, targetId: lesson.id }));
    expect(entries.some((entry) => entry.kind === 'flashcard')).toBe(true);
    if (lesson.sections?.length) expect(entries).toContainEqual(expect.objectContaining({ targetId: lesson.id, sectionIndex: 0 }));
  });

  it('ranks title matches ahead of body matches and requires every query term', () => {
    const results = searchLearning([
      { id: 'body', kind: 'lesson', title: 'Networking', context: 'Foundations', text: 'Subnet mask', targetId: 'body' },
      { id: 'title', kind: 'lesson', title: 'Subnet mask', context: 'Foundations', text: '', targetId: 'title' },
    ], 'subnet mask');
    expect(results.map((result) => result.id)).toEqual(['title', 'body']);
    expect(searchLearning(results, 'subnet missing')).toEqual([]);
  });

  it('excludes deleted saved command references', () => {
    const saved = {
      'cli-command:show': { key: 'cli-command:show', targetType: 'cli-command' as const, targetId: 'show', title: 'show interfaces', note: '', chapterId: '1', createdAt: '', updatedAt: '', deletedAt: '2026-01-01T00:00:00Z' },
    };
    expect(buildLearningSearchIndex([], [], saved)).toEqual([]);
  });

  it('includes supported CLI commands only when the protected reference is accessible', () => {
    expect(searchLearning(buildLearningSearchIndex([], [], {}, false), 'show ip route')).toEqual([]);
    expect(searchLearning(buildLearningSearchIndex([], [], {}, true), 'show ip route')).toContainEqual(expect.objectContaining({ kind: 'command', title: 'show ip route' }));
  });
});
