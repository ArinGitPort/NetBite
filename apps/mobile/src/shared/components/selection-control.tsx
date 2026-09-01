import { Pressable, StyleSheet, View } from 'react-native';

import { SemanticIcon } from '@/shared/components/semantic-icon';
import { Text } from '@/shared/components/console-text';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';

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
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ checked: selected, disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.control, !grow && styles.contentHeight, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}>
      <SemanticIcon color={selected ? colors.green : colors.textMuted} name={selected ? 'status-complete' : 'status-pending'} size={20} />
      <View style={styles.copy}>
        <Text variant="label" style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
        {description ? <Text variant="bodySmall" style={styles.description}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  control: { minWidth: 0, minHeight: 44, flexGrow: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: Space.sm, padding: Space.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  contentHeight: { flexGrow: 0, alignSelf: 'stretch' },
  selected: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  pressed: { borderColor: colors.orange },
  disabled: { opacity: 0.5 },
  copy: { minWidth: 0, flex: 1 },
  label: { color: colors.text, fontFamily: Fonts.medium },
  selectedLabel: { color: colors.green },
  description: { color: colors.textMuted, marginTop: 2 },
});
