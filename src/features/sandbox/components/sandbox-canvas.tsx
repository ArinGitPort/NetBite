import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line } from 'react-native-svg';

import type { SandboxPosition, SandboxTraceEvent, SandboxWorkspace } from '@/core/network/sandbox';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

const LOGICAL_WIDTH = 720;
const LOGICAL_HEIGHT = 420;
const NODE_SIZE = 80;
const NODE_PLATE_WIDTH = 128;

export interface SandboxDeviceNetworkLabel {
  id: string;
  text: string;
  tone: 'configured' | 'unset' | 'down' | 'informational';
}

export function getSandboxDeviceNetworkLabels(device: SandboxWorkspace['devices'][number]): SandboxDeviceNetworkLabel[] {
  if (device.type === 'switch') return [
    { id: 'role', text: 'L2 SWITCH', tone: 'informational' },
    { id: 'management', text: 'MGMT IP NOT MODELED', tone: 'informational' },
  ];
  const addressed = device.interfaces.filter((item) => item.ipv4 && item.prefix !== undefined);
  if (!addressed.length) return [{ id: 'unconfigured', text: 'IP NOT SET', tone: 'unset' }];
  if (device.type === 'router') return addressed.flatMap((item) => [
    { id: `${item.id}-name`, text: item.id, tone: 'informational' as const },
    { id: `${item.id}-address`, text: `${item.ipv4}/${item.prefix}${item.adminUp ? '' : ' / DOWN'}`, tone: item.adminUp ? 'configured' as const : 'down' as const },
  ]);
  return addressed.map((item) => ({ id: item.id, text: `${item.ipv4}/${item.prefix}${item.adminUp ? '' : ' / DOWN'}`, tone: item.adminUp ? 'configured' : 'down' }));
}

function displayedNodeWidth(scale: number) {
  return Math.max(NODE_PLATE_WIDTH, NODE_SIZE * scale);
}

function displayedNodeHeight(device: SandboxWorkspace['devices'][number], scale: number, fontScale: number) {
  return Math.max(NODE_SIZE * scale, 76 + (getSandboxDeviceNetworkLabels(device).length + 1) * 17 * Math.max(1, fontScale));
}

function SandboxNode({
  device,
  scale,
  selected,
  active,
  connectMode,
  onPress,
  onDragLive,
  onDrag,
  fontScale,
  onMeasure,
}: {
  device: SandboxWorkspace['devices'][number];
  scale: number;
  selected: boolean;
  active: boolean;
  connectMode: boolean;
  onPress: () => void;
  onDragLive: (position?: SandboxPosition) => void;
  onDrag: (position: SandboxPosition) => void;
  fontScale: number;
  onMeasure: (height: number) => void;
}) {
  const [live, setLive] = useState(device.position);
  const networkLabels = getSandboxDeviceNetworkLabels(device);
  const nodeWidth = displayedNodeWidth(scale);
  const nodeHeight = displayedNodeHeight(device, scale, fontScale);
  const addressedInterfaces = device.interfaces.filter((item) => item.ipv4 && item.prefix !== undefined);
  const accessibilityAddress = device.type === 'switch'
    ? ', Layer 2 switch, management IP not modeled in this sandbox'
    : addressedInterfaces.length
      ? `, ${addressedInterfaces.map((item) => `${device.type === 'router' ? `${item.id}, ` : ''}IP address ${item.ipv4}/${item.prefix}${item.adminUp ? '' : ', down'}`).join(', ')}`
      : ', IP address not set';
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
      <Pressable accessibilityLabel={`${device.name}, ${device.type}${accessibilityAddress}${connectMode ? ', tap to connect' : ', drag to move or tap to inspect'}`} accessibilityRole="button" onLayout={(event) => onMeasure(event.nativeEvent.layout.height)} onPress={onPress} style={[styles.node, { left: live.x * scale, top: live.y * scale, width: nodeWidth, minHeight: nodeHeight }, selected && styles.nodeSelected, active && styles.nodeActive]}>
        <View style={[styles.glyphArea, { height: 68 }]}><DeviceGlyph type={device.type} size={Math.max(44, 54 * scale)} /></View>
        <Text variant="technical" numberOfLines={1} style={styles.nodeLabel}>{device.name}</Text>
        {networkLabels.map((label) => <Text key={label.id} variant="technical" style={[styles.nodeAddress, label.tone === 'unset' || label.tone === 'informational' ? styles.nodeAddressUnset : label.tone === 'down' ? styles.nodeAddressDown : undefined]}>{label.text}</Text>)}
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
  const { fontScale } = useWindowDimensions();
  const canvasWidth = LOGICAL_WIDTH * scale + Math.max(0, NODE_PLATE_WIDTH - NODE_SIZE * scale);
  const [livePositions, setLivePositions] = useState<Record<string, SandboxPosition>>({});
  const [measuredNodeHeights, setMeasuredNodeHeights] = useState<Record<string, number>>({});
  const canvasHeight = workspace.devices.reduce((height, device) => {
    const position = livePositions[device.id] ?? device.position;
    const nodeHeight = measuredNodeHeights[device.id] ?? displayedNodeHeight(device, scale, fontScale);
    return Math.max(height, position.y * scale + nodeHeight);
  }, LOGICAL_HEIGHT * scale);
  const center = (deviceId: string) => {
    const device = workspace.devices.find((item) => item.id === deviceId);
    const position = livePositions[deviceId] ?? device?.position;
    if (!position || !device) return undefined;
    return {
      x: position.x * scale + displayedNodeWidth(scale) / 2,
      y: position.y * scale + 38,
    };
  };
  const links = workspace.links.flatMap((link) => {
    const a = center(link.a.deviceId); const b = center(link.b.deviceId);
    return a && b ? [{ link, a, b }] : [];
  });
  return (
    <View style={styles.frame}>
      <ScrollView accessibilityLabel="Sandbox network canvas" horizontal nestedScrollEnabled showsHorizontalScrollIndicator contentContainerStyle={styles.scrollContent}>
        <View testID="sandbox-canvas-surface" style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
          <View style={styles.grid} />
          <View style={[StyleSheet.absoluteFill, styles.cableLayer]}>
            <Svg width="100%" height="100%">
              {links.map(({ link, a, b }) => {
                const active = traceEvent?.linkIds.includes(link.id);
                return <Line key={link.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active ? Palette.orange : selectedLinkId === link.id ? Palette.accentBright : Palette.border} strokeWidth={active ? 6 : 4} strokeLinecap="round" />;
              })}
            </Svg>
          </View>
          {links.map(({ link, a, b }) => {
            const width = Math.max(28, Math.hypot(b.x - a.x, b.y - a.y));
            const angle = Math.atan2(b.y - a.y, b.x - a.x);
            return <Pressable key={`${link.id}-target`} accessibilityHint="Selects this cable for inspection or removal" accessibilityLabel={`Link ${link.a.interfaceId} to ${link.b.interfaceId}`} accessibilityRole="button" onPress={() => onSelectLink(link.id)} style={[styles.linkHitTarget, { left: (a.x + b.x) / 2 - width / 2, top: (a.y + b.y) / 2 - 14, width, transform: [{ rotate: `${angle}rad` }] }]} />;
          })}
          {workspace.devices.map((device) => <SandboxNode key={`${device.id}:${device.position.x}:${device.position.y}`} device={device} scale={scale} fontScale={fontScale} selected={selectedDeviceId === device.id || connectionStartId === device.id} active={Boolean(traceEvent?.deviceIds.includes(device.id))} connectMode={connectMode} onPress={() => onSelectDevice(device.id)} onMeasure={(height) => setMeasuredNodeHeights((current) => Math.abs((current[device.id] ?? 0) - height) < 0.5 ? current : { ...current, [device.id]: height })} onDragLive={(position) => setLivePositions((current) => { if (position) return { ...current, [device.id]: position }; const next = { ...current }; delete next[device.id]; return next; })} onDrag={(position) => onMoveDevice(device.id, position)} />)}
          {!workspace.devices.length ? <View style={styles.empty}><Text variant="sectionHeading" style={styles.emptyTitle}>EMPTY WORKSPACE</Text><Text variant="bodySmall" style={styles.emptyDetail}>Add a PC, switch, or router below.</Text></View> : null}
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
  grid: { position: 'absolute', inset: 0, opacity: 0.28, borderWidth: 1, borderColor: Palette.grid, pointerEvents: 'none' },
  cableLayer: { pointerEvents: 'none' },
  linkHitTarget: { position: 'absolute', height: 28, zIndex: 1 },
  node: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surfaceRaised, padding: 4, zIndex: 2 },
  glyphArea: { alignItems: 'center', justifyContent: 'center' },
  nodeSelected: { borderColor: Palette.accentBright },
  nodeActive: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  nodeLabel: { color: Palette.text, fontFamily: Fonts.medium, textAlign: 'center', maxWidth: '100%' },
  nodeAddress: { color: Palette.green, fontFamily: Fonts.medium, textAlign: 'center', maxWidth: '100%', marginTop: 2 },
  nodeAddressUnset: { color: Palette.textMuted },
  nodeAddressDown: { color: Palette.orange },
  empty: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: Space.xl, pointerEvents: 'none' },
  emptyTitle: { color: Palette.textMuted },
  emptyDetail: { color: Palette.textMuted, marginTop: Space.sm },
  canvasFooter: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border, padding: Space.sm },
  canvasStatus: { color: Palette.textMuted, flex: 1, minWidth: 180 },
  zoomLabel: { color: Palette.orange },
});
