import { StyleSheet } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Palette, Space } from '@/shared/theme';

export function ProCheckout() {
  return (
    <Text variant="bodySmall" style={styles.message}>
      Test checkout is available in the Android or iOS app. Web preview can display an entitlement purchased on mobile.
    </Text>
  );
}

const styles = StyleSheet.create({
  message: { color: Palette.orange, marginBottom: Space.md },
});
