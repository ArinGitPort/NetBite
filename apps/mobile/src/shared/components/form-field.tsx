import { StyleSheet, TextInput, type StyleProp, type TextInputProps, type TextStyle, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Fonts, Space, Typography, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';

export interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  help?: string;
  error?: string;
  inputStyle?: StyleProp<TextStyle>;
}

export function FormField({ label, help, error, inputStyle, placeholderTextColor, ...inputProps }: FormFieldProps) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.field}>
      <Text variant="technical" style={styles.label}>{label}</Text>
      {help ? <Text variant="bodySmall" style={styles.help}>{help}</Text> : null}
      <TextInput
        {...inputProps}
        accessibilityHint={inputProps.accessibilityHint ?? help}
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
        placeholderTextColor={placeholderTextColor ?? colors.textMuted}
        selectionColor={colors.orange}
        style={[styles.input, inputStyle, error && styles.inputError]}
      />
      {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" variant="bodySmall" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  field: { minWidth: 0, gap: Space.xs },
  label: { color: colors.text, fontFamily: Fonts.medium },
  help: { color: colors.textMuted },
  input: { minWidth: 0, minHeight: 48, borderWidth: 1, borderColor: colors.border, color: colors.text, fontFamily: Fonts.regular, paddingHorizontal: Space.md, paddingVertical: Space.sm, ...Typography.body },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger },
});
