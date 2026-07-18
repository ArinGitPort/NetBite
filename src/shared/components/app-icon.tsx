import { Image } from 'expo-image';

export type AppIconName = 'arrow-left' | 'arrow-right' | 'check' | 'close' | 'lock' | 'reset';

const iconImages: Record<AppIconName, number> = {
  'arrow-left': require('@/assets/images/icons/icon-arrow-left-mobile.png'),
  'arrow-right': require('@/assets/images/icons/icon-arrow-right-mobile.png'),
  check: require('@/assets/images/icons/icon-check-mobile.png'),
  close: require('@/assets/images/icons/icon-close-mobile.png'),
  lock: require('@/assets/images/icons/icon-lock-mobile.png'),
  reset: require('@/assets/images/icons/icon-reset-mobile.png'),
};

interface AppIconProps {
  name: AppIconName;
  size?: number;
}

export function AppIcon({ name, size = 32 }: AppIconProps) {
  return (
    <Image
      accessible={false}
      accessibilityIgnoresInvertColors
      contentFit="contain"
      source={iconImages[name]}
      style={{ width: size, height: size }}
    />
  );
}
