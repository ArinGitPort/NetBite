import { Pressable, StyleSheet } from 'react-native';

import { AppIcon, type AppIconName } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

interface IconButtonProps {
  accessibilityLabel: string;
  icon: AppIconName;
  label?: string;
  onPress: () => void;
}

export function IconButton({ accessibilityLabel, icon, label, onPress }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}>
      <AppIcon name={icon} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 44,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.xs,
  },
  label: {
    color: Palette.accentBright,
    fontFamily: Fonts.medium,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  pressed: { opacity: 0.7 },
});
