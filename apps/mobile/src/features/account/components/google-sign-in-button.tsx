import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/shared/components/console-text';
import { Fonts, Radius, Space } from '@/shared/theme';

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onPress: () => void;
}

function GoogleMark() {
  return (
    <Svg accessible={false} height={20} viewBox="0 0 18 18" width={20}>
      <Path d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.614z" fill="#4285F4" />
      <Path d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.585-5.037-3.715H.956v2.333A9 9 0 0 0 9 18z" fill="#34A853" />
      <Path d="M3.963 10.705A5.41 5.41 0 0 1 3.681 9c0-.592.102-1.168.282-1.705V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.333z" fill="#FBBC05" />
      <Path d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.333C4.672 5.165 6.656 3.58 9 3.58z" fill="#EA4335" />
    </Svg>
  );
}

export function GoogleSignInButton({ disabled, onPress }: GoogleSignInButtonProps) {
  return (
    <Pressable
      accessibilityLabel="Sign in with Google"
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}>
      <View style={styles.mark}><GoogleMark /></View>
      <Text variant="label" style={[styles.label, disabled && styles.disabledLabel]}>Sign in with Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#747775',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
  },
  mark: { width: 24, alignItems: 'center', justifyContent: 'center' },
  label: {
    minWidth: 0,
    flexShrink: 1,
    color: '#1F1F1F',
    fontFamily: Fonts.medium,
    textAlign: 'center',
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  pressed: { backgroundColor: '#E9EEF6' },
  disabled: { opacity: 0.5 },
  disabledLabel: { color: '#5F6368' },
});
