import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountField } from '@/features/account/components/account-field';
import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { goBackOrReplace } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';

export default function RegisterScreen() {
  const { configured, registerEmail } = useAuth();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string>(); const [busy, setBusy] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const submit = async () => {
    if (busy || !configured) return;
    setBusy(true); setMessage(undefined); setVerificationRequired(false);
    const result = await registerEmail(email, password, name);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else if (result.verificationRequired) {
      setVerificationRequired(true);
      setMessage('Verification email sent. Open the link in that email, then return here to sign in.');
    }
    else router.replace('/');
  };
  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to sign in', icon: 'arrow-left', label: 'BACK / SIGN IN', onPress: () => goBackOrReplace(AppRoutes.auth) }} />}>
    <View style={styles.header}><Text variant="label" style={styles.eyebrow}>NEW LEARNER PROFILE</Text><Text variant="screenTitle" style={styles.title}>CREATE ACCOUNT</Text></View>
    {!configured ? <Text accessibilityRole="alert" variant="bodySmall" style={styles.message}>Cloud services are not configured. Return to account options and continue as a guest.</Text> : null}
    <View style={styles.form}>
      <AccountField label="DISPLAY NAME" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Allen" returnKeyType="next" />
      <AccountField label="EMAIL" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="learner@example.com" returnKeyType="next" />
      <AccountField label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" returnKeyType="done" onSubmitEditing={() => { if (name.trim() && email.trim() && password.length >= 8) void submit(); }} />
      <Text variant="technical" style={styles.muted}>Use at least eight characters. Supabase applies the project’s password and rate-limit policies.</Text>
      {message ? <Text accessibilityRole="alert" variant="bodySmall" style={styles.message}>{message}</Text> : null}
      <AppButton disabled={busy || !configured || !name.trim() || !email.trim() || password.length < 8} label={busy ? 'Creating…' : 'Create account'} onPress={() => void submit()} />
      {verificationRequired ? <AppButton label="Return to sign in" variant="secondary" onPress={() => router.replace(AppRoutes.auth)} /> : null}
    </View>
  </Screen>;
}
const styles = StyleSheet.create({
  header: { marginVertical: Space.xl, gap: Space.sm }, eyebrow: { color: Palette.green }, title: { color: Palette.text, fontFamily: Fonts.semibold },
  form: { gap: Space.md, padding: Space.lg, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  muted: { color: Palette.textMuted }, message: { color: Palette.orange },
});
