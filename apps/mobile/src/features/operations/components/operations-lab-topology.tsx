import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import type { OperationsLabDefinition, OperationsTopologyNode } from '@/features/operations/operations-lab-definitions';
import type { OperationsSimulationSession } from '@/features/operations/operations-simulator';
import { deriveOperationsVisualTrace, getOperationsDeviceRecord } from '@/features/operations/operations-adapters';
import { Text } from '@/shared/components/console-text';
import { getLabResultLabel } from '@/shared/learner-facing-copy';
import type { ResponsiveMode } from '@/shared/responsive-layout';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useCanvasColors, useCanvasThemeStyles } from '@/shared/theme-context';

function NodeImage({ node }: { node: OperationsTopologyNode }) {
  const styles = useCanvasThemeStyles(createStyles);
  if (node.kind === 'server') return <Image accessibilityIgnoresInvertColors contentFit="contain" source={require('@/assets/images/education/server-terminal-mobile.png')} style={styles.server} />;
  return <DeviceGlyph size={52} type={node.kind} />;
}

export function OperationsLabTopology({ definition, mode, session, stageId, finished }: { definition: OperationsLabDefinition; mode: ResponsiveMode; session: OperationsSimulationSession; stageId?: string; finished: boolean }) {
  const styles = useCanvasThemeStyles(createStyles);
  const colors = useCanvasColors();
  const topology = definition.visualTopology;
  const [selectedId, setSelectedId] = useState(topology.nodes[0]?.id);
  const selected = topology.nodes.find((node) => node.id === selectedId) ?? topology.nodes[0];
  const selectedRecord = selected ? getOperationsDeviceRecord(definition.id, selected.id, selected.label, session) : undefined;
  const positions = Object.fromEntries(topology.nodes.map((node) => [node.id, node[mode]]));
  const compact = mode === 'compact';
  const height = compact ? Math.max(420, topology.nodes.length * 126) : 290;
  const trace = deriveOperationsVisualTrace(definition.id, stageId ?? '', session, topology.nodes, topology.links);
  return <View style={styles.section}>
    <View><Text variant="label" style={styles.green}>FIXED INTERACTIVE TOPOLOGY</Text><Text variant="bodySmall" style={styles.muted}>Tap a device to inspect its role and current state. Configuration happens in the guided inspector below.</Text></View>
    <View accessibilityLabel={topology.description} style={[styles.canvas, { height }]} testID="operations-topology-canvas">
      <Svg accessibilityElementsHidden height="100%" importantForAccessibility="no-hide-descendants" preserveAspectRatio="none" style={styles.cables} testID="operations-topology-cables" viewBox="0 0 100 100" width="100%">
        {topology.links.map((link) => { const a = positions[link.a]; const b = positions[link.b]; const active = trace?.activeLinkIds.includes(link.id); const failed = trace?.failedLinkId === link.id; return a && b ? <Line key={link.id} stroke={failed ? colors.danger : active ? colors.green : colors.accent} strokeLinecap="square" strokeWidth={active || failed ? 1.35 : 0.85} x1={a.x} x2={b.x} y1={a.y} y2={b.y} /> : null; })}
      </Svg>
      {topology.nodes.map((node) => { const point = node[mode]; const selectedNode = selected?.id === node.id; const active = trace?.activeDeviceIds.includes(node.id); const failed = trace?.failedDeviceId === node.id; return <Pressable key={node.id} accessibilityHint="Shows this device's role and current lab state" accessibilityLabel={`${node.label}, ${node.detail}${selectedNode ? ', selected' : ''}${active ? ', active in current trace' : ''}${failed ? ', stopping point' : ''}`} accessibilityRole="button" accessibilityState={{ selected: selectedNode }} onPress={() => setSelectedId(node.id)} style={[styles.node, { left: `${point.x}%`, top: `${point.y}%` }, active && styles.nodeActive, failed && styles.nodeFailed, selectedNode && styles.nodeSelected]}><NodeImage node={node} /><Text variant="technical" style={styles.nodeLabel}>{node.label}</Text><Text variant="technical" style={styles.nodeDetail}>{node.detail}</Text></Pressable>; })}
    </View>
    <View style={styles.links}>
      <Text variant="label" style={styles.green}>CABLES AND PORTS</Text>
      {topology.links.map((link, index) => {
        const left = topology.nodes.find((node) => node.id === link.a)?.label ?? link.a;
        const right = topology.nodes.find((node) => node.id === link.b)?.label ?? link.b;
        return <View key={link.id} style={styles.connection}>
          <Text variant="technical" style={styles.connectionNumber}>CONNECTION {index + 1}</Text>
          <View style={styles.connectionEndpoints}>
            <View style={styles.endpoint}><Text variant="label">{left}</Text><Text variant="technical" style={styles.muted}>PORT {link.aPort}</Text></View>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.connectionLine} />
            <View style={[styles.endpoint, styles.endpointRight]}><Text variant="label">{right}</Text><Text variant="technical" style={styles.muted}>PORT {link.bPort}</Text></View>
          </View>
          <Text accessibilityLabel={`${left} port ${link.aPort} connected to ${right} port ${link.bPort}`} variant="technical" style={styles.connected}>CONNECTED LINK</Text>
        </View>;
      })}
    </View>
    {selected ? <View accessibilityLiveRegion="polite" style={styles.inspector}><View style={styles.inspectorHeading}><NodeImage node={selected} /><View style={styles.inspectorCopy}><Text variant="label" style={styles.orange}>SELECTED / {selected.label}</Text><Text variant="bodySmall">{selected.role}</Text></View></View>{selectedRecord?.lines.map((line) => <Text key={line} variant="technical" style={[styles.state, selectedRecord.status === 'attention' && styles.stateAttention]}>{line}</Text>)}{trace ? <Text variant="bodySmall" style={styles.trace}>{getLabResultLabel(definition.id)} / {trace.text}</Text> : null}</View> : null}
  </View>;
}

const NODE_WIDTH = 118;
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { minWidth: 0, gap: Space.sm, padding: Space.md, borderWidth: 1, borderColor: colors.border, marginBottom: Space.md }, green: { color: colors.green, fontFamily: Fonts.semibold }, orange: { color: colors.orange, fontFamily: Fonts.semibold }, muted: { color: colors.textMuted },
  canvas: { minWidth: 0, width: '100%', position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, cables: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  node: { position: 'absolute', width: NODE_WIDTH, minHeight: 104, marginLeft: -(NODE_WIDTH / 2), marginTop: -52, padding: 4, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }, nodeActive: { borderColor: colors.green }, nodeFailed: { borderColor: colors.danger }, nodeSelected: { borderColor: colors.orange, backgroundColor: colors.orangeSoft }, server: { width: 52, height: 52 }, nodeLabel: { color: colors.text, textAlign: 'center', fontFamily: Fonts.semibold }, nodeDetail: { color: colors.textMuted, textAlign: 'center' },
  links: { minWidth: 0, gap: Space.sm, padding: Space.sm, borderWidth: 1, borderColor: colors.border }, connection: { minWidth: 0, gap: Space.xs, padding: Space.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }, connectionNumber: { color: colors.orange }, connectionEndpoints: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm }, endpoint: { flex: 1, minWidth: 0, gap: 2 }, endpointRight: { alignItems: 'flex-end' }, connectionLine: { width: 24, height: 2, backgroundColor: colors.green }, connected: { color: colors.green, textAlign: 'center' }, inspector: { minWidth: 0, gap: Space.sm, padding: Space.md, borderWidth: 1, borderColor: colors.green, backgroundColor: colors.surface }, inspectorHeading: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm }, inspectorCopy: { flex: 1, minWidth: 0, gap: Space.xs }, state: { color: colors.text, padding: Space.sm, borderWidth: 1, borderColor: colors.border }, stateAttention: { color: colors.orange, borderColor: colors.orange }, trace: { color: colors.orange, borderLeftWidth: 2, borderLeftColor: colors.orange, paddingLeft: Space.sm },
});
