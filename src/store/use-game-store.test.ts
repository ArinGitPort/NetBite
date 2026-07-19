import { createChapterOneTopology } from '@/core/network/models';
import { useGameStore, type GameState } from '@/store/use-game-store';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

describe('game store rules', () => {
  beforeEach(() => {
    useGameStore.setState({
      topology: createChapterOneTopology(),
      topologyCanvasWidth: 272,
      selectedConnectionStartId: undefined,
      selectedDeviceForRemovalId: undefined,
      completedLessonIds: [],
      quizScores: {},
      quizContentVersions: {},
      reviewedFlashcardChapterIds: [],
      flashcardContentVersions: {},
      flashcardPositions: {},
      completedLabIds: [],
      cliGuideSeen: false,
    });
  });

  test('rejects duplicate cables with an explicit result', () => {
    const [firstPC, networkSwitch] = useGameStore.getState().topology.devices;

    expect(useGameStore.getState().selectDeviceForConnection(firstPC.id)).toBe('start-selected');
    expect(useGameStore.getState().selectDeviceForConnection(networkSwitch.id)).toBe('connected');
    expect(useGameStore.getState().selectDeviceForConnection(firstPC.id)).toBe('start-selected');
    expect(useGameStore.getState().selectDeviceForConnection(networkSwitch.id)).toBe('duplicate');
    expect(useGameStore.getState().topology.cables).toHaveLength(1);
  });

  test('keeps the best quiz score', () => {
    useGameStore.getState().saveQuizScore('2', 4, 2);
    useGameStore.getState().saveQuizScore('2', 2, 2);

    expect(useGameStore.getState().quizScores['2']).toBe(4);
    expect(useGameStore.getState().quizContentVersions['2']).toBe(2);
  });

  test('resetting the workspace preserves earned lab completion', () => {
    useGameStore.getState().completeLab('first-network');
    useGameStore.getState().resetLab();

    expect(useGameStore.getState().completedLabIds).toContain('first-network');
    expect(useGameStore.getState().topology.cables).toHaveLength(0);
  });

  test('resumes flashcards at the last saved card and clears the position after review', () => {
    useGameStore.getState().saveFlashcardPosition('2', 4);
    expect(useGameStore.getState().flashcardPositions['2']).toBe(4);

    useGameStore.getState().clearFlashcardPosition('2');
    expect(useGameStore.getState().flashcardPositions['2']).toBeUndefined();
  });

  test('migrates Chapter 1 progress from the single-chapter storage format', async () => {
    const migrate = useGameStore.persist.getOptions().migrate;
    const migrated = await migrate?.({
      quizScore: 4,
      flashcardsReviewed: true,
      labComplete: true,
    }, 1) as GameState | undefined;

    expect(migrated).toMatchObject({
      quizScores: { 1: 4 },
      quizContentVersions: { 1: 1 },
      reviewedFlashcardChapterIds: ['1'],
      flashcardContentVersions: { 1: 1 },
      completedLabIds: ['first-network'],
      flashcardPositions: {},
    });
  });

  test('starts a new best score when curriculum content changes', () => {
    useGameStore.getState().saveQuizScore('4', 5, 1);
    useGameStore.getState().saveQuizScore('4', 3, 2);
    expect(useGameStore.getState().quizScores['4']).toBe(3);
    expect(useGameStore.getState().quizContentVersions['4']).toBe(2);
  });

  test('persists CLI guide acknowledgement independently of lab completion', () => {
    useGameStore.getState().markCliGuideSeen();
    expect(useGameStore.getState().cliGuideSeen).toBe(true);
    expect(useGameStore.getState().completedLabIds).toEqual([]);
  });

  test('adds the CLI guide flag when migrating pre-CLI progress', async () => {
    const migrate = useGameStore.persist.getOptions().migrate;
    const migrated = await migrate?.({ completedLabIds: ['ping-diagnostic-desk'] }, 4) as GameState | undefined;
    expect(migrated).toMatchObject({ completedLabIds: ['ping-diagnostic-desk'], cliGuideSeen: false });
  });

  test('adds accessible app preferences without changing historical progress', async () => {
    const migrate = useGameStore.persist.getOptions().migrate;
    const migrated = await migrate?.({ completedLessonIds: ['network-definition'] }, 5) as GameState | undefined;
    expect(migrated).toMatchObject({ completedLessonIds: ['network-definition'], hapticsEnabled: true, motionPreference: 'system' });
  });
});
