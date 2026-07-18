import { Text as NativeText, StyleSheet, type TextProps } from 'react-native';

import { Fonts, Palette, Typography, type TypographyRole } from '@/shared/theme';

export interface ConsoleTextProps extends TextProps {
  variant?: TypographyRole;
}

export function Text({ style, variant = 'body', ...props }: ConsoleTextProps) {
  return <NativeText {...props} style={[styles.text, Typography[variant], style]} />;
}

const styles = StyleSheet.create({
  text: {
    color: Palette.text,
    fontFamily: Fonts.regular,
  },
});
