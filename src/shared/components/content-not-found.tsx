import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Space } from '@/shared/theme';

export function ContentNotFound({ label = 'Content' }: { label?: string }) {
  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="label" style={styles.eyebrow}>NOT AVAILABLE</Text>
        <Text variant="screenTitle" style={styles.title}>{label} not found</Text>
        <Text variant="body" style={styles.copy}>This activity is unavailable or the link is no longer valid.</Text>
      </View>
      <AppButton label="Back to learning path" onPress={() => router.replace('/learn')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 72 },
  eyebrow: { color: Palette.orange, fontFamily: Fonts.medium },
  title: { color: Palette.text, fontFamily: Fonts.semibold, textTransform: 'uppercase', marginTop: Space.sm, textAlign: 'center' },
  copy: { color: Palette.textMuted, textAlign: 'center', marginTop: Space.md, maxWidth: 380 },
});
