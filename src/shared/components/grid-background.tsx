import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { Palette } from '@/shared/theme';

export function GridBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.noPointerEvents]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="netbite-grid" patternUnits="userSpaceOnUse" width={24} height={24}>
            <Path d="M 24 0 L 0 0 0 24" fill="none" stroke={Palette.grid} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#netbite-grid)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  noPointerEvents: { pointerEvents: 'none' },
});
