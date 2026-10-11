import { Text } from '@/shared/components/console-text';
import { SemanticIcon,type SemanticIconName } from '@/shared/components/semantic-icon';
import { useTheme,useThemeStyles } from '@/shared/theme-context';
import { Pressable } from 'react-native';
import { createStyles } from './sandbox-screen-styles';

export function Option({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const styles = useThemeStyles(createStyles);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: Boolean(selected) }} onPress={onPress} style={[styles.option, selected && styles.optionActive]}>
      <Text variant="technical" style={[styles.optionText, selected && styles.optionTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ToolButton({ label, icon, selected, onPress }: { label: string; icon: SemanticIconName; selected: boolean; onPress: () => void }) {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  return (
    <Pressable accessibilityHint={`Shows ${label.toLowerCase()} controls`} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.toolButton, selected && styles.toolButtonActive]}>
      <SemanticIcon color={selected ? colors.accentBright : colors.textMuted} name={icon} size={20} />
      <Text variant="label" style={[styles.toolButtonText, selected && styles.toolButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

