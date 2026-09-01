import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export function DisclosureSection({ title, summary, defaultExpanded = false, danger = false, children }: PropsWithChildren<{ title: string; summary?: string; defaultExpanded?: boolean; danger?: boolean }>) {
  const styles = useThemeStyles(createStyles);
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <View style={[styles.section, danger && styles.danger]}>
      <Pressable accessibilityHint={`${expanded ? 'Collapses' : 'Expands'} ${title}`} accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <View style={styles.copy}><Text variant="sectionHeading" style={[styles.title, danger && styles.dangerText]}>{title}</Text>{summary ? <Text variant="bodySmall" style={styles.summary}>{summary}</Text> : null}</View>
        <View style={[styles.chevron, expanded && styles.chevronExpanded]}><AppIcon name="arrow-right" size={18} /></View>
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: Space.lg },
  danger: { borderColor: colors.danger },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', padding: Space.lg, gap: Space.md },
  pressed: { backgroundColor: colors.accentSoft },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontFamily: Fonts.semibold, textTransform: 'uppercase' as const },
  dangerText: { color: colors.danger },
  summary: { color: colors.textMuted, marginTop: Space.xs },
  chevron: { transform: [{ rotate: '0deg' }] },
  chevronExpanded: { transform: [{ rotate: '90deg' }] },
  body: { borderTopWidth: 1, borderTopColor: colors.border, padding: Space.lg, gap: Space.md },
});
