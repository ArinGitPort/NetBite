import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';
import { usePresentationStore } from '@/store/use-presentation-store';

export function PresentationBanner() {
  const styles = useThemeStyles(createStyles);
  const active = usePresentationStore((state) => state.active);
  const restorePresentation = usePresentationStore((state) => state.restorePresentation);
  if (!active) return null;
  return (
    <View accessibilityRole="summary" style={styles.banner}>
      <Text variant="technical" style={styles.label}>DEMO ACCESS / NOT PURCHASED</Text>
      <Pressable accessibilityRole="button" onPress={restorePresentation} style={styles.button}>
        <Text variant="technical" style={styles.buttonText}>RESTORE MY DATA</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  banner: { minHeight: 44, paddingHorizontal: Space.md, paddingVertical: Space.xs, backgroundColor: colors.orangeSoft, borderBottomWidth: 1, borderBottomColor: colors.orange, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  label: { color: colors.orange, flexShrink: 1 },
  button: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.orange, paddingHorizontal: Space.md },
  buttonText: { color: colors.text },
});
