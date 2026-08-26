import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/auth-context';
import { ProCheckout } from '@/features/account/components/pro-checkout';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { goBackOrReplace } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';

export default function ProScreen() {
  const { status, hasPro, hasContentAccess, testProEnabled } = useAuth();
  return (
    <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to previous screen', icon: 'arrow-left', label: 'BACK', onPress: () => goBackOrReplace('/') }} />}>
      <View style={styles.hero}>
        <Text variant="label" style={styles.eyebrow}>ACADEMIC PRO ACCESS TEST</Text>
        <Text variant="screenTitle" style={styles.title}>NETBITE PRO</Text>
        <Text variant="sectionHeading" style={styles.price}>{'\u20B1'}149 / ONE TIME</Text>
        <Text variant="technical" style={styles.test}>TEST MODE / NO REAL CHARGE</Text>
      </View>
      <View style={styles.panel}>
        <Text variant="sectionHeading">INCLUDED</Text>
        <Text variant="body">Network Foundations premium chapters</Text>
        <Text variant="body">Complete Network Operations course</Text>
        <Text variant="body">All advanced mini labs and CLI practices</Text>
        <Text variant="body">Network Sandbox</Text>
        <Text variant="body">Restore Pro access after signing in again</Text>
      </View>
      {testProEnabled ? (
        <View style={styles.testOwned}>
          <Text variant="sectionHeading" style={styles.test}>DEVELOPMENT TEST ACCESS</Text>
          <Text variant="bodySmall">All chapters, Network Operations modules, the Integrated Network Operations Lab, and Network Sandbox are unlocked for testing on this device. No purchase or permanent Pro access was created.</Text>
        </View>
      ) : hasPro ? (
        <View style={styles.owned}>
          <Text variant="sectionHeading" style={styles.green}>PRO ACTIVE</Text>
          <Text variant="bodySmall">Advanced learning and the Network Sandbox are unlocked for this account.</Text>
        </View>
      ) : status === 'guest' && hasContentAccess ? (
        <View style={styles.guestAccess}>
          <Text variant="sectionHeading" style={styles.green}>GUEST ACCESS ACTIVE</Text>
          <Text variant="bodySmall">All chapters and the Network Sandbox are enabled locally for guest mode. This temporary access is not a purchase and does not sync between devices.</Text>
        </View>
      ) : status !== 'authenticated' ? (
        <>
          <Text variant="bodySmall" style={styles.message}>Sign in before purchasing so NetBite can restore your Pro access later.</Text>
          <AppButton label="Sign in or register" onPress={() => router.push(AppRoutes.auth)} />
        </>
      ) : <ProCheckout />}
      <Text variant="technical" style={styles.boundary}>ACADEMIC DEMONSTRATION / NOT PRODUCTION APP-STORE BILLING</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: Space.xxl, gap: Space.sm },
  eyebrow: { color: Palette.orange, textAlign: 'center' },
  title: { color: Palette.text, fontFamily: Fonts.semibold },
  price: { color: Palette.orange },
  test: { color: Palette.orange },
  panel: { padding: Space.lg, gap: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, marginBottom: Space.lg },
  owned: { padding: Space.lg, gap: Space.sm, borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.surface, marginBottom: Space.lg },
  testOwned: { padding: Space.lg, gap: Space.sm, borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.surface, marginBottom: Space.lg },
  guestAccess: { padding: Space.lg, gap: Space.sm, borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.surface, marginBottom: Space.lg },
  green: { color: Palette.green },
  message: { color: Palette.orange, marginBottom: Space.md },
  boundary: { color: Palette.textMuted, textAlign: 'center', marginTop: Space.xl },
});
