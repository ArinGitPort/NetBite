import { useGameStore } from '@/store/use-game-store';
import { useResearchStore } from '@/store/use-research-store';
import { useSandboxStore } from '@/store/use-sandbox-store';

jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));

describe('research store', () => {
  beforeEach(() => {
    useResearchStore.setState({ active: false, consented: false, completedAt: undefined, tasks: [
      { id: 'continue-learning', helpCount: 0, errorCount: 0 },
      { id: 'find-subnetting', helpCount: 0, errorCount: 0 },
      { id: 'build-lan', helpCount: 0, errorCount: 0 },
      { id: 'successful-ping', helpCount: 0, errorCount: 0 },
      { id: 'recover-network', helpCount: 0, errorCount: 0 },
    ], snapshot: undefined });
  });

  it('does not start when the development capability is unavailable', () => {
    expect(useResearchStore.getState().startSession()).toBe(false);
  });

  it('records only aggregate current-task evidence', () => {
    useResearchStore.setState({ active: true });
    useResearchStore.getState().recordHelp();
    useResearchStore.getState().recordEvent('continued-learning');
    expect(useResearchStore.getState().tasks[0]).toMatchObject({ helpCount: 1, errorCount: 0 });
    expect(useResearchStore.getState().tasks[0].completedAt).toBeDefined();
    expect(JSON.stringify(useResearchStore.getState())).not.toContain('192.168');
  });

  it('restores an exact captured state', () => {
    const game = { completedLessonIds: ['old-lesson'] };
    const sandbox = { guideSeen: false };
    useGameStore.setState(game);
    useSandboxStore.setState(sandbox);
    useResearchStore.setState({ active: true, snapshot: { version: 1, createdAt: new Date().toISOString(), game, sandbox } });
    useGameStore.setState({ completedLessonIds: ['temporary'] });
    expect(useResearchStore.getState().restoreSession()).toBe(true);
    expect(useGameStore.getState().completedLessonIds).toEqual(['old-lesson']);
    expect(useResearchStore.getState().active).toBe(false);
  });
});
