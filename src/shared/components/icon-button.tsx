import { Pressable, StyleSheet } from 'react-native';

import { AppIcon, type AppIconName } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { SemanticIcon, type SemanticIconName } from '@/shared/components/semantic-icon';
import { Fonts, Palette, Space } from '@/shared/theme';

interface IconButtonBaseProps {
  accessibilityHint?: string;
  accessibilityLabel: string;
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

export function IconButton({ accessibilityHint, accessibilityLabel, disabled = false, icon, iconSize, label, onPress, selected = false, semanticIcon }: IconButtonProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}>
      {semanticIcon ? <SemanticIcon color={selected ? Palette.green : Palette.accentBright} name={semanticIcon} size={iconSize ?? 24} /> : <AppIcon name={icon} size={iconSize} />}
      {label ? <Text variant="label" style={[styles.label, selected && styles.selectedLabel]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    color: Palette.accentBright,
    fontFamily: Fonts.medium,
    textAlign: 'left',
  },
  selected: { borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.greenSoft },
  selectedLabel: { color: Palette.green },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
