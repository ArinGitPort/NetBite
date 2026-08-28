import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createEmptySandboxWorkspace } from '@/core/network/sandbox';
import { gameStorage } from '@/store/game-storage';
import { useGameStore } from '@/store/use-game-store';
import { useSandboxStore } from '@/store/use-sandbox-store';

export const isResearchCapabilityEnabled = __DEV__ && process.env.EXPO_PUBLIC_NETBITE_RESEARCH_MODE === '1';

export type ResearchTaskId = 'continue-learning' | 'find-subnetting' | 'build-lan' | 'successful-ping' | 'recover-network';
export type ResearchEvent = 'continued-learning' | 'opened-subnetting' | 'lan-ready' | 'ping-success' | 'simulation-error';

export interface ResearchTaskResult {
  id: ResearchTaskId;
  startedAt?: string;
  completedAt?: string;
  abandonedAt?: string;
  helpCount: number;
  errorCount: number;
}

interface ResearchSnapshot {
  version: 1;
  createdAt: string;
  game: Record<string, unknown>;
  sandbox: Record<string, unknown>;
}

interface ResearchState {
  consented: boolean;
  active: boolean;
  completedAt?: string;
  tasks: ResearchTaskResult[];
  snapshot?: ResearchSnapshot;
  startSession: () => boolean;
  recordEvent: (event: ResearchEvent) => void;
  recordHelp: () => void;
  abandonCurrentTask: () => void;
  restoreSession: () => boolean;
  deleteSession: () => void;
}

export const researchTasks: { id: ResearchTaskId; title: string; instruction: string }[] = [
  { id: 'continue-learning', title: 'Continue the next lesson', instruction: 'From the main menu, open the recommended next learning activity.' },
  { id: 'find-subnetting', title: 'Find Subnetting', instruction: 'Open the learning path and locate Chapter 5: Subnetting.' },
  { id: 'build-lan', title: 'Build a small LAN', instruction: 'In the Sandbox, create two PCs and one switch, connect them, and save local IPv4 settings.' },
  { id: 'successful-ping', title: 'Run a successful ping', instruction: 'Use the Sandbox test tools to establish a successful Echo round trip.' },
  { id: 'recover-network', title: 'Recover a broken network', instruction: 'Cause or encounter one deterministic failure, correct it, then run a successful test.' },
];

function emptyTasks(): ResearchTaskResult[] {
  return researchTasks.map(({ id }) => ({ id, helpCount: 0, errorCount: 0 }));
}

function persistedSlice<T extends object>(store: { getState: () => T; persist: { getOptions: () => { partialize?: (state: T) => unknown } } }) {
  const state = store.getState();
  return (store.persist.getOptions().partialize?.(state) ?? state) as Record<string, unknown>;
}

function currentTaskIndex(tasks: ResearchTaskResult[]) {
  return tasks.findIndex((task) => !task.completedAt && !task.abandonedAt);
}

function expectedEvent(id: ResearchTaskId, event: ResearchEvent, tasks: ResearchTaskResult[]) {
  if (id === 'continue-learning') return event === 'continued-learning';
  if (id === 'find-subnetting') return event === 'opened-subnetting';
  if (id === 'build-lan') return event === 'lan-ready';
  if (id === 'successful-ping') return event === 'ping-success';
  if (id === 'recover-network') return event === 'ping-success' && tasks.find((task) => task.id === id)!.errorCount > 0;
  return false;
}

export const useResearchStore = create<ResearchState>()(persist((set, get) => ({
  consented: false,
  active: false,
  tasks: emptyTasks(),
  startSession: () => {
    if (!isResearchCapabilityEnabled || get().active || get().snapshot) return false;
    const snapshot: ResearchSnapshot = {
      version: 1,
      createdAt: new Date().toISOString(),
      game: persistedSlice(useGameStore),
      sandbox: persistedSlice(useSandboxStore),
    };
    useSandboxStore.setState({ workspace: createEmptySandboxWorkspace(), guideSeen: true, past: [], future: [] });
    set({ consented: true, active: true, completedAt: undefined, snapshot, tasks: emptyTasks() });
    return true;
  },
  recordEvent: (event) => set((state) => {
    if (!state.active) return state;
    const index = currentTaskIndex(state.tasks);
    if (index < 0) return state;
    const now = new Date().toISOString();
    const tasks = state.tasks.map((task, taskIndex) => {
      if (taskIndex !== index) return task;
      const startedAt = task.startedAt ?? now;
      const errorCount = task.errorCount + (event === 'simulation-error' ? 1 : 0);
      const nextTask = { ...task, startedAt, errorCount };
      return expectedEvent(task.id, event, state.tasks.map((item, itemIndex) => itemIndex === index ? nextTask : item))
        ? { ...nextTask, completedAt: now }
        : nextTask;
    });
    return { ...state, tasks, completedAt: currentTaskIndex(tasks) < 0 ? now : undefined };
  }),
  recordHelp: () => set((state) => {
    if (!state.active) return state;
    const index = currentTaskIndex(state.tasks);
    if (index < 0) return state;
    const now = new Date().toISOString();
    return { ...state, tasks: state.tasks.map((task, taskIndex) => taskIndex === index ? { ...task, startedAt: task.startedAt ?? now, helpCount: task.helpCount + 1 } : task) };
  }),
  abandonCurrentTask: () => set((state) => {
    const index = currentTaskIndex(state.tasks);
    if (!state.active || index < 0) return state;
    const now = new Date().toISOString();
    const tasks = state.tasks.map((task, taskIndex) => taskIndex === index ? { ...task, startedAt: task.startedAt ?? now, abandonedAt: now } : task);
    return { ...state, tasks, completedAt: currentTaskIndex(tasks) < 0 ? now : undefined };
  }),
  restoreSession: () => {
    const snapshot = get().snapshot;
    if (!snapshot) return false;
    useGameStore.setState(snapshot.game);
    useSandboxStore.setState({ ...snapshot.sandbox, past: [], future: [] });
    set({ active: false, snapshot: undefined });
    return true;
  },
  deleteSession: () => set({ consented: false, active: false, completedAt: undefined, tasks: emptyTasks(), snapshot: undefined }),
}), {
  name: 'netbite-research-state-v1',
  storage: createJSONStorage(() => gameStorage),
  version: 1,
  skipHydration: true,
  partialize: (state) => ({ consented: state.consented, active: state.active, completedAt: state.completedAt, tasks: state.tasks, snapshot: state.snapshot }),
  merge: (persisted, current) => ({ ...current, ...(persisted as Partial<ResearchState>), tasks: Array.isArray((persisted as Partial<ResearchState>)?.tasks) ? (persisted as Partial<ResearchState>).tasks! : emptyTasks() }),
}));

export function formatResearchSummary(tasks: ResearchTaskResult[]) {
  const lines = ['NETBITE USABILITY SESSION', 'LOCAL / CONSENTED / REDACTED', ''];
  for (const task of tasks) {
    const definition = researchTasks.find((item) => item.id === task.id);
    const result = task.completedAt ? 'COMPLETED' : task.abandonedAt ? 'ABANDONED' : 'NOT COMPLETED';
    const duration = task.startedAt && (task.completedAt || task.abandonedAt)
      ? Math.max(0, Math.round((new Date(task.completedAt ?? task.abandonedAt!).getTime() - new Date(task.startedAt).getTime()) / 1000))
      : 0;
    lines.push(`${definition?.title ?? task.id}: ${result}`, `Duration: ${duration}s / Help: ${task.helpCount} / Errors: ${task.errorCount}`, '');
  }
  lines.push('No notes, commands, addresses, account identifiers, or screen contents were recorded.');
  return lines.join('\n');
}
