import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AccountField } from "@/features/account/components/account-field";
import { useAuth } from "@/features/account/auth-context";
import { AppButton } from "@/shared/components/app-button";
import { PageHeader } from "@/shared/components/page-header";
import { Text } from "@/shared/components/console-text";
import { Screen } from "@/shared/components/screen";
import { goBackOrReplace } from "@/shared/navigation";
import { AppRoutes } from "@/shared/routes";
import { Fonts, Palette, Space } from "@/shared/theme";

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();
  const submit = async () => {
    const error = await updatePassword(password);
    if (error) setMessage(error);
    else {
      setMessage("Password updated.");
      setTimeout(() => router.replace(AppRoutes.account), 500);
    }
  };
  return (
    <Screen
      header={
        <PageHeader
          leading={{ accessibilityLabel: 'Back to sign in', icon: 'arrow-left', label: 'BACK / SIGN IN', onPress: () => goBackOrReplace(AppRoutes.auth) }}
        />
      }>
      <View style={styles.header}>
        <Text variant="screenTitle" style={styles.title}>
          CHOOSE NEW PASSWORD
        </Text>
      </View>
      <View style={styles.form}>
        <AccountField
          label="NEW PASSWORD"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {message ? (
          <Text variant="bodySmall" style={styles.message}>
            {message}
          </Text>
        ) : null}
        <AppButton
          disabled={password.length < 8}
          label="Update password"
          onPress={() => void submit()}
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: { marginVertical: Space.xl },
  title: { color: Palette.text, fontFamily: Fonts.semibold },
  form: {
    gap: Space.md,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  message: { color: Palette.orange },
});
