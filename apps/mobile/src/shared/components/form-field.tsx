import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space, Typography } from '@/shared/theme';

export interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  help?: string;
  error?: string;
}

export function FormField({ label, help, error, placeholderTextColor = Palette.textMuted, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text variant="technical" style={styles.label}>{label}</Text>
      {help ? <Text variant="bodySmall" style={styles.help}>{help}</Text> : null}
      <TextInput
        {...inputProps}
        accessibilityHint={inputProps.accessibilityHint ?? help}
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
        placeholderTextColor={placeholderTextColor}
        selectionColor={Palette.orange}
        style={[styles.input, error && styles.inputError]}
      />
      {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" variant="bodySmall" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minWidth: 0, gap: Space.xs },
  label: { color: Palette.text, fontFamily: Fonts.medium },
  help: { color: Palette.textMuted },
  input: { minWidth: 0, minHeight: 48, borderWidth: 1, borderColor: Palette.border, color: Palette.text, fontFamily: Fonts.regular, paddingHorizontal: Space.md, paddingVertical: Space.sm, ...Typography.body },
  inputError: { borderColor: Palette.danger },
  error: { color: Palette.danger },
});
