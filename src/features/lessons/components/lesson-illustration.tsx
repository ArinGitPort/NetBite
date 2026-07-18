import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { LessonIllustration as LessonIllustrationType } from '@/content/types';
import { DEVICE_IMAGE_SCALE, DeviceGlyph } from '@/features/devices/components/device-glyph';
import { SwitchingLessonIllustration } from '@/features/switching/components/switching-lesson-illustration';
import { AdvancedLessonIllustration, isAdvancedIllustration } from '@/features/lessons/components/advanced-lesson-illustration';
import { Text } from '@/shared/components/console-text';
import { Palette, Radius, Space } from '@/shared/theme';

export function LessonIllustration({ type }: { type: LessonIllustrationType }) {
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

  if (isAdvancedIllustration(type)) return <AdvancedLessonIllustration type={type} />;

  if (type === 'mac-address' || type === 'mac-learning' || type === 'switch-forwarding' || type === 'broadcast') {
    return <SwitchingLessonIllustration type={type} />;
  }

  if (type === 'frame') {
    return (
      <View style={styles.card}>
        <View style={styles.frameDiagram}>
          <View style={[styles.frameField, styles.frameAddress]}><Text variant="technical" style={styles.frameFieldLabel}>DEST</Text></View>
          <View style={[styles.frameField, styles.frameAddress]}><Text variant="technical" style={styles.frameFieldLabel}>SOURCE</Text></View>
          <View style={[styles.frameField, styles.frameData]}><Text variant="technical" style={styles.frameFieldLabel}>DATA</Text></View>
          <View style={[styles.frameField, styles.frameCheck]}><Text variant="technical" style={styles.frameFieldLabel}>CHECK</Text></View>
        </View>
        <Text variant="technical" style={styles.diagramCaption}>ETHERNET FRAME</Text>
      </View>
    );
  }

  if (type === 'nic') {
    return (
      <View style={styles.card}>
        <Image
          accessible
          accessibilityLabel="An Ethernet network interface controller with an RJ45 port"
          contentFit="contain"
          source={require('@/assets/images/ethernet/ethernet-nic-mobile.png')}
          style={styles.ethernetAsset}
        />
        <Text variant="technical" style={styles.diagramCaption}>DEVICE → NIC → ETHERNET LINK</Text>
      </View>
    );
  }

  if (type === 'cables') {
    return (
      <View style={styles.card}>
        <View style={styles.mediaRow}>
          <View style={styles.mediaItem}>
            <Image
              accessible
              accessibilityLabel="A copper Ethernet patch cable with RJ45 connectors"
              contentFit="contain"
              source={require('@/assets/images/ethernet/ethernet-copper-cable-mobile.png')}
              style={styles.mediaImage}
            />
            <Text variant="label" style={styles.deviceLabel}>TWISTED-PAIR COPPER</Text>
            <Text variant="technical" style={styles.mediaSignal}>ELECTRICAL SIGNAL</Text>
          </View>
          <View style={styles.mediaItem}>
            <Image
              accessible
              accessibilityLabel="A duplex fiber-optic Ethernet cable"
              contentFit="contain"
              source={require('@/assets/images/ethernet/ethernet-fiber-cable-mobile.png')}
              style={styles.mediaImage}
            />
            <Text variant="label" style={styles.deviceLabel}>FIBER-OPTIC</Text>
            <Text variant="technical" style={styles.mediaSignal}>LIGHT SIGNAL</Text>
          </View>
        </View>
      </View>
    );
  }

  if (type === 'ports') {
    return (
      <View style={styles.card}>
        <Image
          accessible
          accessibilityLabel="A four-port Ethernet module with link and activity indicators"
          contentFit="contain"
          source={require('@/assets/images/ethernet/ethernet-port-bank-mobile.png')}
          style={styles.ethernetAsset}
        />
        <Text variant="technical" style={styles.diagramCaption}>LINK ON / ACTIVITY BLINKS</Text>
      </View>
    );
  }

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
              <Text variant="label" style={styles.deviceLabel}>{device === 'pc' ? 'PC' : `${device[0].toUpperCase()}${device.slice(1)}`}</Text>
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
          <Text variant="label" style={styles.deviceLabel}>PC</Text>
        </View>
        <View style={styles.networkDevice}>
          <View style={[styles.imageStage, { height: middleSize }]}>
            <DeviceGlyph
              type={middleDevice}
              size={middleSize}
            />
          </View>
          <Text variant="label" style={styles.deviceLabel}>{middleDevice}</Text>
        </View>
        <View style={styles.networkDevice}>
          <View style={[styles.imageStage, { height: middleSize }]}>
            <DeviceGlyph type="pc" size={pcSize} />
          </View>
          <Text variant="label" style={styles.deviceLabel}>PC</Text>
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
  deviceLabel: { color: Palette.text, textTransform: 'uppercase', textAlign: 'center' },
  diagramCaption: { color: Palette.textMuted, textAlign: 'center' },
  frameDiagram: { minHeight: 72, flexDirection: 'row', alignItems: 'stretch' },
  frameField: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Palette.border },
  frameAddress: { flex: 2, backgroundColor: Palette.accentSoft },
  frameData: { flex: 4, backgroundColor: Palette.surfaceRaised },
  frameCheck: { flex: 1.5, backgroundColor: Palette.orangeSoft },
  frameFieldLabel: { color: Palette.text, textAlign: 'center' },
  ethernetAsset: { width: '100%', height: 150 },
  mediaRow: { flexDirection: 'row', gap: Space.xl },
  mediaItem: { flex: 1, alignItems: 'center', gap: Space.md },
  mediaImage: { width: '100%', height: 104 },
  mediaSignal: { color: Palette.textMuted, textAlign: 'center' },
});
