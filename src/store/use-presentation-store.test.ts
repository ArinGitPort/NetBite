import { createEmptySandboxWorkspace, createReadyRoutedSandboxWorkspace } from '@/core/network/sandbox';
import { useGameStore } from '@/store/use-game-store';
import { usePresentationStore } from '@/store/use-presentation-store';
import { useSandboxStore } from '@/store/use-sandbox-store';

jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));

describe('presentation snapshot', () => {
  beforeEach(() => {
    useGameStore.setState({ completedLessonIds: ['temporary'], completedLabIds: [] });
    useSandboxStore.setState({ workspace: createReadyRoutedSandboxWorkspace(), guideSeen: true, past: [], future: [] });
    usePresentationStore.setState({ active: false, snapshot: undefined });
  });

  test('restores the exact saved game and sandbox slices after a session', () => {
    const originalWorkspace = createEmptySandboxWorkspace();
    usePresentationStore.setState({
      active: true,
      snapshot: {
        version: 1,
        createdAt: '2026-07-31T00:00:00.000Z',
        game: { completedLessonIds: ['original'], completedLabIds: ['first-network'] },
        sandbox: { workspace: originalWorkspace, guideSeen: false },
      },
    });

    expect(usePresentationStore.getState().restorePresentation()).toBe(true);
    expect(useGameStore.getState().completedLessonIds).toEqual(['original']);
    expect(useGameStore.getState().completedLabIds).toEqual(['first-network']);
    expect(useSandboxStore.getState().workspace).toEqual(originalWorkspace);
    expect(usePresentationStore.getState().snapshot).toBeUndefined();
    expect(usePresentationStore.getState().active).toBe(false);
  });

  test('does not replace an existing active presentation snapshot', () => {
    const snapshot = { version: 1 as const, createdAt: 'original', game: {}, sandbox: {} };
    usePresentationStore.setState({ active: true, snapshot });
    expect(usePresentationStore.getState().startPresentation()).toBe(false);
    expect(usePresentationStore.getState().snapshot).toEqual(snapshot);
  });
});
