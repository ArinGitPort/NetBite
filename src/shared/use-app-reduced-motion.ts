import { useReducedMotion } from 'react-native-reanimated';

import { useGameStore } from '@/store/use-game-store';

export function useAppReducedMotion() {
  const systemReducedMotion = useReducedMotion();
  const preference = useGameStore((state) => state.motionPreference);
  return preference === 'reduced' || systemReducedMotion;
}
