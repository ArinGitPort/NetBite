import { Text as NativeText, StyleSheet, type TextProps } from 'react-native';

import { Fonts, Palette } from '@/shared/theme';

export function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[styles.text, style]} />;
}

const styles = StyleSheet.create({
  text: {
    color: Palette.text,
    fontFamily: Fonts.regular,
  },
});
