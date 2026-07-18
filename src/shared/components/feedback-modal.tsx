import { Modal, StyleSheet, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/shared/components/app-icon';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';

type FeedbackTone = 'neutral' | 'warning' | 'success';

interface FeedbackModalAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  leadingIcon?: AppIconName;
  trailingIcon?: AppIconName;
}

interface FeedbackModalProps {
  visible: boolean;
  tone?: FeedbackTone;
  eyebrow: string;
  title: string;
  message: string;
  detail?: string;
  icon?: AppIconName;
  primaryAction: FeedbackModalAction;
  secondaryAction?: FeedbackModalAction;
  onRequestClose: () => void;
}

export function FeedbackModal({
  visible,
  tone = 'neutral',
  eyebrow,
  title,
  message,
  detail,
  icon,
  primaryAction,
  secondaryAction,
  onRequestClose,
}: FeedbackModalProps) {
  const toneStyle = tone === 'success' ? styles.success : tone === 'warning' ? styles.warning : styles.neutral;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityRole="alert" accessibilityViewIsModal style={[styles.panel, toneStyle]}>
          {icon ? <AppIcon name={icon} size={32} /> : null}
          <Text style={[styles.eyebrow, tone === 'success' && styles.successText, tone === 'warning' && styles.warningText]}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
          <View style={styles.actions}>
            {secondaryAction ? <AppButton {...secondaryAction} /> : null}
            <AppButton {...primaryAction} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
    backgroundColor: 'rgba(10, 8, 11, 0.84)',
  },
  panel: {
    width: '100%',
    maxWidth: 460,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Space.xl,
    backgroundColor: Palette.surfaceRaised,
  },
  neutral: { borderColor: Palette.border },
  warning: { borderColor: Palette.orange },
  success: { borderColor: Palette.green },
  eyebrow: {
    color: Palette.textMuted,
    fontFamily: Fonts.medium,
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: Space.md,
  },
  warningText: { color: Palette.orange },
  successText: { color: Palette.green },
  title: {
    color: Palette.text,
    fontFamily: Fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 1.5,
    marginTop: Space.sm,
    textTransform: 'uppercase',
  },
  message: { color: Palette.text, fontSize: 12, lineHeight: 20, marginTop: Space.lg },
  detail: { color: Palette.textMuted, fontSize: 11, lineHeight: 18, marginTop: Space.sm },
  actions: { gap: Space.md, marginTop: Space.xl },
});
