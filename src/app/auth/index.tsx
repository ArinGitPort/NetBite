import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountField } from '@/features/account/components/account-field';
import { GoogleSignInButton } from '@/features/account/components/google-sign-in-button';
import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { goBackOrReplace } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';

export default function SignInScreen() {
  const { configured, signInEmail, signInGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<string | undefined>) => {
    if (busy) return;
    setBusy(true); setMessage(undefined);
    const next = await action();
    setBusy(false);
    if (next) setMessage(next); else router.replace('/');
  };
  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to account options', icon: 'arrow-left', label: 'BACK', onPress: () => goBackOrReplace(AppRoutes.authWelcome) }} />}>
    <View style={styles.header}><Text variant="label" style={styles.eyebrow}>RETURNING LEARNER</Text><Text variant="screenTitle" style={styles.title}>SIGN IN</Text><Text variant="bodySmall">Back up progress, use it across devices, and restore account access.</Text></View>
    {!configured ? <Text variant="bodySmall" style={styles.warning}>Cloud services are not configured yet. Guest learning remains available.</Text> : null}
    <View style={styles.form}>
      <AccountField label="EMAIL" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="learner@example.com" returnKeyType="next" />
      <AccountField label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="done" onSubmitEditing={() => { if (configured && email.trim() && password) void run(() => signInEmail(email, password)); }} />
      {message ? <Text accessibilityRole="alert" variant="bodySmall" style={styles.warning}>{message}</Text> : null}
      <AppButton disabled={busy || !configured || !email.trim() || !password} label={busy ? 'Signing in…' : 'Sign in'} onPress={() => void run(() => signInEmail(email, password))} />
      <GoogleSignInButton disabled={busy || !configured} onPress={() => void run(signInGoogle)} />
      <AppButton disabled={busy || !configured} label="Create account" variant="quiet" onPress={() => router.push(AppRoutes.authRegister)} />
      <AppButton disabled={busy || !configured} label="Forgot password" variant="quiet" onPress={() => router.push(AppRoutes.authForgotPassword)} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  header: { marginVertical: Space.xl, gap: Space.sm }, eyebrow: { color: Palette.green }, title: { color: Palette.text, fontFamily: Fonts.semibold },
  form: { gap: Space.md, padding: Space.lg, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  warning: { color: Palette.orange },
});
