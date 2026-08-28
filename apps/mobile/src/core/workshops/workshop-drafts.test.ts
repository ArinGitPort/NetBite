import { getCompatibleWorkshopDraft } from '@/core/workshops/workshop-drafts';

describe('workshop assessment draft compatibility', () => {
  const draft = { classId: 'class-1', versionId: 'version-1', assessmentId: 'quiz-1', requestId: 'request-1', answers: { q1: 'a', removed: 'b' }, updatedAt: '2026-08-27T00:00:00.000Z' };

  test('keeps the idempotency key within the same published version', () => {
    expect(getCompatibleWorkshopDraft(draft, 'version-1', ['q1'])).toEqual({ answers: { q1: 'a' }, requestId: 'request-1' });
  });

  test('keeps compatible answers but starts a new submission request after an update', () => {
    expect(getCompatibleWorkshopDraft(draft, 'version-2', ['q1'])).toEqual({ answers: { q1: 'a' }, requestId: undefined });
  });
});
