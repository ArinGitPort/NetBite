import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { gameStorage } from '@/store/game-storage';

export type GuideId = 'menu-v1' | 'learn-v1' | 'lab-v1' | 'sandbox-v1';
export type FlashcardOrientation = 'question' | 'answer';

interface ExperienceState {
  flashcardOrientation: FlashcardOrientation;
  seenGuides: Partial<Record<GuideId, boolean>>;
  markGuideSeen: (id: GuideId) => void;
  resetGuides: () => void;
  setFlashcardOrientation: (orientation: FlashcardOrientation) => void;
}

export const useExperienceStore = create<ExperienceState>()(persist((set) => ({
  flashcardOrientation: 'question',
  seenGuides: {},
  markGuideSeen: (id) => set((state) => ({ seenGuides: { ...state.seenGuides, [id]: true } })),
  resetGuides: () => set({ seenGuides: {} }),
  setFlashcardOrientation: (flashcardOrientation) => set({ flashcardOrientation }),
}), {
  name: 'netbite-experience-state-v1',
  storage: createJSONStorage(() => gameStorage),
  version: 3,
  skipHydration: true,
  migrate: (persistedState) => {
    const persisted = persistedState as (Partial<Pick<ExperienceState, 'seenGuides'>> & {
      flashcardOrientation?: FlashcardOrientation | 'term' | 'definition';
    }) | undefined;
    const flashcardOrientation = persisted?.flashcardOrientation === 'answer' || persisted?.flashcardOrientation === 'definition'
      ? 'answer'
      : 'question';
    return {
      flashcardOrientation,
      seenGuides: persisted?.seenGuides ?? {},
    };
  },
  partialize: (state) => ({ flashcardOrientation: state.flashcardOrientation, seenGuides: state.seenGuides }),
}));
