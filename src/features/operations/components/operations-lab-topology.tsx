import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import type { OperationsLabDefinition, OperationsTopologyNode } from '@/features/operations/operations-lab-definitions';
import type { OperationsSimulationSession } from '@/features/operations/operations-simulator';
import { Text } from '@/shared/components/console-text';
import type { ResponsiveMode } from '@/shared/responsive-layout';
import { Fonts, Palette, Space } from '@/shared/theme';

function NodeImage({ node }: { node: OperationsTopologyNode }) {
  if (node.kind === 'server') return <Image accessibilityIgnoresInvertColors contentFit="contain" source={require('@/assets/images/education/server-terminal-mobile.png')} style={styles.server} />;
  return <DeviceGlyph size={52} type={node.kind} />;
}

function dhcpState(node: OperationsTopologyNode, session: OperationsSimulationSession) {
  const configuration = session.configuration;
  const leases = (session.protocolState?.dhcp as { leases?: { clientId: string; address: string }[] } | undefined)?.leases ?? [];
  if (node.id === 'dhcp-1') {
    const pool = configuration['dhcp.start'] && configuration['dhcp.end'] ? `${configuration['dhcp.start']}–${configuration['dhcp.end']}` : 'POOL NOT CONFIGURED';
    return [`POOL / ${pool}`, `EXCLUDED / ${configuration['dhcp.excluded'] ?? 'NOT CONFIGURED'}`, `BINDINGS / ${leases.length ? leases.map((lease) => `${lease.clientId}=${lease.address}`).join(' / ') : 'NONE'}`];
  }
  if (node.id === 'r-1') return [`RELAY / ${configuration['dhcp.relay'] ?? 'NOT CONFIGURED'}`, `SERVER PATH / ${configuration['dhcp.serverReachable'] === true ? 'REACHABLE' : 'NOT VERIFIED'}`];
  if (node.id === 'pc-a' || node.id === 'pc-b') { const lease = leases.find((item) => item.clientId === node.label); return [`CLIENT ID / ${node.label}`, `ADDRESS / ${lease?.address ?? 'NOT LEASED YET'}`]; }
  if (node.id === 'sw-1') return ['ACCESS VLAN / 20', 'BROADCASTS STAY INSIDE VLAN 20'];
  return [];
}

export function OperationsLabTopology({ definition, mode, session, stageId, finished }: { definition: OperationsLabDefinition; mode: ResponsiveMode; session: OperationsSimulationSession; stageId?: string; finished: boolean }) {
  const topology = definition.visualTopology;
  const [selectedId, setSelectedId] = useState(topology.nodes[0]?.id);
  const selected = topology.nodes.find((node) => node.id === selectedId) ?? topology.nodes[0];
  const positions = Object.fromEntries(topology.nodes.map((node) => [node.id, node[mode]]));
  const compact = mode === 'compact';
  const height = compact ? Math.max(420, topology.nodes.length * 126) : 290;
  const traceText = session.evidence[session.traceIndex]?.text;
  return <View style={styles.section}>
    <View><Text variant="label" style={styles.green}>FIXED INTERACTIVE TOPOLOGY</Text><Text variant="bodySmall" style={styles.muted}>Tap a device to inspect its role and current state. Configuration happens in the guided inspector below.</Text></View>
    <View accessibilityLabel={topology.description} style={[styles.canvas, { height }]} testID="operations-topology-canvas">
      <Svg accessibilityElementsHidden height="100%" importantForAccessibility="no-hide-descendants" preserveAspectRatio="none" style={styles.cables} testID="operations-topology-cables" viewBox="0 0 100 100" width="100%">
        {topology.links.map((link) => { const a = positions[link.a]; const b = positions[link.b]; return a && b ? <Line key={link.id} stroke={traceText ? Palette.accentBright : Palette.accent} strokeLinecap="square" strokeWidth={traceText ? 1.35 : 0.85} x1={a.x} x2={b.x} y1={a.y} y2={b.y} /> : null; })}
      </Svg>
      {topology.nodes.map((node) => { const point = node[mode]; const selectedNode = selected?.id === node.id; return <Pressable key={node.id} accessibilityHint="Shows this device's role and current lab state" accessibilityLabel={`${node.label}, ${node.detail}${selectedNode ? ', selected' : ''}`} accessibilityRole="button" accessibilityState={{ selected: selectedNode }} onPress={() => setSelectedId(node.id)} style={[styles.node, { left: `${point.x}%`, top: `${point.y}%` }, selectedNode && styles.nodeSelected]}><NodeImage node={node} /><Text variant="technical" style={styles.nodeLabel}>{node.label}</Text><Text variant="technical" style={styles.nodeDetail}>{node.detail}</Text></Pressable>; })}
    </View>
    <View style={styles.links}><Text variant="label" style={styles.green}>CABLES AND PORTS</Text>{topology.links.map((link) => <Text key={link.id} variant="technical" style={styles.muted}>{topology.nodes.find((node) => node.id === link.a)?.label} {link.aPort} ↔ {topology.nodes.find((node) => node.id === link.b)?.label} {link.bPort}</Text>)}</View>
    {selected ? <View accessibilityLiveRegion="polite" style={styles.inspector}><View style={styles.inspectorHeading}><NodeImage node={selected} /><View style={styles.inspectorCopy}><Text variant="label" style={styles.orange}>SELECTED / {selected.label}</Text><Text variant="bodySmall">{selected.role}</Text></View></View>{definition.id === 'dhcp-lease-desk' ? dhcpState(selected, session).map((line) => <Text key={line} variant="technical" style={styles.state}>{line}</Text>) : <Text variant="technical" style={styles.state}>{finished ? 'LAB STATE / VERIFIED' : `CURRENT TASK / ${stageId?.replaceAll('-', ' ').toUpperCase() ?? 'INSPECT'}`}</Text>}{traceText ? <Text variant="bodySmall" style={styles.trace}>CURRENT EVIDENCE / {traceText}</Text> : null}</View> : null}
  </View>;
}

const NODE_WIDTH = 118;
const styles = StyleSheet.create({
  section: { minWidth: 0, gap: Space.sm, padding: Space.md, borderWidth: 1, borderColor: Palette.border, marginBottom: Space.md }, green: { color: Palette.green, fontFamily: Fonts.semibold }, orange: { color: Palette.orange, fontFamily: Fonts.semibold }, muted: { color: Palette.textMuted },
  canvas: { minWidth: 0, width: '100%', position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface }, cables: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  node: { position: 'absolute', width: NODE_WIDTH, minHeight: 104, marginLeft: -(NODE_WIDTH / 2), marginTop: -52, padding: 4, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background }, nodeSelected: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft }, server: { width: 52, height: 52 }, nodeLabel: { color: Palette.text, textAlign: 'center', fontFamily: Fonts.semibold }, nodeDetail: { color: Palette.textMuted, textAlign: 'center' },
  links: { minWidth: 0, gap: Space.xs, padding: Space.sm, borderWidth: 1, borderColor: Palette.border }, inspector: { minWidth: 0, gap: Space.sm, padding: Space.md, borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.surface }, inspectorHeading: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm }, inspectorCopy: { flex: 1, minWidth: 0, gap: Space.xs }, state: { color: Palette.text, padding: Space.sm, borderWidth: 1, borderColor: Palette.border }, trace: { color: Palette.orange, borderLeftWidth: 2, borderLeftColor: Palette.orange, paddingLeft: Space.sm },
});
