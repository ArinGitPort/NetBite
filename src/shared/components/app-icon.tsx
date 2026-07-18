import { Image } from 'expo-image';

export type AppIconName = 'arrow-left' | 'arrow-right' | 'check' | 'close' | 'lock' | 'reset';

const iconImages: Record<AppIconName, number> = {
  'arrow-left': require('@/assets/images/icons/icon-arrow-left.png'),
  'arrow-right': require('@/assets/images/icons/icon-arrow-right.png'),
  check: require('@/assets/images/icons/icon-check.png'),
  close: require('@/assets/images/icons/icon-close.png'),
  lock: require('@/assets/images/icons/icon-lock.png'),
  reset: require('@/assets/images/icons/icon-reset.png'),
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
