import { StyleSheet, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { SemanticIcon, type SemanticIconName } from '@/shared/components/semantic-icon';
import { Fonts, Palette, Space, type TypographyRole } from '@/shared/theme';

export type StatusRowState = 'pending' | 'complete' | 'attention' | 'locked' | 'info';

interface StatusRowProps {
  label: string;
  state: StatusRowState;
  value?: string;
  description?: string;
  variant?: TypographyRole;
  showStateLabel?: boolean;
  testID?: string;
}

const statusPresentation: Record<StatusRowState, { icon: SemanticIconName; color: string; label: string }> = {
  pending: { icon: 'status-pending', color: Palette.textMuted, label: 'PENDING' },
  complete: { icon: 'status-complete', color: Palette.green, label: 'COMPLETE' },
  attention: { icon: 'status-attention', color: Palette.orange, label: 'NEEDS ATTENTION' },
  locked: { icon: 'status-locked', color: Palette.textMuted, label: 'LOCKED' },
  info: { icon: 'status-info', color: Palette.text, label: 'INFORMATION' },
};

export function StatusRow({ label, state, value, description, variant = 'technical', showStateLabel = true, testID }: StatusRowProps) {
  const presentation = statusPresentation[state];
  const spokenValue = value ? `, ${value}` : '';
  const spokenDescription = description ? `. ${description}` : '';

  return (
    <View
      accessible
      accessibilityLabel={`${label}${spokenValue}. ${presentation.label}${spokenDescription}`}
      style={styles.row}
      testID={testID}
    >
      <View style={styles.icon}><SemanticIcon color={presentation.color} name={presentation.icon} size={20} /></View>
      <View style={styles.copy}>
        <View style={styles.primaryLine}>
          <Text variant={variant} style={[styles.label, { color: presentation.color }]}>{label}</Text>
          {value ? <Text variant={variant} style={styles.value}>{value}</Text> : null}
          {showStateLabel ? <Text variant="technical" style={[styles.state, { color: presentation.color }]}>{presentation.label}</Text> : null}
        </View>
        {description ? <Text variant="bodySmall" style={styles.description}>{description}</Text> : null}
      </View>
    </View>
  );
}

export function NumberedStepRow({ number, children }: { number: number; children: string }) {
  return (
    <View accessibilityLabel={`Step ${number}. ${children}`} style={styles.step}>
      <View accessible={false} style={styles.number}><Text variant="label" style={styles.numberText}>{number}</Text></View>
      <Text variant="bodySmall" style={styles.stepCopy}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, paddingVertical: Space.xs },
  icon: { width: 20, minHeight: 20, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: Space.xs },
  primaryLine: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs },
  label: { flexShrink: 1, fontFamily: Fonts.medium },
  value: { color: Palette.text, flexShrink: 1 },
  description: { color: Palette.textMuted },
  state: { flexShrink: 0, marginLeft: 'auto', textAlign: 'right' },
  step: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  number: { width: 28, height: 28, flexShrink: 0, borderWidth: 1, borderColor: Palette.orange, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: Palette.orange },
  stepCopy: { flex: 1, minWidth: 0, color: Palette.text },
});
