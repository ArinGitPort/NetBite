import { Pressable, StyleSheet, View } from 'react-native';

import { SemanticIcon } from '@/shared/components/semantic-icon';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

interface SelectionControlProps {
  label: string;
  description?: string;
  selected: boolean;
  disabled?: boolean;
  /** Keep false when the control sits in a vertical form field. */
  grow?: boolean;
  onPress: () => void;
  accessibilityRole?: 'radio' | 'checkbox' | 'switch';
}

export function SelectionControl({ label, description, selected, disabled = false, grow = true, onPress, accessibilityRole = 'radio' }: SelectionControlProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ checked: selected, disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.control, !grow && styles.contentHeight, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}>
      <SemanticIcon color={selected ? Palette.green : Palette.textMuted} name={selected ? 'status-complete' : 'status-pending'} size={20} />
      <View style={styles.copy}>
        <Text variant="label" style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
        {description ? <Text variant="bodySmall" style={styles.description}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: { minWidth: 0, minHeight: 44, flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  contentHeight: { flexGrow: 0, alignSelf: 'stretch' },
  selected: { borderColor: Palette.green, backgroundColor: Palette.greenSoft },
  pressed: { borderColor: Palette.orange },
  disabled: { opacity: 0.5 },
  copy: { minWidth: 0, flex: 1 },
  label: { color: Palette.text, fontFamily: Fonts.medium },
  selectedLabel: { color: Palette.green },
  description: { color: Palette.textMuted, marginTop: 2 },
});
