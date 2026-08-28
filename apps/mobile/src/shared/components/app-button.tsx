import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, type AppIconName } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';

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
      {loading ? <ActivityIndicator accessibilityLabel="Working" color={Palette.orange} size="small" /> : null}
      {leadingIcon ? <AppIcon name={leadingIcon} size={20} /> : null}
      <Text variant="label" style={[styles.label, variant !== 'primary' && styles.secondaryLabel, variant === 'danger' && styles.dangerLabel, unavailable && styles.disabledLabel]}>{label}</Text>
      {trailingIcon ? <AppIcon name={trailingIcon} size={20} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  primary: { position: 'relative', overflow: 'hidden', backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.accent },
  secondary: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  quiet: { backgroundColor: Palette.accentSoft },
  utility: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Palette.border },
  danger: { backgroundColor: Palette.dangerSoft, borderWidth: 1, borderColor: Palette.danger },
  primarySignal: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: Palette.accent },
  label: { minWidth: 0, flexShrink: 1, color: Palette.accentBright, fontFamily: Fonts.medium, textAlign: 'center', textTransform: 'uppercase' },
  secondaryLabel: { color: Palette.text },
  dangerLabel: { color: Palette.danger },
  pressed: { backgroundColor: Palette.accentSoft },
  focused: { borderColor: Palette.white },
  selected: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  disabled: { opacity: 1, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  disabledLabel: { color: Palette.textMuted },
});
