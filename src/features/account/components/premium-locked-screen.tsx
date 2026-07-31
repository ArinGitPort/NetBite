import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { goBackOrReplace } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';

export function PremiumLockedScreen({ label = 'THIS ACTIVITY' }: { label?: string }) {
  const { status } = useAuth();
  return <Screen>
    <View style={styles.panel}>
      <Text variant="label" style={styles.eyebrow}>NETBITE PRO</Text>
      <Text variant="screenTitle" style={styles.title}>{label} IS LOCKED</Text>
      <Text variant="body">Chapters 1–4 are free. A one-time academic test purchase unlocks Chapters 5–12 and the Network Sandbox.</Text>
      <Text variant="technical" style={styles.test}>TEST MODE / NO REAL CHARGE</Text>
      <AppButton label="View NetBite Pro" onPress={() => router.replace(AppRoutes.pro)} />
      {status === 'guest' ? <AppButton label="Sign in" variant="secondary" onPress={() => router.push(AppRoutes.auth)} /> : null}
      <AppButton label="Back" leadingIcon="arrow-left" variant="quiet" onPress={() => goBackOrReplace('/learn')} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  panel: { marginTop: Space.xxl, padding: Space.lg, gap: Space.md, borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.surface },
  eyebrow: { color: Palette.orange },
  title: { color: Palette.text, fontFamily: Fonts.semibold },
  test: { color: Palette.orange },
});
