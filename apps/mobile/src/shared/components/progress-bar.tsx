import { StyleSheet, View } from 'react-native';

import type { ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export function ProgressBar({ progress }: { progress: number }) {
  const styles = useThemeStyles(createStyles);
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);
  const width = `${clampedProgress * 100}%` as `${number}%`;
  return (
    <View
      accessibilityLabel="Progress"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percentage, text: `${percentage} percent` }}
      style={styles.track}>
      <View style={[styles.fill, { width }]} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  track: { height: 4, borderRadius: 0, overflow: 'hidden' as const, backgroundColor: colors.border },
  fill: { height: '100%' as const, borderRadius: 0, backgroundColor: colors.accent },
});
