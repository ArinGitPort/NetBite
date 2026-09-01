import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, type AppIconName } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { Fonts, Radius, Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'utility' | 'danger';
  leadingIcon?: AppIconName;
  trailingIcon?: AppIconName;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({ label, onPress, variant = 'primary', leadingIcon, trailingIcon, disabled, loading, selected, accessibilityHint, style }: AppButtonProps) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const [focused, setFocused] = useState(false);
  const unavailable = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: Boolean(loading), selected }}
      disabled={unavailable}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        focused && styles.focused,
        selected && styles.selected,
        pressed && styles.pressed,
        unavailable && styles.disabled,
        style,
      ]}>
      {variant === 'primary' ? <View style={styles.primarySignal} /> : null}
      {loading ? <ActivityIndicator accessibilityLabel="Working" color={colors.orange} size="small" /> : null}
      {leadingIcon ? <AppIcon name={leadingIcon} size={20} /> : null}
      <Text variant="label" style={[styles.label, variant !== 'primary' && styles.secondaryLabel, variant === 'danger' && styles.dangerLabel, unavailable && styles.disabledLabel]}>{label}</Text>
      {trailingIcon ? <AppIcon name={trailingIcon} size={20} /> : null}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: Radius.md,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
  },
  primary: { position: 'relative' as const, overflow: 'hidden' as const, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  quiet: { backgroundColor: colors.accentSoft },
  utility: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger },
  primarySignal: { position: 'absolute' as const, left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.accent },
  label: { minWidth: 0, flexShrink: 1, color: colors.accentBright, fontFamily: Fonts.medium, textAlign: 'center' as const, textTransform: 'uppercase' as const },
  secondaryLabel: { color: colors.text },
  dangerLabel: { color: colors.danger },
  pressed: { backgroundColor: colors.accentSoft },
  focused: { borderColor: colors.accentBright },
  selected: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  disabled: { opacity: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  disabledLabel: { color: colors.textMuted },
});
