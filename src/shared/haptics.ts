import * as Haptics from 'expo-haptics';

import { useGameStore } from '@/store/use-game-store';

function ignoreUnavailableHaptics(promise: Promise<void>) {
  void promise.catch(() => undefined);
}

export function selectionHaptic() {
  if (!useGameStore.getState().hapticsEnabled) return;
  ignoreUnavailableHaptics(Haptics.selectionAsync());
}

export function successHaptic() {
  if (!useGameStore.getState().hapticsEnabled) return;
  ignoreUnavailableHaptics(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningHaptic() {
  if (!useGameStore.getState().hapticsEnabled) return;
  ignoreUnavailableHaptics(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
