import { router } from 'expo-router';

import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { AppRoutes } from '@/shared/routes';

export function CourseLockedScreen({ reason }: { reason: string }) {
  return <Screen><Text variant="label">COURSE REQUIREMENT</Text><Text variant="screenTitle">MODULE LOCKED</Text><Text variant="body">{reason}</Text><AppButton label="Open readiness check" onPress={() => router.replace(AppRoutes.readiness)} /><AppButton label="Course library" variant="secondary" onPress={() => router.replace(AppRoutes.courses)} /></Screen>;
}
