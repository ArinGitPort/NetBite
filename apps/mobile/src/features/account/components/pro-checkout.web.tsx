import { StyleSheet } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Palette, Space } from '@/shared/theme';

export function ProCheckout() {
  return (
    <Text variant="bodySmall" style={styles.message}>
      Test checkout is available in the Android app. This preview can display Pro access purchased on mobile.
    </Text>
  );
}

const styles = StyleSheet.create({
  message: { color: Palette.orange, marginBottom: Space.md },
});
