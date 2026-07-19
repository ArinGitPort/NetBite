import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createEmptySandboxWorkspace, type SandboxWorkspace } from '@/core/network/sandbox';
import { gameStorage } from '@/store/game-storage';

const HISTORY_LIMIT = 20;

interface SandboxStoreState {
  workspace: SandboxWorkspace;
  guideSeen: boolean;
  past: SandboxWorkspace[];
  future: SandboxWorkspace[];
  commitWorkspace: (workspace: SandboxWorkspace) => void;
  replaceWorkspace: (workspace: SandboxWorkspace) => void;
  undo: () => void;
  redo: () => void;
  newNetwork: () => void;
  markGuideSeen: () => void;
}

export const useSandboxStore = create<SandboxStoreState>()(persist((set) => ({
  workspace: createEmptySandboxWorkspace(),
  guideSeen: false,
  past: [],
  future: [],
  commitWorkspace: (workspace) => set((state) => ({
    workspace,
    past: [...state.past, state.workspace].slice(-HISTORY_LIMIT),
    future: [],
  })),
  replaceWorkspace: (workspace) => set({ workspace }),
  undo: () => set((state) => {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return { workspace: previous, past: state.past.slice(0, -1), future: [state.workspace, ...state.future].slice(0, HISTORY_LIMIT) };
  }),
  redo: () => set((state) => {
    const next = state.future[0];
    if (!next) return state;
    return { workspace: next, past: [...state.past, state.workspace].slice(-HISTORY_LIMIT), future: state.future.slice(1) };
  }),
  newNetwork: () => set((state) => ({ workspace: createEmptySandboxWorkspace(), past: [...state.past, state.workspace].slice(-HISTORY_LIMIT), future: [] })),
  markGuideSeen: () => set({ guideSeen: true }),
}), {
  name: 'netbite-sandbox-state-v1',
  storage: createJSONStorage(() => gameStorage),
  version: 1,
  skipHydration: true,
  partialize: (state) => ({ workspace: state.workspace, guideSeen: state.guideSeen }),
  merge: (persisted, current) => ({ ...current, ...(persisted as Partial<SandboxStoreState>), past: [], future: [] }),
}));
