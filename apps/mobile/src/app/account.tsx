import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { goBackOrReplace } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { getSyncStatusLabel } from '@/shared/learner-facing-copy';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export default function AccountScreen() {
  const styles = useThemeStyles(createStyles);
  const { status, user, profile, hasPro, testProEnabled, syncStatus, error, signOut, deleteAccount, syncNow } = useAuth();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  if (status !== 'authenticated') {
    return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to main menu', icon: 'arrow-left', label: 'BACK / MENU', onPress: () => goBackOrReplace('/') }} />}><Text variant="screenTitle" style={styles.title}>GUEST PROFILE</Text><Text variant="body">Sign in to back up progress and restore purchases.</Text><AppButton label="Sign in or register" onPress={() => router.replace(AppRoutes.auth)} /></Screen>;
  }
  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to main menu', icon: 'arrow-left', label: 'BACK / MENU', onPress: () => goBackOrReplace('/') }} />}>
    <View style={styles.header}><Text variant="label" style={styles.eyebrow}>LEARNER ACCOUNT</Text><Text variant="screenTitle" style={styles.title}>{profile?.displayName?.toUpperCase() || 'NETBITE LEARNER'}</Text><Text variant="bodySmall" style={styles.muted}>{user?.email}</Text><Text variant="technical" style={user?.email_confirmed_at ? styles.green : styles.warning}>{user?.email_confirmed_at ? 'EMAIL VERIFIED' : 'EMAIL VERIFICATION PENDING'}</Text></View>
    <View style={styles.panel}><Text variant="sectionHeading">ONLINE BACKUP</Text><Text variant="label" style={syncStatus === 'action-needed' ? styles.warning : styles.green}>{getSyncStatusLabel(syncStatus)}</Text>{error ? <Text variant="bodySmall" style={styles.warning}>{error}</Text> : null}<AppButton label={syncStatus === 'action-needed' ? 'Try backup again' : 'Back up now'} variant="secondary" onPress={() => void syncNow()} /></View>
    <View style={styles.panel}><Text variant="sectionHeading">NETBITE PRO</Text><Text variant="bodySmall">{testProEnabled ? 'DEVELOPMENT TEST ACCESS / All courses and tools unlocked locally; not purchased or synced.' : hasPro ? 'ACTIVE / Premium courses and Network Sandbox unlocked.' : 'NOT ACTIVE / View the academic test checkout.'}</Text><AppButton label={hasPro || testProEnabled ? 'View access details' : 'View NetBite Pro'} onPress={() => router.push(AppRoutes.pro)} /></View>
    <View style={styles.actions}><AppButton label="Sign out" variant="secondary" onPress={() => void signOut().then(() => router.replace(AppRoutes.authWelcome))} /><AppButton label="Delete account" variant="quiet" onPress={() => setDeleteVisible(true)} /></View>
    {deleteError ? <Text variant="bodySmall" style={styles.warning}>{deleteError}</Text> : null}
    <FeedbackModal visible={deleteVisible} tone="warning" eyebrow="PERMANENT ACTION" title="Delete this account?" message="Your online learning backup, profile, and Pro access record will be removed. Test-payment records may remain with the payment provider." detail="Guest progress saved separately on this device will not be deleted." icon="reset" onRequestClose={() => setDeleteVisible(false)} secondaryAction={{ label: 'Keep account', variant: 'secondary', onPress: () => setDeleteVisible(false) }} primaryAction={{ label: 'Delete account', variant: 'danger', onPress: () => void deleteAccount().then((nextError) => { if (nextError) { setDeleteError(nextError); setDeleteVisible(false); } else router.replace(AppRoutes.authWelcome); }) }} />
  </Screen>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: { marginVertical: Space.xl, gap: Space.xs }, eyebrow: { color: colors.green }, title: { color: colors.text, fontFamily: Fonts.semibold }, muted: { color: colors.textMuted },
  panel: { padding: Space.lg, gap: Space.sm, marginBottom: Space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  actions: { gap: Space.md }, green: { color: colors.green }, warning: { color: colors.orange },
});
