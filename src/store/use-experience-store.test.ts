import { useExperienceStore } from '@/store/use-experience-store';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

describe('experience preferences', () => {
  beforeEach(() => {
    useExperienceStore.setState({ flashcardOrientation: 'question', seenGuides: {} });
  });

  test('persists the flashcard orientation as a shared deck preference', () => {
    useExperienceStore.getState().setFlashcardOrientation('answer');
    expect(useExperienceStore.getState().flashcardOrientation).toBe('answer');
  });

  test('migrates existing guide state with the question-first default', async () => {
    const migrate = useExperienceStore.persist.getOptions().migrate;
    expect(migrate).toBeDefined();

    const migrated = await migrate?.({ seenGuides: { 'sandbox-v1': true } }, 1) as {
      flashcardOrientation: string;
      seenGuides: Record<string, boolean>;
    };

    expect(migrated.flashcardOrientation).toBe('question');
    expect(migrated.seenGuides['sandbox-v1']).toBe(true);
  });

  test('preserves legacy term and definition orientation choices', async () => {
    const migrate = useExperienceStore.persist.getOptions().migrate!;
    const questionFirst = await migrate({ flashcardOrientation: 'term' }, 2) as { flashcardOrientation: string };
    const answerFirst = await migrate({ flashcardOrientation: 'definition' }, 2) as { flashcardOrientation: string };

    expect(questionFirst.flashcardOrientation).toBe('question');
    expect(answerFirst.flashcardOrientation).toBe('answer');
  });
});
