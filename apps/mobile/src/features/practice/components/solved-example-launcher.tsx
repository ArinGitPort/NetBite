import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SolvedLabExampleModal } from '@/features/practice/components/solved-lab-example-modal';
import { SemanticIcon } from '@/shared/components/semantic-icon';
import { Text } from '@/shared/components/console-text';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';

export function SolvedExampleLauncher({ labId }: { labId: string }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [visible, setVisible] = useState(false);
  return <>
    <Pressable accessibilityLabel="View completed lab" accessibilityHint="Opens the exact completed lab in a separate read-only view without changing your work" accessibilityRole="button" onPress={() => setVisible(true)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.signal} />
      <View style={styles.icon}><SemanticIcon color={colors.green} name="saved" size={28} /></View>
      <View style={styles.copy}><Text variant="technical" style={styles.eyebrow}>COMPLETED EXAMPLE</Text><Text variant="sectionHeading" style={styles.title}>VIEW COMPLETED LAB</Text><Text variant="bodySmall" style={styles.description}>EXACT SOLUTION / READ-ONLY{`\n`}YOUR CURRENT LAB WILL NOT CHANGE</Text></View>
      <Text variant="label" style={styles.open}>OPEN</Text>
    </Pressable>
    <SolvedLabExampleModal labId={labId} onClose={() => setVisible(false)} visible={visible} />
  </>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { position: 'relative', minHeight: 84, minWidth: 0, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: Space.md, marginBottom: Space.lg, padding: Space.md, borderWidth: 1, borderColor: colors.green, backgroundColor: colors.greenSoft },
  signal: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.orange },
  pressed: { backgroundColor: colors.orangeSoft, borderColor: colors.orange },
  icon: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.green, backgroundColor: colors.background },
  copy: { flex: 1, minWidth: 0, gap: 2 }, eyebrow: { color: colors.orange }, title: { color: colors.text, fontFamily: Fonts.semibold }, description: { color: colors.textMuted }, open: { color: colors.green, flexShrink: 0 },
});
