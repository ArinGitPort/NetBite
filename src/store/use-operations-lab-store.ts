import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  emptyOperationsSimulationSession,
  type OperationsSimulationSession,
} from '@/features/operations/operations-simulator';
import { gameStorage } from '@/store/game-storage';

interface OperationsLabStore {
  sessions: Record<string, OperationsSimulationSession>;
  history: Record<string, OperationsSimulationSession[]>;
  recoveryCopies: Record<string, unknown>;
  save: (labId: string, session: OperationsSimulationSession) => void;
  undo: (labId: string) => void;
  reset: (labId: string) => void;
  archiveForUpgrade: (labId: string) => void;
  dismissRecovery: (labId: string) => void;
}

export const emptyOperationsSession = emptyOperationsSimulationSession;

function cloneSession(session: OperationsSimulationSession): OperationsSimulationSession {
  return JSON.parse(JSON.stringify(session)) as OperationsSimulationSession;
}

export function migrateOperationsLabState(persisted: unknown) {
  const source = persisted && typeof persisted === 'object' ? persisted as Record<string, unknown> : {};
  const rawSessions = source.sessions && typeof source.sessions === 'object' ? source.sessions as Record<string, unknown> : {};
  const sessions: Record<string, OperationsSimulationSession> = {};
  const recoveryCopies: Record<string, unknown> = source.recoveryCopies && typeof source.recoveryCopies === 'object'
    ? source.recoveryCopies as Record<string, unknown>
    : {};

  for (const [labId, value] of Object.entries(rawSessions)) {
    if (value && typeof value === 'object' && (value as { version?: number }).version === 3) sessions[labId] = { ...(value as OperationsSimulationSession), tables: (value as OperationsSimulationSession).tables ?? {} };
    else recoveryCopies[labId] = value;
  }
  return { sessions, history: {}, recoveryCopies };
}

export const useOperationsLabStore = create<OperationsLabStore>()(persist((set) => ({
  sessions: {},
  history: {},
  recoveryCopies: {},
  save: (labId, session) => set((state) => {
    const previous = state.sessions[labId];
    const history = previous ? [...(state.history[labId] ?? []), cloneSession(previous)].slice(-20) : state.history[labId] ?? [];
    return {
      sessions: { ...state.sessions, [labId]: { ...cloneSession(session), updatedAt: new Date().toISOString() } },
      history: { ...state.history, [labId]: history },
    };
  }),
  undo: (labId) => set((state) => {
    const history = state.history[labId] ?? [];
    const previous = history.at(-1);
    if (!previous) return state;
    return {
      sessions: { ...state.sessions, [labId]: cloneSession(previous) },
      history: { ...state.history, [labId]: history.slice(0, -1) },
    };
  }),
  reset: (labId) => set((state) => {
    const sessions = { ...state.sessions };
    const history = { ...state.history };
    delete sessions[labId];
    delete history[labId];
    return { sessions, history };
  }),
  archiveForUpgrade: (labId) => set((state) => {
    const session = state.sessions[labId];
    if (!session) return state;
    const sessions = { ...state.sessions };
    const history = { ...state.history };
    delete sessions[labId];
    delete history[labId];
    return { sessions, history, recoveryCopies: { ...state.recoveryCopies, [labId]: cloneSession(session) } };
  }),
  dismissRecovery: (labId) => set((state) => {
    const recoveryCopies = { ...state.recoveryCopies };
    delete recoveryCopies[labId];
    return { recoveryCopies };
  }),
}), {
  name: 'netbite-operations-labs-v1',
  version: 3,
  storage: createJSONStorage(() => gameStorage),
  skipHydration: true,
  migrate: migrateOperationsLabState,
  partialize: ({ sessions, recoveryCopies }) => ({ sessions, recoveryCopies }),
}));
