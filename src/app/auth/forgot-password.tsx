import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/auth-context';
import { AccountField } from '@/features/account/components/account-field';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { goBackOrReplace } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string>();
  const submit = async () => setMessage((await sendPasswordReset(email)) ?? 'If that account exists, a reset message has been sent.');

  return (
    <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to sign in', icon: 'arrow-left', label: 'BACK', onPress: () => goBackOrReplace(AppRoutes.auth) }} />}>
      <View style={styles.header}>
        <Text variant="screenTitle" style={styles.title}>RESET PASSWORD</Text>
        <Text variant="bodySmall">Enter your account email. The reset link returns to NetBite.</Text>
      </View>
      <View style={styles.form}>
        <AccountField label="EMAIL" value={email} onChangeText={setEmail} keyboardType="email-address" />
        {message ? <Text variant="bodySmall" style={styles.message}>{message}</Text> : null}
        <AppButton disabled={!email.trim()} label="Send reset link" onPress={() => void submit()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginVertical: Space.xl, gap: Space.sm },
  title: { color: Palette.text, fontFamily: Fonts.semibold },
  form: { gap: Space.md, padding: Space.lg, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  message: { color: Palette.green },
});
