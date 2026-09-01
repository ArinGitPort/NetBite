import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { PageHeader } from '@/shared/components/page-header';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { goBackOrReplace } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export function PremiumLockedScreen({ label = 'THIS ACTIVITY' }: { label?: string }) {
  const styles = useThemeStyles(createStyles);
  const { status } = useAuth();
  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to learning path', icon: 'arrow-left', label: 'BACK / LEARN', onPress: () => goBackOrReplace('/learn') }} />}>
    <View style={styles.panel}>
      <Text variant="label" style={styles.eyebrow}>NETBITE PRO</Text>
      <Text variant="screenTitle" style={styles.title}>{label} IS LOCKED</Text>
      <Text variant="body">Guest mode currently includes temporary access to all chapters and the Network Sandbox on this device. A signed-in learner without Pro access can return to guest mode or enable development test access.</Text>
      <Text variant="technical" style={styles.test}>TEST MODE / NO REAL CHARGE</Text>
      <AppButton label="View NetBite Pro" onPress={() => router.replace(AppRoutes.pro)} />
      {status === 'guest' ? <AppButton label="Sign in" variant="secondary" onPress={() => router.push(AppRoutes.auth)} /> : null}
    </View>
  </Screen>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: { marginTop: Space.xxl, padding: Space.lg, gap: Space.md, borderWidth: 1, borderColor: colors.orange, backgroundColor: colors.surface },
  eyebrow: { color: colors.orange },
  title: { color: colors.text, fontFamily: Fonts.semibold },
  test: { color: colors.orange },
});
