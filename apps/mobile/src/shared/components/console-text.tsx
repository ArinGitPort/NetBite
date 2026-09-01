import { Text as NativeText, StyleSheet, type TextProps } from 'react-native';

import { Fonts, Typography, type ThemeColors, type TypographyRole } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export interface ConsoleTextProps extends TextProps {
  variant?: TypographyRole;
}

export function Text({ style, variant = 'body', ...props }: ConsoleTextProps) {
  const styles = useThemeStyles(createStyles);
  return <NativeText {...props} style={[styles.text, Typography[variant], style]} />;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  text: {
    color: colors.text,
    fontFamily: Fonts.regular,
  },
});
