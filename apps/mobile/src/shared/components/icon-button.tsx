import { Pressable, StyleSheet } from 'react-native';

import { AppIcon, type AppIconName } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { SemanticIcon, type SemanticIconName } from '@/shared/components/semantic-icon';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';

interface IconButtonBaseProps {
  accessibilityHint?: string;
  accessibilityLabel: string;
  busy?: boolean;
  disabled?: boolean;
  iconSize?: number;
  label?: string;
  onPress: () => void;
  selected?: boolean;
}

type IconButtonProps = IconButtonBaseProps & (
  | { icon: AppIconName; semanticIcon?: never }
  | { icon?: never; semanticIcon: SemanticIconName }
);

export function IconButton({ accessibilityHint, accessibilityLabel, busy = false, disabled = false, icon, iconSize, label, onPress, selected = false, semanticIcon }: IconButtonProps) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}>
      {semanticIcon ? <SemanticIcon color={selected ? colors.green : colors.accentBright} name={semanticIcon} size={iconSize ?? 24} /> : <AppIcon name={icon} size={iconSize} />}
      {label ? <Text variant="label" style={[styles.label, selected && styles.selectedLabel]}>{label}</Text> : null}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  base: {
    minWidth: 44,
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 1,
    gap: Space.xs,
    paddingHorizontal: Space.xs,
  },
  label: {
    minWidth: 0,
    flexShrink: 1,
    color: colors.accentBright,
    fontFamily: Fonts.medium,
    textAlign: 'left',
  },
  selected: { borderWidth: 1, borderColor: colors.green, backgroundColor: colors.greenSoft },
  selectedLabel: { color: colors.green },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
