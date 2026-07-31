import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { chapters } from '@/content/chapters';
import { createReadyRoutedSandboxWorkspace } from '@/core/network/sandbox';
import { gameStorage } from '@/store/game-storage';
import { useGameStore } from '@/store/use-game-store';
import { useSandboxStore } from '@/store/use-sandbox-store';

export const isDemoCapabilityEnabled = __DEV__ && process.env.EXPO_PUBLIC_NETBITE_DEMO_MODE === '1';

interface DemoSnapshot {
  version: 1;
  createdAt: string;
  game: Record<string, unknown>;
  sandbox: Record<string, unknown>;
}

interface PresentationState {
  active: boolean;
  snapshot?: DemoSnapshot;
  startPresentation: () => boolean;
  restorePresentation: () => boolean;
}

function persistedSlice<T extends object>(store: { getState: () => T; persist: { getOptions: () => { partialize?: (state: T) => unknown } } }) {
  const state = store.getState();
  return (store.persist.getOptions().partialize?.(state) ?? state) as Record<string, unknown>;
}

export const usePresentationStore = create<PresentationState>()(persist((set, get) => ({
  active: false,
  startPresentation: () => {
    if (!isDemoCapabilityEnabled || get().active || get().snapshot) return false;
    const snapshot: DemoSnapshot = {
      version: 1,
      createdAt: new Date().toISOString(),
      game: persistedSlice(useGameStore),
      sandbox: persistedSlice(useSandboxStore),
    };
    const chapterOne = chapters[0];
    useGameStore.setState((state) => ({
      ...state,
      completedLessonIds: Array.from(new Set([...state.completedLessonIds, ...chapterOne.lessons.map((lesson) => lesson.id)])),
      completedLabIds: Array.from(new Set([...state.completedLabIds, chapterOne.lab.id])),
      quizScores: { ...state.quizScores, [chapterOne.id]: chapterOne.quiz.length },
      quizContentVersions: { ...state.quizContentVersions, [chapterOne.id]: chapterOne.contentVersion },
      reviewedFlashcardChapterIds: Array.from(new Set([...state.reviewedFlashcardChapterIds, chapterOne.id])),
      flashcardContentVersions: { ...state.flashcardContentVersions, [chapterOne.id]: chapterOne.flashcardVersion },
      flashcardPositions: { ...state.flashcardPositions, [chapterOne.id]: 0 },
    }));
    useSandboxStore.setState({ workspace: createReadyRoutedSandboxWorkspace(), guideSeen: true, past: [], future: [] });
    set({ active: true, snapshot });
    return true;
  },
  restorePresentation: () => {
    const snapshot = get().snapshot;
    if (!snapshot) return false;
    useGameStore.setState(snapshot.game);
    useSandboxStore.setState({ ...snapshot.sandbox, past: [], future: [] });
    set({ active: false, snapshot: undefined });
    return true;
  },
}), {
  name: 'netbite-presentation-state-v1',
  storage: createJSONStorage(() => gameStorage),
  version: 1,
  skipHydration: true,
  partialize: (state) => ({ active: state.active, snapshot: state.snapshot }),
}));
