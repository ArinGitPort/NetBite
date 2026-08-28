import { StyleSheet, View } from 'react-native';

import type { ChapterDefinition } from '@/content/types';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

export function ChapterRecap({ recap }: Pick<ChapterDefinition, 'recap'>) {
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

const styles = StyleSheet.create({
  panel: { marginBottom: Space.lg, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.green },
  eyebrow: { padding: Space.md, color: Palette.green, fontFamily: Fonts.medium, borderBottomWidth: 1, borderBottomColor: Palette.border },
  row: { padding: Space.md, borderBottomWidth: 1, borderBottomColor: Palette.border },
  lastRow: { borderBottomWidth: 0 },
  label: { color: Palette.textMuted, fontFamily: Fonts.medium, marginBottom: Space.xs },
  value: { color: Palette.text },
});
