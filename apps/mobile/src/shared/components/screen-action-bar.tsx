import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

interface ScreenActionBarProps extends PropsWithChildren {
  feedback?: string;
  label?: string;
  tone?: 'normal' | 'error' | 'warning';
}

export function ScreenActionBar({ children, feedback, label, tone = 'normal' }: ScreenActionBarProps) {
  const styles = useThemeStyles(createStyles);
  return (
    <View accessibilityLabel="Current action" style={styles.bar} testID="screen-action-bar">
      {label || feedback ? <View style={styles.copy}>
        {label ? <Text variant="technical" style={styles.label}>{label}</Text> : null}
        {feedback ? <Text accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'} accessibilityRole={tone === 'error' ? 'alert' : undefined} variant="bodySmall" style={[styles.feedback, tone === 'error' && styles.error, tone === 'warning' && styles.warning]}>{feedback}</Text> : null}
      </View> : null}
      <View style={styles.action}>{children}</View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bar: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  copy: { minWidth: 140, flex: 1, flexShrink: 1, gap: 2 },
  label: { color: colors.green, fontFamily: Fonts.semibold },
  feedback: { color: colors.textMuted },
  error: { color: colors.danger },
  warning: { color: colors.orange },
  action: { minWidth: 180, flexGrow: 1, flexShrink: 1 },
});
