import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { gameStorage } from '@/store/game-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(persist(
  (set) => ({
    preference: 'system',
    setPreference: (preference) => set({ preference }),
  }),
  {
    name: 'netbite-theme-v1',
    storage: createJSONStorage(() => gameStorage),
    partialize: ({ preference }) => ({ preference }),
    skipHydration: true,
  },
));
