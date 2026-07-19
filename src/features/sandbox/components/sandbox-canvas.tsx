import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { G, Line } from 'react-native-svg';

import type { SandboxPosition, SandboxTraceEvent, SandboxWorkspace } from '@/core/network/sandbox';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

const LOGICAL_WIDTH = 720;
const LOGICAL_HEIGHT = 420;
const NODE_SIZE = 80;

function SandboxNode({
  device,
  scale,
  selected,
  active,
  connectMode,
  onPress,
  onDragLive,
  onDrag,
}: {
  device: SandboxWorkspace['devices'][number];
  scale: number;
  selected: boolean;
  active: boolean;
  connectMode: boolean;
  onPress: () => void;
  onDragLive: (position?: SandboxPosition) => void;
  onDrag: (position: SandboxPosition) => void;
}) {
  const [live, setLive] = useState(device.position);
  const pan = Gesture.Pan()
    .enabled(!connectMode)
    .runOnJS(true)
    .onUpdate((event) => {
      const position = { x: Math.max(0, Math.min(LOGICAL_WIDTH - NODE_SIZE, device.position.x + event.translationX / scale)), y: Math.max(0, Math.min(LOGICAL_HEIGHT - NODE_SIZE, device.position.y + event.translationY / scale)) };
      setLive(position); onDragLive(position);
    })
    .onEnd((event) => {
      const position = { x: Math.max(0, Math.min(LOGICAL_WIDTH - NODE_SIZE, device.position.x + event.translationX / scale)), y: Math.max(0, Math.min(LOGICAL_HEIGHT - NODE_SIZE, device.position.y + event.translationY / scale)) };
      onDrag(position); onDragLive(undefined);
    })
    .onFinalize(() => onDragLive(undefined));

  return (
    <GestureDetector gesture={pan}>
      <Pressable accessibilityLabel={`${device.name}, ${device.type}${connectMode ? ', tap to connect' : ', drag to move or tap to inspect'}`} accessibilityRole="button" onPress={onPress} style={[styles.node, { left: live.x * scale, top: live.y * scale, width: NODE_SIZE * scale, minHeight: NODE_SIZE * scale }, selected && styles.nodeSelected, active && styles.nodeActive]}>
        <DeviceGlyph type={device.type} size={Math.max(44, 54 * scale)} />
        <Text variant="technical" numberOfLines={1} style={styles.nodeLabel}>{device.name}</Text>
      </Pressable>
    </GestureDetector>
  );
}

export function SandboxCanvas({ workspace, selectedDeviceId, selectedLinkId, connectionStartId, connectMode = false, traceEvent, zoom, onSelectDevice, onSelectLink, onMoveDevice }: {
  workspace: SandboxWorkspace;
  selectedDeviceId?: string;
  selectedLinkId?: string;
  connectionStartId?: string;
  connectMode?: boolean;
  traceEvent?: SandboxTraceEvent;
  zoom: number;
  onSelectDevice: (deviceId: string) => void;
  onSelectLink: (linkId: string) => void;
  onMoveDevice: (deviceId: string, position: SandboxPosition) => void;
}) {
  const scale = zoom;
  const [livePositions, setLivePositions] = useState<Record<string, SandboxPosition>>({});
  const center = (deviceId: string) => {
    const device = workspace.devices.find((item) => item.id === deviceId);
    const position = livePositions[deviceId] ?? device?.position;
    return position ? { x: (position.x + NODE_SIZE / 2) * scale, y: (position.y + NODE_SIZE / 2) * scale } : undefined;
  };
  return (
    <View style={styles.frame}>
      <ScrollView accessibilityLabel="Sandbox network canvas" horizontal nestedScrollEnabled showsHorizontalScrollIndicator contentContainerStyle={styles.scrollContent}>
        <View style={[styles.canvas, { width: LOGICAL_WIDTH * scale, height: LOGICAL_HEIGHT * scale }]}>
          <View pointerEvents="none" style={styles.grid} />
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%">
              {workspace.links.map((link) => {
                const a = center(link.a.deviceId); const b = center(link.b.deviceId);
                if (!a || !b) return null;
                const active = traceEvent?.linkIds.includes(link.id);
                return (
                  <G key={link.id}>
                    <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active ? Palette.orange : selectedLinkId === link.id ? Palette.accentBright : Palette.border} strokeWidth={active ? 6 : 4} strokeLinecap="round" />
                    <Line accessibilityLabel={`Link ${link.a.interfaceId} to ${link.b.interfaceId}`} onPress={() => onSelectLink(link.id)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={Palette.white} strokeOpacity={0.01} strokeWidth={28} strokeLinecap="round" />
                  </G>
                );
              })}
            </Svg>
          </View>
          {workspace.devices.map((device) => <SandboxNode key={`${device.id}:${device.position.x}:${device.position.y}`} device={device} scale={scale} selected={selectedDeviceId === device.id || connectionStartId === device.id} active={Boolean(traceEvent?.deviceIds.includes(device.id))} connectMode={connectMode} onPress={() => onSelectDevice(device.id)} onDragLive={(position) => setLivePositions((current) => { if (position) return { ...current, [device.id]: position }; const next = { ...current }; delete next[device.id]; return next; })} onDrag={(position) => onMoveDevice(device.id, position)} />)}
          {!workspace.devices.length ? <View pointerEvents="none" style={styles.empty}><Text variant="sectionHeading" style={styles.emptyTitle}>EMPTY WORKSPACE</Text><Text variant="bodySmall" style={styles.emptyDetail}>Add a PC, switch, or router below.</Text></View> : null}
        </View>
      </ScrollView>
      <View style={styles.canvasFooter}>
        <Text variant="technical" style={styles.canvasStatus}>{connectMode ? connectionStartId ? `CONNECT FROM ${workspace.devices.find((device) => device.id === connectionStartId)?.name} / TAP TARGET` : 'CONNECT / TAP FIRST DEVICE' : 'DRAG DEVICES / SWIPE CANVAS / TAP TO SELECT'}</Text>
        <Text variant="technical" style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, minWidth: 0 },
  scrollContent: { minWidth: '100%' },
  canvas: { position: 'relative', overflow: 'hidden', backgroundColor: Palette.background },
  grid: { position: 'absolute', inset: 0, opacity: 0.28, borderWidth: 1, borderColor: Palette.grid },
  node: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surfaceRaised, padding: 4, zIndex: 2 },
  nodeSelected: { borderColor: Palette.accentBright },
  nodeActive: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  nodeLabel: { color: Palette.text, fontFamily: Fonts.medium, textAlign: 'center', maxWidth: '100%' },
  empty: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: Space.xl },
  emptyTitle: { color: Palette.textMuted },
  emptyDetail: { color: Palette.textMuted, marginTop: Space.sm },
  canvasFooter: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border, padding: Space.sm },
  canvasStatus: { color: Palette.textMuted, flex: 1, minWidth: 180 },
  zoomLabel: { color: Palette.orange },
});
