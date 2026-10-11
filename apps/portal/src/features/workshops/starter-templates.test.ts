import { describe, expect, it } from 'vitest';

import { assessmentStarterDraft, lessonStarterDraft } from '@/features/workshops/starter-templates';

describe('authoring starters', () => {
  it('creates fresh lesson block identities each time', () => {
    const first = lessonStarterDraft('concept');
    const second = lessonStarterDraft('concept');
    expect(first.blocks.length).toBeGreaterThan(1);
    expect(first.blocks[0].id).not.toBe(second.blocks[0].id);
  });

  it('creates a valid single-choice example with a fresh answer key', () => {
    const first = assessmentStarterDraft('knowledge-check').draft.questions![0];
    const second = assessmentStarterDraft('knowledge-check').draft.questions![0];
    expect(first.choices.some((choice) => choice.id === first.correctChoiceId)).toBe(true);
    expect(first.id).not.toBe(second.id);
  });
});
