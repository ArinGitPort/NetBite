import { Pressable, StyleSheet } from 'react-native';

import { AppIcon, type AppIconName } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

interface IconButtonProps {
  accessibilityLabel: string;
  icon: AppIconName;
  iconSize?: number;
  label?: string;
  onPress: () => void;
}

export function IconButton({ accessibilityLabel, icon, iconSize, label, onPress }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}>
      <AppIcon name={icon} size={iconSize} />
      {label ? <Text variant="label" style={styles.label}>{label}</Text> : null}
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
    flexShrink: 1,
    gap: Space.xs,
  },
  label: {
    minWidth: 0,
    flexShrink: 1,
    color: Palette.accentBright,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  pressed: { opacity: 0.7 },
});
