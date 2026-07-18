import * as Haptics from 'expo-haptics';

function ignoreUnavailableHaptics(promise: Promise<void>) {
  void promise.catch(() => undefined);
}

export function selectionHaptic() {
  ignoreUnavailableHaptics(Haptics.selectionAsync());
}

export function successHaptic() {
  ignoreUnavailableHaptics(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningHaptic() {
  ignoreUnavailableHaptics(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
