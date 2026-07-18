import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { findPacketDemoPath, type DeviceNode, type DeviceType, type Position } from '@/core/network/models';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { GridBackground } from '@/shared/components/grid-background';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

const NODE_SIZE = 88;
const CANVAS_HEIGHT = 350;
const PACKET_SIZE = 14;
const PACKET_LEG_DURATION = 700;

interface DraggableDeviceProps {
  device: DeviceNode;
  canvasWidth: number;
  connectionMode: boolean;
  selectedForRemoval: boolean;
  onSelectForRemoval: (deviceId: string) => void;
}

function clampPosition(position: Position, canvasWidth: number): Position {
  return {
    x: Math.max(0, Math.min(canvasWidth - NODE_SIZE, position.x)),
    y: Math.max(0, Math.min(CANVAS_HEIGHT - NODE_SIZE, position.y)),
  };
}

function DraggableDevice({ device, canvasWidth, connectionMode, selectedForRemoval, onSelectForRemoval }: DraggableDeviceProps) {
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
          accessibilityLabel={`${device.name}${connectionMode ? ', tap to connect' : ', drag to move or tap to select'}`}
          onPress={() => connectionMode ? selectDeviceForConnection(device.id) : onSelectForRemoval(device.id)}
          style={[styles.node, selectedId === device.id && styles.selectedNode, selectedForRemoval && styles.selectedForRemoval]}>
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
  const removeDevice = useGameStore((state) => state.removeDevice);
  const removeCable = useGameStore((state) => state.removeCable);
  const [canvasWidth, setCanvasWidth] = useState(320);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>();
  const [removeConfirmationVisible, setRemoveConfirmationVisible] = useState(false);
  const packetX = useSharedValue(0);
  const packetY = useSharedValue(0);
  const packetOpacity = useSharedValue(0);

  const onLayout = (event: LayoutChangeEvent) => setCanvasWidth(event.nativeEvent.layout.width);
  const findDevice = (id: string) => topology.devices.find((device) => device.id === id);
  const selectedDevice = findDevice(selectedDeviceId ?? '');
  const packetPath = findPacketDemoPath(topology);
  const packetStyle = useAnimatedStyle(() => ({
    opacity: packetOpacity.value,
    transform: [{ translateX: packetX.value }, { translateY: packetY.value }],
  }));

  const add = (type: DeviceType) => {
    const offset = (topology.devices.length * 38) % 180;
    addDevice(type, clampPosition({ x: 22 + offset, y: 230 }, canvasWidth));
  };

  const confirmRemoveDevice = () => {
    if (!selectedDevice) return;
    removeDevice(selectedDevice.id);
    setSelectedDeviceId(undefined);
    setRemoveConfirmationVisible(false);
  };

  const sendDemoPacket = () => {
    if (!packetPath) return;
    const center = (device: DeviceNode) => ({
      x: device.position.x + NODE_SIZE / 2 - PACKET_SIZE / 2,
      y: device.position.y + NODE_SIZE / 2 - PACKET_SIZE / 2,
    });
    const source = center(packetPath.source);
    const intermediary = center(packetPath.intermediary);
    const destination = center(packetPath.destination);

    cancelAnimation(packetX);
    cancelAnimation(packetY);
    cancelAnimation(packetOpacity);
    packetX.set(source.x);
    packetY.set(source.y);
    packetOpacity.set(1);
    packetX.set(withSequence(
      withTiming(intermediary.x, { duration: PACKET_LEG_DURATION }),
      withTiming(destination.x, { duration: PACKET_LEG_DURATION }),
    ));
    packetY.set(withSequence(
      withTiming(intermediary.y, { duration: PACKET_LEG_DURATION }),
      withTiming(destination.y, { duration: PACKET_LEG_DURATION }),
    ));
    packetOpacity.set(withDelay(PACKET_LEG_DURATION * 2, withTiming(0, { duration: 150 })));
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
              const remove = () => removeCable(cable.id);
              const interaction = Platform.OS === 'web' ? { onClick: remove } : { onPress: remove };
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
                  {...interaction}
                />
              );
            })}
          </Svg>
        </View>
        {topology.devices.map((device) => (
          <DraggableDevice
            key={device.id}
            device={device}
            canvasWidth={canvasWidth}
            connectionMode={connectionMode}
            selectedForRemoval={!connectionMode && selectedDeviceId === device.id}
            onSelectForRemoval={(deviceId) => setSelectedDeviceId((current) => current === deviceId ? undefined : deviceId)}
          />
        ))}
        <Animated.View pointerEvents="none" style={[styles.packet, packetStyle]} />
      </View>

      <Text style={styles.canvasHint}>Tap a device to select it for removal. Tap a cable to remove it.</Text>
      {selectedDevice ? (
        <View style={styles.selectionActions}>
          <Text numberOfLines={1} style={styles.selectionLabel}>SELECTED: {selectedDevice.name}</Text>
          <AppButton label="Remove device" variant="secondary" onPress={() => setRemoveConfirmationVisible(true)} />
        </View>
      ) : null}

      <View style={styles.packetDemo}>
        <Text style={styles.packetDemoLabel}>PACKET PATH DEMO</Text>
        <Text style={styles.packetDemoCopy}>{packetPath ? 'Illustrates PC → switch → PC.' : 'Connect two PCs to the same switch to enable.'}</Text>
        <AppButton label="Send demo packet" disabled={!packetPath} onPress={sendDemoPacket} />
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

      <FeedbackModal
        visible={removeConfirmationVisible && selectedDevice !== undefined}
        tone="warning"
        eyebrow="CONFIRM ACTION"
        title={`Remove ${selectedDevice?.name ?? 'device'}?`}
        message="The device and every cable connected to it will be removed from the canvas."
        detail="You can add another device from the tray afterward."
        onRequestClose={() => setRemoveConfirmationVisible(false)}
        secondaryAction={{ label: 'Keep device', variant: 'secondary', onPress: () => setRemoveConfirmationVisible(false) }}
        primaryAction={{ label: 'Remove device', onPress: confirmRemoveDevice }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { height: CANVAS_HEIGHT, backgroundColor: Palette.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, overflow: 'hidden' },
  nodePosition: { position: 'absolute', left: 0, top: 0, width: NODE_SIZE, height: NODE_SIZE },
  node: { flex: 1, borderRadius: Radius.md, backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center', gap: Space.sm },
  selectedNode: { borderWidth: 2, borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  selectedForRemoval: { borderWidth: 2, borderColor: Palette.accent, backgroundColor: Palette.accentSoft },
  packet: { position: 'absolute', left: 0, top: 0, width: PACKET_SIZE, height: PACKET_SIZE, backgroundColor: Palette.orange, borderWidth: 1, borderColor: Palette.white, zIndex: 3 },
  nodeLabel: { width: '100%', textAlign: 'center', color: Palette.text, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', paddingHorizontal: Space.xs },
  canvasHint: { color: Palette.textMuted, fontSize: 11, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: Space.sm },
  selectionActions: { gap: Space.sm, marginTop: Space.md, padding: Space.md, backgroundColor: Palette.accentSoft, borderWidth: 1, borderColor: Palette.accent },
  selectionLabel: { color: Palette.accentBright, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  packetDemo: { gap: Space.sm, marginTop: Space.lg, padding: Space.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  packetDemoLabel: { color: Palette.orange, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  packetDemoCopy: { color: Palette.textMuted, fontSize: 11, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' },
  trayLabel: { color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, marginTop: Space.lg, marginBottom: Space.sm },
  tray: { flexDirection: 'row', gap: Space.sm },
  trayItem: { flex: 1, minHeight: 64, flexDirection: 'row', gap: Space.sm, borderRadius: Radius.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center' },
  trayText: { color: Palette.text, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  pressed: { opacity: 0.7 },
});
