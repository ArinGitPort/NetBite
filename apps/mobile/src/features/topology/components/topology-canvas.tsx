import { Image } from 'expo-image';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Line } from 'react-native-svg';

import { findPacketDemoPath, type DeviceNode, type DeviceType, type Position } from '@/core/network/models';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { GridBackground } from '@/shared/components/grid-background';
import { selectionHaptic, successHaptic, warningHaptic } from '@/shared/haptics';
import { useAppReducedMotion } from '@/shared/use-app-reduced-motion';
import { Fonts, Radius, Space, type ThemeColors } from '@/shared/theme';
import { useCanvasColors, useCanvasThemeStyles } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';

const NODE_SIZE = 88;
const CANVAS_HEIGHT = 350;
const PACKET_SIZE = 48;
const PACKET_LEG_DURATION = 850;
const PACKET_DESTINATION_DWELL = 700;
const MAX_DEVICES = 12;

interface DraggableDeviceProps {
  device: DeviceNode;
  canvasWidth: number;
  connectionMode: boolean;
  selected: boolean;
  onConnect: (deviceId: string) => void;
  onDrag: (deviceId: string, position: Position) => void;
  onDragEnd: (deviceId: string) => void;
  onSelect: (deviceId: string) => void;
}

function clampPosition(position: Position, canvasWidth: number): Position {
  return {
    x: Math.max(0, Math.min(canvasWidth - NODE_SIZE, position.x)),
    y: Math.max(0, Math.min(CANVAS_HEIGHT - NODE_SIZE, position.y)),
  };
}

const DraggableDevice = memo(function DraggableDevice({
  device,
  canvasWidth,
  connectionMode,
  selected,
  onConnect,
  onDrag,
  onDragEnd,
  onSelect,
}: DraggableDeviceProps) {
  const styles = useCanvasThemeStyles(createStyles);
  const moveDevice = useGameStore((state) => state.moveDevice);
  const selectedConnectionId = useGameStore((state) => state.selectedConnectionStartId);
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
      onDrag(device.id, next);
    })
    .onEnd((_event, success) => {
      if (success) moveDevice(device.id, { x: x.value, y: y.value });
    })
    .onFinalize((_event, success) => {
      if (!success) {
        x.value = device.position.x;
        y.value = device.position.y;
      }
      onDragEnd(device.id);
    });

  const animatedPosition = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.nodePosition, animatedPosition]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${device.name}${connectionMode ? ', tap to connect' : ', drag to move or tap for device actions'}`}
          onPress={() => connectionMode ? onConnect(device.id) : onSelect(device.id)}
          style={[
            styles.node,
            selectedConnectionId === device.id && styles.selectedConnectionNode,
            selected && styles.selectedNode,
          ]}>
          <DeviceGlyph type={device.type} size={64} />
          <Text variant="label" numberOfLines={1} style={styles.nodeLabel}>{device.name}</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
});

interface TopologyCanvasProps {
  connectionMode: boolean;
}

export function TopologyCanvas({ connectionMode }: TopologyCanvasProps) {
  const colors = useCanvasColors();
  const styles = useCanvasThemeStyles(createStyles);
  const topology = useGameStore((state) => state.topology);
  const addDevice = useGameStore((state) => state.addDevice);
  const clearDeviceForRemoval = useGameStore((state) => state.clearDeviceForRemoval);
  const removeCable = useGameStore((state) => state.removeCable);
  const removeDevice = useGameStore((state) => state.removeDevice);
  const resizeTopologyCanvas = useGameStore((state) => state.resizeTopologyCanvas);
  const selectDeviceForConnection = useGameStore((state) => state.selectDeviceForConnection);
  const selectedDeviceId = useGameStore((state) => state.selectedDeviceForRemovalId);
  const selectDevice = useGameStore((state) => state.selectDeviceForRemoval);
  const [canvasWidth, setCanvasWidth] = useState(320);
  const [connectionNotice, setConnectionNotice] = useState<string>();
  const [liveDevicePositions, setLiveDevicePositions] = useState<Record<string, Position>>({});
  const [packetStage, setPacketStage] = useState<'idle' | 'sending' | 'forwarding' | 'received'>('idle');
  const [selectedPacketSourceId, setSelectedPacketSourceId] = useState<string>();
  const [selectedPacketDestinationId, setSelectedPacketDestinationId] = useState<string>();
  const [removeCableConfirmationVisible, setRemoveCableConfirmationVisible] = useState(false);
  const [removeDeviceConfirmationVisible, setRemoveDeviceConfirmationVisible] = useState(false);
  const [selectedCableId, setSelectedCableId] = useState<string>();
  const packetTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reducedMotion = useAppReducedMotion();
  const packetX = useSharedValue(0);
  const packetY = useSharedValue(0);

  const findDevice = useCallback(
    (id: string) => topology.devices.find((device) => device.id === id),
    [topology.devices],
  );
  const selectedDevice = findDevice(selectedDeviceId ?? '');
  const selectedCable = topology.cables.find((cable) => cable.id === selectedCableId);
  const packetPCs = topology.devices.filter((device) =>
    device.type === 'pc' && topology.devices.some((candidate) =>
      candidate.type === 'pc' && candidate.id !== device.id &&
      findPacketDemoPath(topology, device.id, candidate.id) !== undefined,
    ),
  );
  const packetSourceId = packetPCs.some((pc) => pc.id === selectedPacketSourceId)
    ? selectedPacketSourceId
    : packetPCs[0]?.id;
  const packetDestinations = packetPCs.filter((pc) =>
    pc.id !== packetSourceId && findPacketDemoPath(topology, packetSourceId, pc.id) !== undefined,
  );
  const packetDestinationId = packetDestinations.some((pc) => pc.id === selectedPacketDestinationId)
    ? selectedPacketDestinationId
    : packetDestinations[0]?.id;
  const packetPath = findPacketDemoPath(topology, packetSourceId, packetDestinationId);
  const queuedPacketPosition = packetPath
    ? {
        x: packetPath.source.position.x + NODE_SIZE / 2 +
          (packetPath.intermediary.position.x - packetPath.source.position.x) * 0.28 - PACKET_SIZE / 2,
        y: packetPath.source.position.y + NODE_SIZE / 2 +
          (packetPath.intermediary.position.y - packetPath.source.position.y) * 0.28 - PACKET_SIZE / 2,
      }
    : undefined;

  const packetStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: packetX.value }, { translateY: packetY.value }],
  }));

  const clearPacketTimers = useCallback(() => {
    packetTimers.current.forEach(clearTimeout);
    packetTimers.current = [];
  }, []);

  useEffect(() => () => clearPacketTimers(), [clearPacketTimers]);

  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setCanvasWidth(width);
    resizeTopologyCanvas(width, NODE_SIZE);
  };

  const updateLiveDevicePosition = useCallback((deviceId: string, position: Position) => {
    setLiveDevicePositions((positions) => ({ ...positions, [deviceId]: position }));
  }, []);

  const clearLiveDevicePosition = useCallback((deviceId: string) => {
    setLiveDevicePositions((positions) => {
      if (!(deviceId in positions)) return positions;
      const nextPositions = { ...positions };
      delete nextPositions[deviceId];
      return nextPositions;
    });
  }, []);

  const connectDevice = useCallback((deviceId: string) => {
    setSelectedCableId(undefined);
    const startId = useGameStore.getState().selectedConnectionStartId;
    const start = topology.devices.find((device) => device.id === startId);
    const target = topology.devices.find((device) => device.id === deviceId);
    const result = selectDeviceForConnection(deviceId);

    if (result === 'start-selected') {
      setConnectionNotice(`${target?.name ?? 'Device'} selected. Choose a second device.`);
      selectionHaptic();
    } else if (result === 'connected') {
      setConnectionNotice(`${start?.name ?? 'Device'} connected to ${target?.name ?? 'device'}.`);
      successHaptic();
    } else if (result === 'duplicate') {
      setConnectionNotice('Those devices are already connected.');
      warningHaptic();
    } else if (result === 'cancelled') {
      setConnectionNotice('Connection cancelled. Choose a first device.');
      selectionHaptic();
    } else {
      setConnectionNotice('That device is no longer available.');
      warningHaptic();
    }
  }, [selectDeviceForConnection, topology.devices]);

  const selectDeviceForActions = useCallback((deviceId: string) => {
    setSelectedCableId(undefined);
    selectDevice(deviceId);
    selectionHaptic();
  }, [selectDevice]);

  const selectCableForActions = (cableId: string) => {
    clearDeviceForRemoval();
    setSelectedCableId((current) => current === cableId ? undefined : cableId);
    selectionHaptic();
  };

  const add = (type: DeviceType) => {
    if (topology.devices.length >= MAX_DEVICES) {
      setConnectionNotice('Canvas limit reached. Remove a device before adding another.');
      warningHaptic();
      return;
    }
    const centerX = (canvasWidth - NODE_SIZE) / 2;
    const offsets = [0, -32, 32];
    const offset = offsets[topology.devices.length % offsets.length];
    addDevice(type, clampPosition({ x: centerX + offset, y: 230 }, canvasWidth));
    selectionHaptic();
  };

  const confirmRemoveDevice = () => {
    if (!selectedDevice) return;
    removeDevice(selectedDevice.id);
    setRemoveDeviceConfirmationVisible(false);
  };

  const confirmRemoveCable = () => {
    if (!selectedCable) return;
    removeCable(selectedCable.id);
    setSelectedCableId(undefined);
    setRemoveCableConfirmationVisible(false);
  };

  const sendDemoPacket = () => {
    if (!packetPath) return;
    clearPacketTimers();
    const center = (device: DeviceNode) => ({
      x: device.position.x + NODE_SIZE / 2 - PACKET_SIZE / 2,
      y: device.position.y + NODE_SIZE / 2 - PACKET_SIZE / 2,
    });
    const source = center(packetPath.source);
    const intermediary = center(packetPath.intermediary);
    const destination = center(packetPath.destination);
    const legDuration = reducedMotion ? 0 : PACKET_LEG_DURATION;

    cancelAnimation(packetX);
    cancelAnimation(packetY);
    packetX.set(source.x);
    packetY.set(source.y);
    setPacketStage('sending');
    packetX.set(withSequence(
      withTiming(intermediary.x, { duration: legDuration }),
      withTiming(destination.x, { duration: legDuration }),
    ));
    packetY.set(withSequence(
      withTiming(intermediary.y, { duration: legDuration }),
      withTiming(destination.y, { duration: legDuration }),
    ));
    if (reducedMotion) {
      packetX.set(destination.x);
      packetY.set(destination.y);
      setPacketStage('received');
      successHaptic();
      packetTimers.current = [setTimeout(() => {
        setPacketStage('idle');
      }, 1200)];
      return;
    }
    packetTimers.current = [
      setTimeout(() => setPacketStage('forwarding'), PACKET_LEG_DURATION),
      setTimeout(() => {
        setPacketStage('received');
        successHaptic();
      }, PACKET_LEG_DURATION * 2),
      setTimeout(() => setPacketStage('idle'), PACKET_LEG_DURATION * 2 + PACKET_DESTINATION_DWELL + 300),
    ];
  };

  const packetStageCopy = packetStage === 'sending'
    ? `${packetPath?.source.name ?? 'SOURCE'} SENDS`
    : packetStage === 'forwarding'
      ? `${packetPath?.intermediary.name ?? 'SWITCH'} FORWARDS`
      : packetStage === 'received'
        ? `${packetPath?.destination.name ?? 'DESTINATION'} RECEIVES`
        : packetPath
          ? `${packetPath.source.name} → ${packetPath.intermediary.name} → ${packetPath.destination.name}`
          : 'Connect two PCs to the same switch to enable.';

  const choosePacketSource = (sourceId: string) => {
    cancelAnimation(packetX);
    cancelAnimation(packetY);
    setSelectedPacketSourceId(sourceId);
    const destinationStillReachable = selectedPacketDestinationId &&
      findPacketDemoPath(topology, sourceId, selectedPacketDestinationId);
    if (!destinationStillReachable) setSelectedPacketDestinationId(undefined);
    setPacketStage('idle');
    clearPacketTimers();
    selectionHaptic();
  };

  const choosePacketDestination = (destinationId: string) => {
    cancelAnimation(packetX);
    cancelAnimation(packetY);
    setSelectedPacketDestinationId(destinationId);
    setPacketStage('idle');
    clearPacketTimers();
    selectionHaptic();
  };

  return (
    <View>
      <View onLayout={onLayout} style={styles.canvas}>
        <GridBackground />
        <View style={[StyleSheet.absoluteFill, styles.cableLayer]}>
          <Svg width="100%" height="100%">
            {topology.cables.map((cable) => {
              const from = findDevice(cable.fromDeviceId);
              const to = findDevice(cable.toDeviceId);
              if (!from || !to) return null;
              const fromPosition = liveDevicePositions[from.id] ?? from.position;
              const toPosition = liveDevicePositions[to.id] ?? to.position;
              const x1 = fromPosition.x + NODE_SIZE / 2;
              const y1 = fromPosition.y + NODE_SIZE / 2;
              const x2 = toPosition.x + NODE_SIZE / 2;
              const y2 = toPosition.y + NODE_SIZE / 2;
              const choose = () => selectCableForActions(cable.id);
              const interaction = Platform.OS === 'web' ? { onClick: choose } : { onPress: choose };

              return (
                <G key={cable.id}>
                  <Line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={selectedCableId === cable.id ? colors.orange : colors.accent}
                    strokeWidth={selectedCableId === cable.id ? 7 : 5}
                    strokeLinecap="round"
                  />
                  <Line
                    {...(Platform.OS === 'web' ? {} : {
                      accessible: true,
                      accessibilityLabel: `Cable between ${from.name} and ${to.name}. Tap to select.`,
                    })}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={colors.text}
                    strokeOpacity={0.01}
                    strokeWidth={28}
                    strokeLinecap="round"
                    {...interaction}
                  />
                </G>
              );
            })}
          </Svg>
        </View>
        {topology.devices.map((device) => (
          <DraggableDevice
            key={`${device.id}:${device.position.x}:${device.position.y}`}
            device={device}
            canvasWidth={canvasWidth}
            connectionMode={connectionMode}
            selected={!connectionMode && selectedDeviceId === device.id}
            onConnect={connectDevice}
            onDrag={updateLiveDevicePosition}
            onDragEnd={clearLiveDevicePosition}
            onSelect={selectDeviceForActions}
          />
        ))}
        {packetPath && packetStage === 'idle' && queuedPacketPosition ? (
          <View
            accessible
            accessibilityLabel={`Demo packet ready to travel from ${packetPath.source.name} through ${packetPath.intermediary.name} to ${packetPath.destination.name}.`}
            style={[
              styles.packet,
              styles.packetReady,
              styles.noPointerEvents,
              { transform: [{ translateX: queuedPacketPosition.x }, { translateY: queuedPacketPosition.y }] },
            ]}
            testID="ready-demo-packet">
            <Image
              accessible={false}
              contentFit="contain"
              source={require('@/assets/images/packets/packet-mobile.png')}
              style={styles.packetImage}
            />
          </View>
        ) : null}
        {packetStage !== 'idle' ? (
          <Animated.View accessible={false} style={[styles.packet, styles.noPointerEvents, packetStyle]} testID="moving-demo-packet">
            <Image
              accessible={false}
              contentFit="contain"
              source={require('@/assets/images/packets/packet-mobile.png')}
              style={styles.packetImage}
            />
          </Animated.View>
        ) : null}
      </View>

      <Text variant="label" style={styles.canvasHint}>Tap a device or cable to select it. Drag devices to arrange the network.</Text>
      {connectionNotice ? <Text variant="bodySmall" accessibilityLiveRegion="polite" style={styles.connectionNotice}>{connectionNotice}</Text> : null}

      {!connectionMode && selectedDevice ? (
        <View style={styles.selectionActions}>
          <Text variant="label" numberOfLines={1} style={styles.selectionLabel}>SELECTED: {selectedDevice.name}</Text>
          <Text variant="bodySmall" style={styles.selectionDescription}>
            {selectedDevice.type === 'pc'
              ? 'A PC uses network services.'
              : selectedDevice.type === 'switch'
                ? 'A switch connects devices in the same local network.'
                : 'A router connects different networks.'}
          </Text>
          <AppButton label="Remove device" variant="secondary" onPress={() => setRemoveDeviceConfirmationVisible(true)} />
        </View>
      ) : null}

      {!connectionMode && selectedCable ? (
        <View style={styles.selectionActions}>
          <Text variant="label" style={styles.selectionLabel}>SELECTED: CABLE</Text>
          <Text variant="bodySmall" style={styles.selectionDescription}>Connects {findDevice(selectedCable.fromDeviceId)?.name} to {findDevice(selectedCable.toDeviceId)?.name}.</Text>
          <AppButton label="Remove cable" variant="secondary" onPress={() => setRemoveCableConfirmationVisible(true)} />
        </View>
      ) : null}

      <View style={styles.packetDemo}>
        <View style={styles.packetDemoHeading}>
          <Image accessible={false} contentFit="contain" source={require('@/assets/images/packets/packet-mobile.png')} style={styles.packetPreview} testID="demo-packet-preview" />
          <View style={styles.packetDemoHeadingCopy}>
            <Text variant="label" style={styles.packetDemoLabel}>DEMO PACKET TOKEN</Text>
            <Text variant="technical" style={styles.packetDemoNote}>THE TOKEN MOVES ON THE CANVAS WHEN SENT.</Text>
          </View>
        </View>
        <Text variant="technical" style={styles.packetDemoNote}>A CONCEPTUAL PATH ONLY. ETHERNET FRAMES BEGIN IN CHAPTER 2.</Text>
        <Text variant="label" accessibilityLiveRegion="polite" style={[styles.packetDemoCopy, packetStage !== 'idle' && styles.packetStageActive]}>{packetStageCopy}</Text>
        {packetPCs.length > 2 ? (
          <View style={styles.packetRoutePicker}>
            <View style={styles.packetRouteRow}>
              <Text variant="technical" style={styles.packetRouteLabel}>FROM</Text>
              <View style={styles.packetRouteOptions}>
                {packetPCs.map((pc) => (
                  <Pressable
                    key={pc.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: pc.id === packetSourceId }}
                    onPress={() => choosePacketSource(pc.id)}
                    style={[styles.packetRouteOption, pc.id === packetSourceId && styles.packetRouteOptionSelected]}>
                    <Text variant="label" style={[styles.packetRouteOptionText, pc.id === packetSourceId && styles.packetRouteOptionTextSelected]}>{pc.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.packetRouteRow}>
              <Text variant="technical" style={styles.packetRouteLabel}>TO</Text>
              <View style={styles.packetRouteOptions}>
                {packetDestinations.map((pc) => (
                  <Pressable
                    key={pc.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: pc.id === packetDestinationId }}
                    onPress={() => choosePacketDestination(pc.id)}
                    style={[styles.packetRouteOption, pc.id === packetDestinationId && styles.packetRouteOptionSelected]}>
                    <Text variant="label" style={[styles.packetRouteOptionText, pc.id === packetDestinationId && styles.packetRouteOptionTextSelected]}>{pc.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : null}
        <AppButton label="Send demo message" disabled={!packetPath} onPress={sendDemoPacket} />
      </View>

      <Text variant="label" style={styles.trayLabel}>ADD A DEVICE</Text>
      <View style={styles.tray}>
        {(['pc', 'switch', 'router'] as const).map((type) => (
          <Pressable
            key={type}
            accessibilityLabel={`Add ${type === 'pc' ? 'PC' : type}`}
            accessibilityRole="button"
            disabled={topology.devices.length >= MAX_DEVICES}
            onPress={() => add(type)}
            style={({ pressed }) => [
              styles.trayItem,
              topology.devices.length >= MAX_DEVICES && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <DeviceGlyph type={type} size={40} />
            <Text variant="label" style={styles.trayText}>{type === 'pc' ? 'PC' : `${type[0].toUpperCase()}${type.slice(1)}`}</Text>
          </Pressable>
        ))}
      </View>

      <FeedbackModal
        visible={removeDeviceConfirmationVisible && selectedDevice !== undefined}
        tone="warning"
        eyebrow="CONFIRM ACTION"
        title={`Remove ${selectedDevice?.name ?? 'device'}?`}
        message="The device and every cable connected to it will be removed from the canvas."
        detail="You can add another device from the tray afterward."
        onRequestClose={() => setRemoveDeviceConfirmationVisible(false)}
        secondaryAction={{ label: 'Keep device', variant: 'secondary', onPress: () => setRemoveDeviceConfirmationVisible(false) }}
        primaryAction={{ label: 'Remove device', variant: 'danger', onPress: confirmRemoveDevice }}
      />

      <FeedbackModal
        visible={removeCableConfirmationVisible && selectedCable !== undefined}
        tone="warning"
        eyebrow="CONFIRM ACTION"
        title="Remove this cable?"
        message={`The connection between ${findDevice(selectedCable?.fromDeviceId ?? '')?.name ?? 'the first device'} and ${findDevice(selectedCable?.toDeviceId ?? '')?.name ?? 'the second device'} will be removed.`}
        onRequestClose={() => setRemoveCableConfirmationVisible(false)}
        secondaryAction={{ label: 'Keep cable', variant: 'secondary', onPress: () => setRemoveCableConfirmationVisible(false) }}
        primaryAction={{ label: 'Remove cable', variant: 'danger', onPress: confirmRemoveCable }}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  canvas: { height: CANVAS_HEIGHT, backgroundColor: colors.background, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cableLayer: { pointerEvents: 'box-none' },
  nodePosition: { position: 'absolute', left: 0, top: 0, width: NODE_SIZE, height: NODE_SIZE },
  node: { flex: 1, borderRadius: Radius.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: Space.sm },
  selectedConnectionNode: { borderWidth: 2, borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  selectedNode: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft },
  packet: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PACKET_SIZE,
    height: PACKET_SIZE,
    zIndex: 20,
    elevation: 8,
    padding: 3,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  packetReady: { borderStyle: 'dashed' },
  noPointerEvents: { pointerEvents: 'none' },
  packetImage: { width: '100%', height: '100%' },
  nodeLabel: { width: '100%', textAlign: 'center', color: colors.text, fontFamily: Fonts.medium, textTransform: 'uppercase', paddingHorizontal: Space.xs },
  canvasHint: { color: colors.textMuted, textTransform: 'uppercase', marginTop: Space.sm },
  connectionNotice: { color: colors.orange, marginTop: Space.sm },
  selectionActions: { gap: Space.sm, marginTop: Space.md, padding: Space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent },
  selectionLabel: { color: colors.accentBright, fontFamily: Fonts.medium },
  selectionDescription: { color: colors.text },
  packetDemo: { gap: Space.sm, marginTop: Space.lg, padding: Space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  packetDemoHeading: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  packetDemoHeadingCopy: { minWidth: 0, flex: 1 },
  packetPreview: { width: 44, height: 44 },
  packetDemoLabel: { color: colors.orange, fontFamily: Fonts.medium },
  packetDemoNote: { color: colors.textMuted },
  packetDemoCopy: { color: colors.textMuted, textTransform: 'uppercase' },
  packetStageActive: { color: colors.orange },
  packetRoutePicker: { gap: Space.sm, paddingVertical: Space.xs },
  packetRouteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  packetRouteLabel: { width: 44, paddingTop: 13, color: colors.textMuted, fontFamily: Fonts.medium },
  packetRouteOptions: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs },
  packetRouteOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  packetRouteOptionSelected: { backgroundColor: colors.orangeSoft, borderColor: colors.orange },
  packetRouteOptionText: { color: colors.textMuted, fontFamily: Fonts.medium, textTransform: 'uppercase' },
  packetRouteOptionTextSelected: { color: colors.orange },
  trayLabel: { color: colors.textMuted, fontFamily: Fonts.medium, marginTop: Space.lg, marginBottom: Space.sm },
  tray: { flexDirection: 'row', gap: Space.sm },
  trayItem: { flex: 1, minHeight: 72, flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, padding: Space.xs, borderRadius: Radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  trayText: { color: colors.text, fontFamily: Fonts.medium, textTransform: 'uppercase' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
