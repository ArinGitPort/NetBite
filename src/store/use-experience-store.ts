import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { gameStorage } from '@/store/game-storage';

export type GuideId = 'menu-v1' | 'learn-v1' | 'lab-v1' | 'sandbox-v1';

interface ExperienceState {
  seenGuides: Partial<Record<GuideId, boolean>>;
  markGuideSeen: (id: GuideId) => void;
  resetGuides: () => void;
}

export const useExperienceStore = create<ExperienceState>()(persist((set) => ({
  seenGuides: {},
  markGuideSeen: (id) => set((state) => ({ seenGuides: { ...state.seenGuides, [id]: true } })),
  resetGuides: () => set({ seenGuides: {} }),
}), {
  name: 'netbite-experience-state-v1',
  storage: createJSONStorage(() => gameStorage),
  version: 1,
  skipHydration: true,
  partialize: (state) => ({ seenGuides: state.seenGuides }),
}));
