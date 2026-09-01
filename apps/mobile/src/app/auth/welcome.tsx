import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export default function AccountWelcomeScreen() {
  const styles = useThemeStyles(createStyles);
  const { status, configured, completeGuestEntry } = useAuth();

  const continueAsGuest = () => {
    completeGuestEntry();
    router.replace('/');
  };

  if (status === 'authenticated') {
    return <Redirect href="/" />;
  }

  return (
    <Screen>
      <View style={styles.brandBlock}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('@netbite/brand/logo.png')}
          style={styles.logo}
          testID="account-welcome-logo"
        />
        <Text variant="screenTitle" style={styles.brand}>NETBITE</Text>
        <Text variant="technical" style={styles.system}>LEARN LOCALLY / SYNC WHEN READY</Text>
      </View>

      <View style={styles.intro}>
        <Text variant="label" style={styles.eyebrow}>LEARNER ACCESS</Text>
        <Text variant="sectionHeading" style={styles.heading}>HOW DO YOU WANT TO START?</Text>
        <Text variant="body" style={styles.copy}>
          Use an account to back up learning progress across devices, or continue locally without signing in.
        </Text>
      </View>

      {!configured ? (
        <View accessibilityRole="alert" style={styles.warningPanel}>
          <Text variant="label" style={styles.warningTitle}>CLOUD SERVICES OFFLINE</Text>
          <Text variant="bodySmall" style={styles.warningCopy}>
            Sign in and registration are unavailable in this build. Guest learning remains available.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          disabled={!configured}
          label="Sign in"
          onPress={() => router.push(AppRoutes.auth)}
          trailingIcon="arrow-right"
        />
        <AppButton
          disabled={!configured}
          label="Create account"
          onPress={() => router.push(AppRoutes.authRegister)}
          variant="secondary"
        />
        <AppButton label="Continue as guest" onPress={continueAsGuest} variant="quiet" />
      </View>

      <View style={styles.guestNote}>
        <Text variant="technical" style={styles.guestCopy}>
          GUEST PROGRESS STAYS ON THIS DEVICE. YOU CAN SIGN IN LATER FROM THE MAIN MENU.
        </Text>
      </View>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  brandBlock: { alignItems: 'center', paddingTop: Space.xxl, paddingBottom: Space.xl },
  logo: { width: 88, height: 88, marginBottom: Space.md },
  brand: { color: colors.text, fontFamily: Fonts.semibold },
  system: { color: colors.textMuted, marginTop: Space.sm, textAlign: 'center' },
  intro: { gap: Space.sm, paddingVertical: Space.xl, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  eyebrow: { color: colors.orange },
  heading: { color: colors.text, fontFamily: Fonts.semibold },
  copy: { color: colors.textMuted },
  warningPanel: { gap: Space.xs, marginTop: Space.lg, padding: Space.lg, borderWidth: 1, borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  warningTitle: { color: colors.orange },
  warningCopy: { color: colors.text },
  actions: { gap: Space.md, marginTop: Space.xl },
  guestNote: { marginTop: Space.xl, paddingTop: Space.lg, borderTopWidth: 1, borderColor: colors.border },
  guestCopy: { color: colors.textMuted, textAlign: 'center' },
});
