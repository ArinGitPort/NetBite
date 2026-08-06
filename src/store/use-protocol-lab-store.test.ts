import { createTransportLabState } from '@/core/network/transport-lab';
import { migrateProtocolLabState, useProtocolLabStore } from '@/store/use-protocol-lab-store';

jest.mock('@/store/game-storage', () => ({
  gameStorage: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

describe('protocol lab persistence', () => {
  beforeEach(() => useProtocolLabStore.setState({ sessions: {}, history: {}, recoveryCopies: {} }));

  test('autosaves and retains no more than twenty undo snapshots', () => {
    for (let index = 0; index < 25; index += 1) useProtocolLabStore.getState().save('transport-service-desk', 1, { ...createTransportLabState(), clientSequence: index });
    expect(useProtocolLabStore.getState().history['transport-service-desk']).toHaveLength(20);
    useProtocolLabStore.getState().undo('transport-service-desk');
    expect((useProtocolLabStore.getState().sessions['transport-service-desk'].state as { clientSequence: number }).clientSequence).toBe(23);
  });

  test('selection-only saves do not add undo snapshots', () => {
    const state = createTransportLabState();
    useProtocolLabStore.getState().save('transport-service-desk', 1, state);
    useProtocolLabStore.getState().save('transport-service-desk', 1, { ...state, selectedDeviceId: 'server' }, false);
    expect(useProtocolLabStore.getState().history['transport-service-desk'] ?? []).toHaveLength(0);
  });

  test('archives malformed persisted envelopes during migration', () => {
    const migrated = migrateProtocolLabState({ sessions: { good: { engineVersion: 1, state: createTransportLabState(), updatedAt: 'now' }, bad: { state: 'broken' } } });
    expect(migrated.sessions.good).toBeDefined();
    expect(migrated.recoveryCopies.bad).toEqual({ state: 'broken' });
  });
});
