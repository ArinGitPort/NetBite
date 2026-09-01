import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Fonts, Radius, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

interface LabGoalPanelProps {
  goal: string;
  style?: StyleProp<ViewStyle>;
}

export function LabGoalPanel({ goal, style }: LabGoalPanelProps) {
  const styles = useThemeStyles(createStyles);

  return (
    <View accessibilityLabel={`Your goal. ${goal}`} style={[styles.panel, style]}>
      <Text variant="label" style={styles.label}>YOUR GOAL</Text>
      <Text variant="body" style={styles.goal}>{goal}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: {
    padding: Space.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.green,
    backgroundColor: colors.greenSoft,
  },
  label: { color: colors.green, fontFamily: Fonts.medium },
  goal: { color: colors.text, marginTop: Space.xs },
});
