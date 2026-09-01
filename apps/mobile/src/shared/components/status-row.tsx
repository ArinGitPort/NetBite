import { StyleSheet, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { SemanticIcon, type SemanticIconName } from '@/shared/components/semantic-icon';
import { Fonts, Space, type ThemeColors, type TypographyRole } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';

export type StatusRowState = 'pending' | 'complete' | 'attention' | 'locked' | 'info';

interface StatusRowProps {
  label: string;
  state: StatusRowState;
  value?: string;
  description?: string;
  variant?: TypographyRole;
  showStateLabel?: boolean;
  stateLabel?: string;
  testID?: string;
}

export function StatusRow({ label, state, value, description, variant = 'technical', showStateLabel = true, stateLabel, testID }: StatusRowProps) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const statusPresentation: Record<StatusRowState, { icon: SemanticIconName; color: string; label: string }> = {
    pending: { icon: 'status-pending', color: colors.textMuted, label: 'PENDING' },
    complete: { icon: 'status-complete', color: colors.green, label: 'COMPLETE' },
    attention: { icon: 'status-attention', color: colors.orange, label: 'NEEDS ATTENTION' },
    locked: { icon: 'status-locked', color: colors.textMuted, label: 'LOCKED' },
    info: { icon: 'status-info', color: colors.text, label: 'INFORMATION' },
  };
  const presentation = statusPresentation[state];
  const displayedState = stateLabel ?? presentation.label;
  const spokenValue = value ? `, ${value}` : '';
  const spokenDescription = description ? `. ${description}` : '';

  return (
    <View
      accessible
      accessibilityLabel={`${label}${spokenValue}. ${displayedState}${spokenDescription}`}
      style={styles.row}
      testID={testID}
    >
      <View style={styles.icon}><SemanticIcon color={presentation.color} name={presentation.icon} size={20} /></View>
      <View style={styles.copy}>
        <View style={styles.primaryLine}>
          <Text variant={variant} style={[styles.label, { color: presentation.color }]}>{label}</Text>
          {value ? <Text variant={variant} style={styles.value}>{value}</Text> : null}
          {showStateLabel ? <Text variant="technical" style={[styles.state, { color: presentation.color }]}>{displayedState}</Text> : null}
        </View>
        {description ? <Text variant="bodySmall" style={styles.description}>{description}</Text> : null}
      </View>
    </View>
  );
}

export function NumberedStepRow({ number, children }: { number: number; children: string }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View accessibilityLabel={`Step ${number}. ${children}`} style={styles.step}>
      <View accessible={false} style={styles.number}><Text variant="label" style={styles.numberText}>{number}</Text></View>
      <Text variant="bodySmall" style={styles.stepCopy}>{children}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, paddingVertical: Space.xs },
  icon: { width: 20, minHeight: 20, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: Space.xs },
  primaryLine: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs },
  label: { flexShrink: 1, fontFamily: Fonts.medium },
  value: { color: colors.text, flexShrink: 1 },
  description: { color: colors.textMuted },
  state: { flexShrink: 0, marginLeft: 'auto', textAlign: 'right' },
  step: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  number: { width: 28, height: 28, flexShrink: 0, borderWidth: 1, borderColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: colors.orange },
  stepCopy: { flex: 1, minWidth: 0, color: colors.text },
});
