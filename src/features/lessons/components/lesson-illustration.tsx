import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { Lesson } from '@/content/chapter-one';
import { DEVICE_IMAGE_SCALE, DeviceGlyph } from '@/features/devices/components/device-glyph';
import { Text } from '@/shared/components/console-text';
import { Palette, Radius, Space } from '@/shared/theme';

export function LessonIllustration({ type }: { type: Lesson['illustration'] }) {
  const [cardWidth, setCardWidth] = useState(0);
  const contentWidth = Math.max(0, cardWidth - Space.xl * 2);

  const onCardLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setCardWidth((currentWidth) => currentWidth === nextWidth ? currentWidth : nextWidth);
  };

  const fitScale = (naturalArtworkWidth: number) => {
    if (contentWidth === 0) return 0.5;
    const usableWidth = contentWidth * 0.88;
    return Math.max(0.3, Math.min(1, usableWidth / naturalArtworkWidth));
  };

  if (type === 'devices') {
    const comparisonBaseSize = 96;
    const comparisonNaturalWidth = comparisonBaseSize * (
      DEVICE_IMAGE_SCALE.pc + DEVICE_IMAGE_SCALE.switch + DEVICE_IMAGE_SCALE.router
    );
    const comparisonSize = comparisonBaseSize * fitScale(comparisonNaturalWidth);
    return (
      <View onLayout={onCardLayout} style={styles.card}>
        <View style={styles.deviceRow}>
          {(['pc', 'switch', 'router'] as const).map((device) => (
            <View key={device} style={styles.deviceItem}>
              <DeviceGlyph type={device} size={comparisonSize} />
              <Text style={styles.deviceLabel}>{device === 'pc' ? 'PC' : `${device[0].toUpperCase()}${device.slice(1)}`}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const middleDevice = type === 'purpose' ? 'router' : 'switch';
  const pcBaseSize = 128;
  const middleBaseSize = 152;
  const diagramNaturalWidth =
    pcBaseSize * DEVICE_IMAGE_SCALE.pc * 2 +
    middleBaseSize * DEVICE_IMAGE_SCALE[middleDevice];
  const diagramScale = fitScale(diagramNaturalWidth);
  const pcSize = pcBaseSize * diagramScale;
  const middleSize = middleBaseSize * diagramScale;

  return (
    <View onLayout={onCardLayout} style={styles.card}>
      <View style={styles.networkDiagram}>
        <View
          style={[
            styles.cable,
            { left: '16.666%', right: '16.666%', top: middleSize / 2 },
          ]}
        />
        <View style={styles.networkDevice}>
          <View style={[styles.imageStage, { height: middleSize }]}>
            <DeviceGlyph type="pc" size={pcSize} />
          </View>
          <Text style={styles.deviceLabel}>PC</Text>
        </View>
        <View style={styles.networkDevice}>
          <View style={[styles.imageStage, { height: middleSize }]}>
            <DeviceGlyph
              type={middleDevice}
              size={middleSize}
            />
          </View>
          <Text style={styles.deviceLabel}>{middleDevice}</Text>
        </View>
        <View style={styles.networkDevice}>
          <View style={[styles.imageStage, { height: middleSize }]}>
            <DeviceGlyph type="pc" size={pcSize} />
          </View>
          <Text style={styles.deviceLabel}>PC</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 160, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Space.xl, backgroundColor: Palette.surface, justifyContent: 'center', gap: Space.xl },
  networkDiagram: { position: 'relative', flexDirection: 'row', alignItems: 'flex-start' },
  cable: { position: 'absolute', height: 2, backgroundColor: Palette.accent },
  networkDevice: { flex: 1, zIndex: 1, alignItems: 'center' },
  imageStage: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  deviceRow: { flexDirection: 'row', justifyContent: 'space-around', gap: Space.md },
  deviceItem: { alignItems: 'center', gap: Space.sm },
  deviceLabel: { color: Palette.text, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
});
