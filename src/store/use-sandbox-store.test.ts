import { addSandboxDevice, createEmptySandboxWorkspace } from '@/core/network/sandbox';
import { useSandboxStore } from '@/store/use-sandbox-store';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));

describe('sandbox store', () => {
  beforeEach(() => useSandboxStore.setState({ workspace: createEmptySandboxWorkspace(), guideSeen: false, past: [], future: [] }));

  test('keeps curriculum-independent history and supports undo and redo', () => {
    const changed = addSandboxDevice(useSandboxStore.getState().workspace, 'pc', { x: 10, y: 20 }).state;
    useSandboxStore.getState().commitWorkspace(changed);
    expect(useSandboxStore.getState().workspace.devices).toHaveLength(1);
    useSandboxStore.getState().undo();
    expect(useSandboxStore.getState().workspace.devices).toHaveLength(0);
    useSandboxStore.getState().redo();
    expect(useSandboxStore.getState().workspace.devices).toHaveLength(1);
  });

  test('persists workspace and guide state but not session history', () => {
    const partialize = useSandboxStore.persist.getOptions().partialize!;
    const partial = partialize({ ...useSandboxStore.getState(), guideSeen: true });
    expect(partial).toMatchObject({ guideSeen: true, workspace: expect.any(Object) });
    expect(partial).not.toHaveProperty('past');
    expect(partial).not.toHaveProperty('future');
  });

  test('does not consume undo history for an unchanged workspace', () => {
    const workspace = useSandboxStore.getState().workspace;
    useSandboxStore.getState().commitWorkspace(workspace);
    useSandboxStore.getState().commitWorkspace(structuredClone(workspace));
    expect(useSandboxStore.getState().past).toHaveLength(0);
  });

  test('ignores malformed persisted workspaces while preserving safe preferences', () => {
    const merge = useSandboxStore.persist.getOptions().merge!;
    const current = useSandboxStore.getState();
    const merged = merge({ workspace: { schemaVersion: 1, devices: [{}], links: [] }, guideSeen: true }, current) as typeof current;
    expect(merged.workspace).toEqual(current.workspace);
    expect(merged.guideSeen).toBe(true);
    expect(merged.past).toEqual([]);
  });

  test('new network clears the workspace and remains undoable in the session', () => {
    useSandboxStore.getState().commitWorkspace(addSandboxDevice(useSandboxStore.getState().workspace, 'router', { x: 0, y: 0 }).state);
    useSandboxStore.getState().newNetwork();
    expect(useSandboxStore.getState().workspace.devices).toHaveLength(0);
    useSandboxStore.getState().undo();
    expect(useSandboxStore.getState().workspace.devices[0].type).toBe('router');
  });
});
