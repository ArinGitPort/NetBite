import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

export function AccountField({ label, value, onChangeText, secureTextEntry, keyboardType = 'default', autoCapitalize = 'none', placeholder, onSubmitEditing, returnKeyType }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
  placeholder?: string;
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  returnKeyType?: TextInputProps['returnKeyType'];
}) {
  return <View style={styles.field}>
    <Text variant="label" style={styles.label}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      placeholder={placeholder}
      placeholderTextColor={Palette.textMuted}
      secureTextEntry={secureTextEntry}
      spellCheck={false}
      style={styles.input}
      returnKeyType={returnKeyType}
      value={value}
    />
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: Space.xs },
  label: { color: Palette.textMuted },
  input: { minHeight: 48, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background, color: Palette.text, paddingHorizontal: Space.md, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 22 },
});
