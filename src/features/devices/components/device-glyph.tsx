import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { DeviceType } from '@/core/network/models';

const deviceImages: Record<DeviceType, number> = {
  pc: require('@/assets/images/devices/device-pc.png'),
  switch: require('@/assets/images/devices/device-switch.png'),
  router: require('@/assets/images/devices/device-router.png'),
};

/**
 * Artwork zoom inside its layout slot. The PNGs contain different amounts of
 * transparent padding, so change these values to tune their visible size.
 */
export const DEVICE_IMAGE_SCALE: Record<DeviceType, number> = {
  pc: 1.65,
  switch: 1.1,
  router: 1.2,
};

interface DeviceGlyphProps {
  type: DeviceType;
  /** Size of the component's layout slot. */
  size?: number;
  /** Optional artwork zoom override for this specific use. */
  imageScale?: number;
}

export function DeviceGlyph({ type, size = 64, imageScale }: DeviceGlyphProps) {
  const scale = imageScale ?? DEVICE_IMAGE_SCALE[type];

  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <Image
        accessibilityIgnoresInvertColors
        contentFit="contain"
        source={deviceImages[type]}
        style={[styles.image, { width: size, height: size, transform: [{ scale }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
    inset: 0,
  },
});
