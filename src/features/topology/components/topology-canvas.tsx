import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import type { DeviceNode, DeviceType, Position } from '@/core/network/models';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { Text } from '@/shared/components/console-text';
import { GridBackground } from '@/shared/components/grid-background';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

const NODE_SIZE = 88;
const CANVAS_HEIGHT = 350;

interface DraggableDeviceProps {
  device: DeviceNode;
  canvasWidth: number;
  connectionMode: boolean;
}

function clampPosition(position: Position, canvasWidth: number): Position {
  return {
    x: Math.max(0, Math.min(canvasWidth - NODE_SIZE, position.x)),
    y: Math.max(0, Math.min(CANVAS_HEIGHT - NODE_SIZE, position.y)),
  };
}

function DraggableDevice({ device, canvasWidth, connectionMode }: DraggableDeviceProps) {
  const moveDevice = useGameStore((state) => state.moveDevice);
  const selectDeviceForConnection = useGameStore((state) => state.selectDeviceForConnection);
  const selectedId = useGameStore((state) => state.selectedConnectionStartId);
  const x = useSharedValue(device.position.x);
  const y = useSharedValue(device.position.y);
  const originX = useSharedValue(device.position.x);
  const originY = useSharedValue(device.position.y);

  const pan = Gesture.Pan()
    .minDistance(5)
    .runOnJS(true)
    .onBegin(() => {
      originX.value = x.value;
      originY.value = y.value;
    })
    .onUpdate((event) => {
      const next = clampPosition(
        { x: originX.value + event.translationX, y: originY.value + event.translationY },
        canvasWidth,
      );
      x.value = next.x;
      y.value = next.y;
    })
    .onEnd(() => moveDevice(device.id, { x: x.value, y: y.value }));

  const animatedPosition = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.nodePosition, animatedPosition]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${device.name}${connectionMode ? ', tap to connect' : ', drag to move'}`}
          onPress={() => connectionMode && selectDeviceForConnection(device.id)}
          style={[styles.node, selectedId === device.id && styles.selectedNode]}>
          <DeviceGlyph type={device.type} size={64} />
          <Text numberOfLines={1} style={styles.nodeLabel}>{device.name}</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

interface TopologyCanvasProps {
  connectionMode: boolean;
}

export function TopologyCanvas({ connectionMode }: TopologyCanvasProps) {
  const topology = useGameStore((state) => state.topology);
  const addDevice = useGameStore((state) => state.addDevice);
  const removeCable = useGameStore((state) => state.removeCable);
  const [canvasWidth, setCanvasWidth] = useState(320);

  const onLayout = (event: LayoutChangeEvent) => setCanvasWidth(event.nativeEvent.layout.width);
  const findDevice = (id: string) => topology.devices.find((device) => device.id === id);
  const add = (type: DeviceType) => {
    const offset = (topology.devices.length * 38) % 180;
    addDevice(type, clampPosition({ x: 22 + offset, y: 230 }, canvasWidth));
  };

  return (
    <View>
      <View onLayout={onLayout} style={styles.canvas}>
        <GridBackground />
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            {topology.cables.map((cable) => {
              const from = findDevice(cable.fromDeviceId);
              const to = findDevice(cable.toDeviceId);
              if (!from || !to) return null;
              const x1 = from.position.x + NODE_SIZE / 2;
              const y1 = from.position.y + NODE_SIZE / 2;
              const x2 = to.position.x + NODE_SIZE / 2;
              const y2 = to.position.y + NODE_SIZE / 2;
              return (
                <Line
                  key={cable.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={Palette.accent}
                  strokeWidth={5}
                  strokeLinecap="round"
                  onPress={() => removeCable(cable.id)}
                />
              );
            })}
          </Svg>
        </View>
        {topology.devices.map((device) => (
          <DraggableDevice key={device.id} device={device} canvasWidth={canvasWidth} connectionMode={connectionMode} />
        ))}
      </View>

      <Text style={styles.trayLabel}>ADD A DEVICE</Text>
      <View style={styles.tray}>
        {(['pc', 'switch', 'router'] as const).map((type) => (
          <Pressable key={type} onPress={() => add(type)} style={({ pressed }) => [styles.trayItem, pressed && styles.pressed]}>
            <DeviceGlyph type={type} size={40} />
            <Text style={styles.trayText}>{type === 'pc' ? 'PC' : `${type[0].toUpperCase()}${type.slice(1)}`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { height: CANVAS_HEIGHT, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, overflow: 'hidden' },
  nodePosition: { position: 'absolute', left: 0, top: 0, width: NODE_SIZE, height: NODE_SIZE },
  node: { flex: 1, borderRadius: Radius.md, backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center', gap: Space.sm },
  selectedNode: { borderWidth: 2, borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  nodeLabel: { width: '100%', textAlign: 'center', color: Palette.text, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', paddingHorizontal: Space.xs },
  trayLabel: { color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, marginTop: Space.lg, marginBottom: Space.sm },
  tray: { flexDirection: 'row', gap: Space.sm },
  trayItem: { flex: 1, minHeight: 64, flexDirection: 'row', gap: Space.sm, borderRadius: Radius.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center' },
  trayText: { color: Palette.text, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  pressed: { opacity: 0.7 },
});
