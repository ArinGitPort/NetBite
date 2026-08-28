import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { StoredProtocolSession } from '@/features/protocol-labs/guided-protocol-adapter';
import { gameStorage } from '@/store/game-storage';

interface ProtocolLabStore {
  sessions: Record<string, StoredProtocolSession>;
  history: Record<string, StoredProtocolSession[]>;
  recoveryCopies: Record<string, unknown>;
  save: (labId: string, engineVersion: number, state: unknown, recordHistory?: boolean) => void;
  undo: (labId: string) => void;
  reset: (labId: string) => void;
  archive: (labId: string, value: unknown) => void;
  dismissRecovery: (labId: string) => void;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function migrateProtocolLabState(persisted: unknown) {
  const source = persisted && typeof persisted === 'object' ? persisted as Partial<ProtocolLabStore> : {};
  const rawSessions = source.sessions && typeof source.sessions === 'object' ? source.sessions : {};
  const sessions: Record<string, StoredProtocolSession> = {};
  const recoveryCopies: Record<string, unknown> = source.recoveryCopies && typeof source.recoveryCopies === 'object' ? source.recoveryCopies : {};
  for (const [labId, value] of Object.entries(rawSessions)) {
    if (value && typeof value === 'object' && Number.isInteger((value as StoredProtocolSession).engineVersion) && 'state' in value) sessions[labId] = value as StoredProtocolSession;
    else recoveryCopies[labId] = value;
  }
  return { sessions, history: {}, recoveryCopies };
}

export const useProtocolLabStore = create<ProtocolLabStore>()(persist((set) => ({
  sessions: {},
  history: {},
  recoveryCopies: {},
  save: (labId, engineVersion, stateValue, recordHistory = true) => set((current) => {
    const previous = current.sessions[labId];
    const history = previous && recordHistory ? [...(current.history[labId] ?? []), clone(previous)].slice(-20) : current.history[labId] ?? [];
    const session: StoredProtocolSession = { engineVersion, state: clone(stateValue), updatedAt: new Date().toISOString() };
    return { sessions: { ...current.sessions, [labId]: session }, history: { ...current.history, [labId]: history } };
  }),
  undo: (labId) => set((current) => {
    const history = current.history[labId] ?? [];
    const previous = history.at(-1);
    if (!previous) return current;
    return { sessions: { ...current.sessions, [labId]: clone(previous) }, history: { ...current.history, [labId]: history.slice(0, -1) } };
  }),
  reset: (labId) => set((current) => {
    const sessions = { ...current.sessions }; const history = { ...current.history };
    delete sessions[labId]; delete history[labId];
    return { sessions, history };
  }),
  archive: (labId, value) => set((current) => ({ recoveryCopies: { ...current.recoveryCopies, [labId]: clone(value) } })),
  dismissRecovery: (labId) => set((current) => {
    const recoveryCopies = { ...current.recoveryCopies }; delete recoveryCopies[labId]; return { recoveryCopies };
  }),
}), {
  name: 'netbite-protocol-labs-v1',
  version: 1,
  storage: createJSONStorage(() => gameStorage),
  skipHydration: true,
  migrate: migrateProtocolLabState,
  partialize: ({ sessions, history, recoveryCopies }) => ({ sessions, history, recoveryCopies }),
}));
