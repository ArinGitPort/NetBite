import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line } from 'react-native-svg';

import type { SandboxPosition, SandboxTraceEvent, SandboxWorkspace } from '@/core/network/sandbox';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { Text } from '@/shared/components/console-text';
import { TopologyLinkLabels } from '@/shared/components/topology-link-labels';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useCanvasColors, useCanvasThemeStyles } from '@/shared/theme-context';

const LOGICAL_WIDTH = 720;
const LOGICAL_HEIGHT = 420;
const NODE_SIZE = 80;
const NODE_PLATE_WIDTH = 128;

function displayedNodeWidth(scale: number) {
  return Math.max(NODE_PLATE_WIDTH, NODE_SIZE * scale);
}

function displayedNodeHeight(scale: number, fontScale: number) {
  return Math.max(NODE_SIZE * scale, 76 + 34 * Math.max(1, fontScale));
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
  const styles = useCanvasThemeStyles(createStyles);
  const [live, setLive] = useState(device.position);
  const nodeWidth = displayedNodeWidth(scale);
  const nodeHeight = displayedNodeHeight(scale, fontScale);
  const addressedInterfaces = device.interfaces.filter((item) => item.ipv4 && item.prefix !== undefined);
  const accessibilityAddress = device.type === 'switch'
    ? ', Layer 2 switch, management IP configuration is not available in this sandbox'
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
        <Text variant="technical" numberOfLines={2} style={styles.nodeLabel}>{device.name}</Text>
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
  const colors = useCanvasColors();
  const styles = useCanvasThemeStyles(createStyles);
  const scale = zoom;
  const { fontScale } = useWindowDimensions();
  const canvasWidth = LOGICAL_WIDTH * scale + Math.max(0, NODE_PLATE_WIDTH - NODE_SIZE * scale);
  const [livePositions, setLivePositions] = useState<Record<string, SandboxPosition>>({});
  const [measuredNodeHeights, setMeasuredNodeHeights] = useState<Record<string, number>>({});
  const canvasHeight = workspace.devices.reduce((height, device) => {
    const position = livePositions[device.id] ?? device.position;
    const nodeHeight = measuredNodeHeights[device.id] ?? displayedNodeHeight(scale, fontScale);
    return Math.max(height, position.y * scale + nodeHeight);
  }, LOGICAL_HEIGHT * scale);
  const nodeGeometry = (deviceId: string) => {
    const device = workspace.devices.find((item) => item.id === deviceId);
    const position = livePositions[deviceId] ?? device?.position;
    if (!position || !device) return undefined;
    const width = displayedNodeWidth(scale);
    const height = measuredNodeHeights[deviceId] ?? displayedNodeHeight(scale, fontScale);
    return {
      center: {
        x: position.x * scale + width / 2,
        y: position.y * scale + height / 2,
      },
      bounds: { halfWidth: width / 2, halfHeight: height / 2 },
    };
  };
  const links = workspace.links.flatMap((link) => {
    const aNode = nodeGeometry(link.a.deviceId);
    const bNode = nodeGeometry(link.b.deviceId);
    return aNode && bNode ? [{ link, a: aNode.center, b: bNode.center, aBounds: aNode.bounds, bBounds: bNode.bounds }] : [];
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
                return <Line key={link.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active ? colors.orange : selectedLinkId === link.id ? colors.accentBright : colors.green} strokeWidth={active ? 6 : 4} strokeLinecap="round" />;
              })}
            </Svg>
          </View>
          {links.map(({ link, a, b, aBounds, bBounds }) => (
            <TopologyLinkLabels key={`${link.id}-labels`} from={a} fromBounds={aBounds} fromLabel={link.a.interfaceId} id={link.id} to={b} toBounds={bBounds} toLabel={link.b.interfaceId} />
          ))}
          {links.map(({ link, a, b }) => {
            const width = Math.max(28, Math.hypot(b.x - a.x, b.y - a.y));
            const angle = Math.atan2(b.y - a.y, b.x - a.x);
            const fromName = workspace.devices.find((device) => device.id === link.a.deviceId)?.name ?? link.a.deviceId;
            const toName = workspace.devices.find((device) => device.id === link.b.deviceId)?.name ?? link.b.deviceId;
            return <Pressable key={`${link.id}-target`} accessibilityHint="Selects this cable for inspection or removal" accessibilityLabel={`Cable from ${fromName} ${link.a.interfaceId} to ${toName} ${link.b.interfaceId}`} accessibilityRole="button" onPress={() => onSelectLink(link.id)} style={[styles.linkHitTarget, { left: (a.x + b.x) / 2 - width / 2, top: (a.y + b.y) / 2 - 22, width, transform: [{ rotate: `${angle}rad` }] }]} />;
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  frame: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, minWidth: 0 },
  scrollContent: { minWidth: '100%' },
  canvas: { position: 'relative', overflow: 'hidden', backgroundColor: colors.background },
  grid: { position: 'absolute', inset: 0, opacity: 0.45, borderWidth: 1, borderColor: colors.grid, pointerEvents: 'none' },
  cableLayer: { pointerEvents: 'none' },
  linkHitTarget: { position: 'absolute', height: 44, zIndex: 1 },
  node: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 4, zIndex: 4 },
  glyphArea: { alignItems: 'center', justifyContent: 'center' },
  nodeSelected: { borderColor: colors.accentBright },
  nodeActive: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  nodeLabel: { color: colors.text, fontFamily: Fonts.medium, textAlign: 'center', maxWidth: '100%' },
  empty: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: Space.xl, pointerEvents: 'none' },
  emptyTitle: { color: colors.textMuted },
  emptyDetail: { color: colors.textMuted, marginTop: Space.sm },
  canvasFooter: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm, borderTopWidth: 1, borderTopColor: colors.border, padding: Space.sm },
  canvasStatus: { color: colors.textMuted, flex: 1, minWidth: 180 },
  zoomLabel: { color: colors.orange },
});
