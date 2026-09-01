import { StyleSheet } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export function ProCheckout() {
  const styles = useThemeStyles(createStyles);
  return (
    <Text variant="bodySmall" style={styles.message}>
      Test checkout is available in the Android app. This preview can display Pro access purchased on mobile.
    </Text>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  message: { color: colors.orange, marginBottom: Space.md },
});
