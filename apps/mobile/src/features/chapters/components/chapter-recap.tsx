import { StyleSheet, View } from 'react-native';

import type { ChapterDefinition } from '@/content/types';
import { Text } from '@/shared/components/console-text';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export function ChapterRecap({ recap }: Pick<ChapterDefinition, 'recap'>) {
  const styles = useThemeStyles(createStyles);
  return (
    <View accessibilityLabel="Chapter completion recap" style={styles.panel}>
      <Text variant="label" style={styles.eyebrow}>CHAPTER COMPLETE / FIELD REPORT</Text>
      <View style={styles.row}>
        <Text variant="technical" style={styles.label}>YOU BUILT</Text>
        <Text variant="bodySmall" style={styles.value}>{recap.built}</Text>
      </View>
      <View style={styles.row}>
        <Text variant="technical" style={styles.label}>YOU LEARNED</Text>
        <Text variant="bodySmall" style={styles.value}>{recap.learned}</Text>
      </View>
      <View style={[styles.row, styles.lastRow]}>
        <Text variant="technical" style={styles.label}>NEXT SIGNAL</Text>
        <Text variant="bodySmall" style={styles.value}>{recap.next}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: { marginBottom: Space.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.green },
  eyebrow: { padding: Space.md, color: colors.green, fontFamily: Fonts.medium, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { padding: Space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0 },
  label: { color: colors.textMuted, fontFamily: Fonts.medium, marginBottom: Space.xs },
  value: { color: colors.text },
});
