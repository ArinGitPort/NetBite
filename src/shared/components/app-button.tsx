import { Pressable, StyleSheet } from 'react-native';

import { AppIcon, type AppIconName } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  leadingIcon?: AppIconName;
  trailingIcon?: AppIconName;
  disabled?: boolean;
}

export function AppButton({ label, onPress, variant = 'primary', leadingIcon, trailingIcon, disabled }: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {leadingIcon ? <AppIcon name={leadingIcon} size={20} /> : null}
      <Text style={[styles.label, variant !== 'primary' && styles.secondaryLabel]}>{label}</Text>
      {trailingIcon ? <AppIcon name={trailingIcon} size={20} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: Radius.md,
    paddingHorizontal: Space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
  },
  primary: { backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.accent },
  secondary: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  quiet: { backgroundColor: Palette.accentSoft },
  label: { color: Palette.accent, fontFamily: Fonts.medium, fontSize: 11, lineHeight: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
  secondaryLabel: { color: Palette.text },
  pressed: { backgroundColor: Palette.accentSoft },
  disabled: { opacity: 0.45 },
});
