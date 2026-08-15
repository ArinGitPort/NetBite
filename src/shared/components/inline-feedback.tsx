import { StyleSheet, View } from 'react-native';

import { SemanticIcon } from '@/shared/components/semantic-icon';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

export type InlineFeedbackTone = 'info' | 'success' | 'warning' | 'danger';

const tone = {
  info: { color: Palette.textMuted, background: Palette.surface, icon: 'status-info' as const },
  success: { color: Palette.green, background: Palette.greenSoft, icon: 'status-complete' as const },
  warning: { color: Palette.orange, background: Palette.orangeSoft, icon: 'status-attention' as const },
  danger: { color: Palette.danger, background: Palette.dangerSoft, icon: 'status-attention' as const },
};

export function InlineFeedback({ title, message, feedbackTone = 'info', live = false }: { title: string; message?: string; feedbackTone?: InlineFeedbackTone; live?: boolean }) {
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

const styles = StyleSheet.create({
  feedback: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, padding: Space.sm, borderLeftWidth: 3 },
  copy: { minWidth: 0, flex: 1 },
  title: { fontFamily: Fonts.semibold },
  message: { color: Palette.text, marginTop: 2 },
});
