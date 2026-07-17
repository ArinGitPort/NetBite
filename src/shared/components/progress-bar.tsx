import { StyleSheet, View } from 'react-native';

import { Palette } from '@/shared/theme';

export function ProgressBar({ progress }: { progress: number }) {
  const width = `${Math.max(0, Math.min(1, progress)) * 100}%` as `${number}%`;
  return (
    <View style={styles.track} accessibilityRole="progressbar">
      <View style={[styles.fill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 4, borderRadius: 0, overflow: 'hidden', backgroundColor: Palette.border },
  fill: { height: '100%', borderRadius: 0, backgroundColor: Palette.accent },
});
