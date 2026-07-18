import { Modal, StyleSheet, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/shared/components/app-icon';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { IconButton } from '@/shared/components/icon-button';
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
        <View accessibilityLiveRegion="assertive" accessibilityRole="alert" accessibilityViewIsModal style={[styles.panel, toneStyle]}>
          <View style={styles.header}>
            {icon ? <AppIcon name={icon} size={24} /> : <View />}
            <IconButton
              accessibilityLabel="Close dialog"
              icon="close"
              iconSize={20}
              onPress={onRequestClose}
            />
          </View>
          <Text variant="label" style={[styles.eyebrow, tone === 'success' && styles.successText, tone === 'warning' && styles.warningText]}>{eyebrow}</Text>
          <Text variant="screenTitle" style={styles.title}>{title}</Text>
          <Text variant="body" style={styles.message}>{message}</Text>
          {detail ? <Text variant="bodySmall" style={styles.detail}>{detail}</Text> : null}
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
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: Palette.textMuted,
    fontFamily: Fonts.medium,
    marginTop: Space.md,
  },
  warningText: { color: Palette.orange },
  successText: { color: Palette.green },
  title: {
    color: Palette.text,
    fontFamily: Fonts.semibold,
    marginTop: Space.sm,
    textTransform: 'uppercase',
  },
  message: { color: Palette.text, marginTop: Space.lg },
  detail: { color: Palette.textMuted, marginTop: Space.sm },
  actions: { gap: Space.md, marginTop: Space.xl },
});
