import type { ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { ProgressBar } from '@/shared/components/progress-bar';
import { SemanticIcon, type SemanticIconName } from '@/shared/components/semantic-icon';
import { Fonts, Palette, Space } from '@/shared/theme';

export type ActionPriority = 'primary' | 'secondary' | 'utility';
export type ActionTone = 'learning' | 'sandbox' | 'neutral' | 'danger';

interface ActionCardProps {
  title: string;
  detail?: string;
  status?: string;
  icon: SemanticIconName;
  priority?: ActionPriority;
  tone?: ActionTone;
  progress?: number;
  badge?: string;
  endIcon?: Extract<AppIconName, 'arrow-right' | 'lock' | 'check'>;
  loading?: boolean;
  disabled?: boolean;
  selected?: boolean;
  completed?: boolean;
  disabledReason?: string;
  accessibilityHint?: string;
  footer?: ReactNode;
  onPress: () => void;
  testID?: string;
}

const toneColor: Record<ActionTone, string> = {
  learning: Palette.accentBright,
  sandbox: Palette.orange,
  neutral: Palette.textMuted,
  danger: Palette.danger,
};

export function ActionCard({ title, detail, status, icon, priority = 'secondary', tone = 'neutral', progress, badge, endIcon = 'arrow-right', loading, disabled, selected, completed, disabledReason, accessibilityHint, footer, onPress, testID }: ActionCardProps) {
  const [focused, setFocused] = useState(false);
  const color = completed ? Palette.green : toneColor[tone];
  const blocked = Boolean(disabled || loading);
  return (
    <View style={[styles.shell, styles[priority], tone === 'danger' && styles.dangerShell, selected && styles.selectedShell, completed && styles.completedShell, focused && styles.focusedShell, blocked && styles.disabledShell]}>
      <View style={[styles.signal, { backgroundColor: color }]} />
      <Pressable
        accessibilityHint={accessibilityHint ?? disabledReason}
        accessibilityLabel={`${title}${status ? `, ${status}` : ''}${selected ? ', selected' : ''}${completed ? ', complete' : ''}${disabledReason ? `, ${disabledReason}` : ''}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: blocked, busy: Boolean(loading), selected }}
        disabled={blocked}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
        <View style={[styles.iconPlate, priority === 'utility' && styles.iconPlateUtility, { borderColor: color }]}>
          <SemanticIcon name={icon} size={priority === 'utility' ? 20 : 26} color={color} />
        </View>
        <View style={styles.copy}>
          <View style={styles.metaRow}>
            {status ? <Text variant="label" style={[styles.status, { color }]}>{status}</Text> : <View />}
            {badge ? <View style={styles.badge}><Text variant="technical" style={styles.badgeText}>{badge}</Text></View> : null}
          </View>
          <Text variant={priority === 'primary' ? 'screenTitle' : 'sectionHeading'} style={styles.title}>{title}</Text>
          {detail ? <Text variant="bodySmall" style={styles.detail}>{detail}</Text> : null}
          {progress !== undefined ? <View style={styles.progress}><ProgressBar progress={progress} /></View> : null}
          {disabledReason ? <Text variant="technical" style={styles.disabledReason}>{disabledReason}</Text> : null}
        </View>
        <View style={styles.end}>{loading ? <ActivityIndicator accessibilityLabel="Loading" color={color} size="small" /> : <AppIcon name={endIcon} size={priority === 'primary' ? 24 : 20} />}</View>
      </Pressable>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  primary: { borderColor: Palette.accent, backgroundColor: Palette.surfaceRaised },
  secondary: { minHeight: 108 },
  utility: { minHeight: 64 },
  dangerShell: { borderColor: Palette.danger, backgroundColor: Palette.dangerSoft },
  selectedShell: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  completedShell: { borderColor: Palette.green },
  focusedShell: { borderColor: Palette.white },
  disabledShell: { opacity: 0.72 },
  signal: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  pressable: { minHeight: 64, padding: Space.lg, paddingLeft: Space.xl, flexDirection: 'row', alignItems: 'center', gap: Space.md },
  pressed: { backgroundColor: Palette.accentSoft },
  iconPlate: { width: 48, height: 48, borderWidth: 1, backgroundColor: Palette.background, alignItems: 'center', justifyContent: 'center' },
  iconPlateUtility: { width: 40, height: 40 },
  copy: { flex: 1, minWidth: 0 },
  metaRow: { minHeight: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  status: { fontFamily: Fonts.medium },
  badge: { borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Space.sm, paddingVertical: 2, backgroundColor: Palette.background },
  badgeText: { color: Palette.textMuted },
  title: { color: Palette.text, fontFamily: Fonts.semibold, textTransform: 'uppercase', marginTop: Space.xs },
  detail: { color: Palette.textMuted, marginTop: Space.xs },
  progress: { marginTop: Space.md },
  disabledReason: { color: Palette.orange, marginTop: Space.xs },
  end: { width: 28, alignItems: 'center', justifyContent: 'center' },
  footer: { borderTopWidth: 1, borderTopColor: Palette.border, padding: Space.md, paddingLeft: Space.xl },
});
