import { StyleSheet, View } from 'react-native';

import { SemanticIcon } from '@/shared/components/semantic-icon';
import { Text } from '@/shared/components/console-text';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';

export type InlineFeedbackTone = 'info' | 'success' | 'warning' | 'danger';

export function InlineFeedback({ title, message, feedbackTone = 'info', live = false }: { title: string; message?: string; feedbackTone?: InlineFeedbackTone; live?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const tone = {
    info: { color: colors.textMuted, background: colors.surface, icon: 'status-info' as const },
    success: { color: colors.green, background: colors.greenSoft, icon: 'status-complete' as const },
    warning: { color: colors.orange, background: colors.orangeSoft, icon: 'status-attention' as const },
    danger: { color: colors.danger, background: colors.dangerSoft, icon: 'status-attention' as const },
  };
  const appearance = tone[feedbackTone];
  return (
    <View accessible accessibilityLiveRegion={live ? 'polite' : 'none'} accessibilityRole={live || feedbackTone === 'warning' || feedbackTone === 'danger' ? 'alert' : undefined} style={[styles.feedback, { borderColor: appearance.color, backgroundColor: appearance.background }]}>
      <SemanticIcon color={appearance.color} name={appearance.icon} size={20} />
      <View style={styles.copy}>
        <Text variant="label" style={[styles.title, { color: appearance.color }]}>{title}</Text>
        {message ? <Text variant="bodySmall" style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  feedback: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, padding: Space.sm, borderLeftWidth: 3 },
  copy: { minWidth: 0, flex: 1 },
  title: { fontFamily: Fonts.semibold },
  message: { color: colors.text, marginTop: 2 },
});
