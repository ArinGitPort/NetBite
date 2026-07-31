import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { navigateOnce } from '@/shared/navigation';
import { Palette, Space } from '@/shared/theme';
import { useResearchStore } from '@/store/use-research-store';

export function ResearchBanner() {
  const active = useResearchStore((state) => state.active);
  const tasks = useResearchStore((state) => state.tasks);
  if (!active) return null;
  const current = tasks.findIndex((task) => !task.completedAt && !task.abandonedAt);
  return <Pressable accessibilityHint="Opens the local usability session" accessibilityRole="button" onPress={() => navigateOnce('/research')}>
    <View style={styles.banner}><Text variant="label" style={styles.label}>RESEARCH SESSION / TASK {Math.max(1, current + 1)} OF 5 / CLOUD PAUSED</Text></View>
  </Pressable>;
}

const styles = StyleSheet.create({ banner: { minHeight: 36, paddingHorizontal: Space.lg, paddingVertical: Space.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.orangeSoft, borderBottomWidth: 1, borderBottomColor: Palette.orange }, label: { color: Palette.orange, textAlign: 'center' } });
