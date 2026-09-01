import type { TextInputProps } from 'react-native';

import { FormField } from '@/shared/components/form-field';

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
  return <FormField
    accessibilityLabel={label}
    autoCapitalize={autoCapitalize}
    autoCorrect={false}
    keyboardType={keyboardType}
    label={label}
    onChangeText={onChangeText}
    onSubmitEditing={onSubmitEditing}
    placeholder={placeholder}
    returnKeyType={returnKeyType}
    secureTextEntry={secureTextEntry}
    spellCheck={false}
    value={value}
  />;
}
