import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import {
  deriveConnectedRoutes,
  type CliDeviceState,
  type CliNetworkState,
  type PingSimulation,
} from '@/core/network/cli-simulator';
import type { CliTopologyLayout } from '@/features/cli/cli-lab-definitions';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import type { ResponsiveMode } from '@/shared/responsive-layout';
import { Fonts, Palette, Space } from '@/shared/theme';

export interface CliVisualTrace {
  destination: string;
  success: boolean;
  reason: string;
  forwardDeviceIds: string[];
  reverseDeviceIds: string[];
}

function deviceIdFromHop(network: CliNetworkState, hop: string) {
  return network.devices.find((device) => device.name === hop)?.id;
}

function shortestLinkedPath(network: CliNetworkState, startId: string, endId: string) {
  if (startId === endId) return [startId];
  const queue: string[][] = [[startId]];
  const visited = new Set([startId]);
  while (queue.length) {
    const path = queue.shift()!;
    const current = path.at(-1)!;
    const neighbors = network.links.flatMap((link) => link.aDeviceId === current ? [link.bDeviceId] : link.bDeviceId === current ? [link.aDeviceId] : []);
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      const next = [...path, neighbor];
      if (neighbor === endId) return next;
      visited.add(neighbor);
      queue.push(next);
    }
  }
  return [startId];
}

function expandHops(network: CliNetworkState, hops: string[]) {
  const ids = hops.map((hop) => deviceIdFromHop(network, hop)).filter((id): id is string => Boolean(id));
  if (ids.length < 2) return ids;
  return ids.slice(1).reduce<string[]>((path, destinationId) => {
    const segment = shortestLinkedPath(network, path.at(-1)!, destinationId);
    return [...path, ...segment.slice(1)];
  }, [ids[0]]);
}

export function createCliVisualTrace(network: CliNetworkState, ping: PingSimulation, destination: string): CliVisualTrace {
  return {
    destination,
    success: ping.success,
    reason: ping.success ? 'The modeled Echo request and return path both succeeded.' : ping.reverse && !ping.reverse.success ? `The forward path arrived, but the return path stopped: ${ping.reverse.reason.replaceAll('-', ' ')}.` : `The forward path stopped: ${ping.forward.reason.replaceAll('-', ' ')}.`,
    forwardDeviceIds: expandHops(network, ping.forward.hops),
    reverseDeviceIds: expandHops(network, ping.reverse?.hops ?? []),
  };
}

function routeLabel(route: CliDeviceState['routes'][number]) {
  const destination = `${route.prefix}/${route.prefixLength}`;
  if (route.nextHop) return `${route.source.toUpperCase()} ${destination} VIA ${route.nextHop}`;
  return `${route.source.toUpperCase()} ${destination}${route.exitInterface ? ` / ${route.exitInterface}` : ''}`;
}

function defaultGateway(device: CliDeviceState) {
  return device.routes.find((route) => route.prefixLength === 0)?.nextHop;
}

function connectedEndpoint(network: CliNetworkState, deviceId: string, interfaceName: string) {
  const link = network.links.find((candidate) =>
    (candidate.aDeviceId === deviceId && candidate.aInterface === interfaceName)
    || (candidate.bDeviceId === deviceId && candidate.bInterface === interfaceName));
  if (!link) return 'NOT CONNECTED';
  const remoteId = link.aDeviceId === deviceId ? link.bDeviceId : link.aDeviceId;
  const remoteInterface = link.aDeviceId === deviceId ? link.bInterface : link.aInterface;
  return `${network.devices.find((candidate) => candidate.id === remoteId)?.name ?? remoteId} ${remoteInterface}`;
}

function DeviceInspector({ device, network, cliAvailable, onOpenCli }: { device: CliDeviceState; network: CliNetworkState; cliAvailable: boolean; onOpenCli: () => void }) {
  const connectedRoutes = device.type === 'router' ? deriveConnectedRoutes(device) : [];
  return (
    <View accessibilityLabel={`${device.name} configuration inspector`} style={styles.inspector}>
      <View style={styles.inspectorHeading}>
        <DeviceGlyph size={56} type={device.type === 'host' ? 'pc' : device.type} />
        <View style={styles.inspectorHeadingCopy}><Text variant="label" style={styles.orange}>SELECTED DEVICE</Text><Text variant="sectionHeading" style={styles.inspectorTitle}>{device.name} / {device.type === 'host' ? 'PC' : device.type.toUpperCase()}</Text></View>
      </View>
      {device.type === 'host' ? <View style={styles.record}><Text variant="label" style={styles.recordTitle}>HOST CONFIGURATION</Text><Text variant="technical">DEFAULT GATEWAY / {defaultGateway(device) ?? 'NOT CONFIGURED'}</Text></View> : null}
      {device.type === 'switch' ? <View style={styles.record}><Text variant="label" style={styles.recordTitle}>VLAN DATABASE</Text><Text variant="technical">{device.vlans.length ? device.vlans.map((vlan) => `VLAN ${vlan}`).join(' / ') : 'NOT CONFIGURED'}</Text></View> : null}
      <View style={styles.recordGroup}>
        <Text variant="label" style={styles.recordTitle}>INTERFACES</Text>
        {device.interfaces.length ? device.interfaces.map((item) => (
          <View key={item.name} style={styles.record}>
            <Text variant="technical" style={styles.strong}>{item.name} / {item.adminUp && item.linkUp ? 'UP' : 'DOWN'}</Text>
            <Text variant="technical">IP / {item.ipv4 ? `${item.ipv4}/${item.prefix}` : 'NOT CONFIGURED'}</Text>
            {device.type === 'switch' ? <Text variant="technical">SWITCHPORT / {item.switchportMode ? item.switchportMode.toUpperCase() : 'NOT CONFIGURED'}{item.switchportMode === 'access' ? ` / VLAN ${item.accessVlan ?? 'NOT CONFIGURED'}` : item.switchportMode === 'trunk' ? ` / ALLOWED ${item.allowedVlans?.join(',') || 'NOT CONFIGURED'}` : ''}</Text> : null}
            <Text variant="technical">LINK / {connectedEndpoint(network, device.id, item.name)}</Text>
          </View>
        )) : <Text variant="technical">NOT CONFIGURED</Text>}
      </View>
      {device.type === 'router' ? <View style={styles.recordGroup}><Text variant="label" style={styles.recordTitle}>CONNECTED NETWORKS</Text>{connectedRoutes.length ? connectedRoutes.map((route) => <Text key={`${route.prefix}-${route.exitInterface}`} variant="technical">{routeLabel(route)}</Text>) : <Text variant="technical">NOT CONFIGURED</Text>}</View> : null}
      {device.type !== 'switch' ? <View style={styles.recordGroup}><Text variant="label" style={styles.recordTitle}>ROUTING TABLE</Text>{device.routes.length ? device.routes.map((route, index) => <Text key={`${route.prefix}-${route.nextHop}-${index}`} variant="technical">{routeLabel(route)}</Text>) : <Text variant="technical">NO ROUTES INSTALLED</Text>}</View> : null}
      {device.type === 'switch' ? <View style={styles.recordGroup}><Text variant="label" style={styles.recordTitle}>MAC ADDRESS TABLE</Text>{device.macEntries?.length ? device.macEntries.map((entry) => <Text key={`${entry.vlan}-${entry.macAddress}`} variant="technical">VLAN {entry.vlan} / {entry.macAddress} / {entry.interfaceName}</Text>) : <Text variant="technical">NO LEARNED ENTRIES</Text>}</View> : null}
      {cliAvailable ? <AppButton label={`Open CLI on ${device.name}`} onPress={onOpenCli} /> : <Text variant="technical" style={styles.muted}>INSPECTION ONLY / THIS GUIDED LAB DOES NOT OPEN A CONSOLE ON THIS DEVICE.</Text>}
    </View>
  );
}

function tracePairs(ids: string[]) {
  return ids.slice(1).map((id, index) => [ids[index], id] as const);
}

export function CliTopologyView({ network, layout, mode, selectedDeviceId, cliDeviceIds, trace, onSelectDevice, onOpenCli }: {
  network: CliNetworkState;
  layout: CliTopologyLayout;
  mode: ResponsiveMode;
  selectedDeviceId: string;
  cliDeviceIds: string[];
  trace?: CliVisualTrace;
  onSelectDevice: (deviceId: string) => void;
  onOpenCli: (deviceId: string) => void;
}) {
  const positions = layout[mode];
  const selected = network.devices.find((device) => device.id === selectedDeviceId) ?? network.devices[0];
  const activePairs = [...tracePairs(trace?.forwardDeviceIds ?? []), ...tracePairs(trace?.reverseDeviceIds ?? [])];
  const activeIds = new Set([...(trace?.forwardDeviceIds ?? []), ...(trace?.reverseDeviceIds ?? [])]);
  const failedId = trace && !trace.success ? (trace.reverseDeviceIds.at(-1) ?? trace.forwardDeviceIds.at(-1)) : undefined;
  const isActiveLink = (a: string, b: string) => activePairs.some(([left, right]) => (left === a && right === b) || (left === b && right === a));

  return (
    <View style={styles.topologySection}>
      <View accessibilityLabel={layout.description} style={[styles.canvas, { height: layout.height[mode] }]} testID="cli-topology-canvas">
        <Svg accessibilityElementsHidden height="100%" importantForAccessibility="no-hide-descendants" preserveAspectRatio="none" style={styles.cables} testID="cli-topology-cables" viewBox="0 0 100 100" width="100%">
          {network.links.map((link) => {
            const from = positions[link.aDeviceId]; const to = positions[link.bDeviceId];
            if (!from || !to) return null;
            const active = isActiveLink(link.aDeviceId, link.bDeviceId);
            return <Line key={`${link.aDeviceId}-${link.aInterface}-${link.bDeviceId}-${link.bInterface}`} stroke={active ? Palette.accentBright : Palette.accent} strokeLinecap="square" strokeOpacity={active ? 1 : 0.82} strokeWidth={active ? 1.4 : 0.85} x1={from.x} x2={to.x} y1={from.y} y2={to.y} />;
          })}
        </Svg>
        {network.devices.map((device) => {
          const point = positions[device.id]; if (!point) return null;
          const primary = device.interfaces.find((item) => item.ipv4);
          const detail = device.type === 'host' ? (primary?.ipv4 ? `${primary.ipv4}/${primary.prefix}` : 'IP NOT SET') : device.type === 'router' ? `${device.interfaces.length} INTERFACES` : `${device.vlans.length} VLAN${device.vlans.length === 1 ? '' : 'S'}`;
          return <Pressable key={device.id} accessibilityHint="Shows this device's current configuration" accessibilityLabel={`${device.name}, ${device.type}, ${detail}${device.id === selected.id ? ', selected' : ''}`} accessibilityRole="button" accessibilityState={{ selected: device.id === selected.id }} onPress={() => onSelectDevice(device.id)} style={[styles.node, { left: `${point.x}%`, top: `${point.y}%` }, device.id === selected.id && styles.nodeSelected, activeIds.has(device.id) && styles.nodeTrace, failedId === device.id && styles.nodeFailed]}>
            <DeviceGlyph size={52} type={device.type === 'host' ? 'pc' : device.type} />
            <Text variant="technical" style={styles.nodeName}>{device.name}</Text>
            {device.type === 'host' && primary?.ipv4 ? <View style={styles.nodeAddress}><Text variant="technical" style={styles.nodeDetail}>{primary.ipv4}</Text><Text variant="technical" style={styles.nodePrefix}>/{primary.prefix}</Text></View> : <Text variant="technical" style={styles.nodeDetail}>{detail}</Text>}
          </Pressable>;
        })}
      </View>
      <View style={styles.connectionList}><Text variant="label" style={styles.recordTitle}>PHYSICAL LINKS</Text>{network.links.map((link) => <Text key={`${link.aDeviceId}-${link.aInterface}-${link.bDeviceId}-${link.bInterface}`} variant="technical">{network.devices.find((item) => item.id === link.aDeviceId)?.name} {link.aInterface} ↔ {network.devices.find((item) => item.id === link.bDeviceId)?.name} {link.bInterface}</Text>)}</View>
      {trace ? <View accessibilityLiveRegion="polite" style={[styles.tracePanel, trace.success ? styles.traceSuccess : styles.traceWarning]}><Text variant="label" style={trace.success ? styles.green : styles.orange}>{trace.success ? 'PING PATH VERIFIED' : 'PING PATH STOPPED'}</Text><Text variant="bodySmall">TARGET / {trace.destination}</Text><Text variant="technical">FORWARD / {trace.forwardDeviceIds.map((id) => network.devices.find((device) => device.id === id)?.name ?? id).join(' → ') || 'NO PATH'}</Text>{trace.reverseDeviceIds.length ? <Text variant="technical">RETURN / {trace.reverseDeviceIds.map((id) => network.devices.find((device) => device.id === id)?.name ?? id).join(' → ')}</Text> : null}<Text variant="bodySmall">{trace.reason}</Text></View> : null}
      <View testID="cli-device-inspector"><DeviceInspector cliAvailable={cliDeviceIds.includes(selected.id)} device={selected} network={network} onOpenCli={() => onOpenCli(selected.id)} /></View>
    </View>
  );
}

const NODE_WIDTH = 104;
const styles = StyleSheet.create({
  topologySection: { width: '100%', minWidth: 0, gap: Space.sm },
  canvas: { width: '100%', minWidth: 0, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  cables: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
  node: { position: 'absolute', width: NODE_WIDTH, minHeight: 92, marginLeft: -(NODE_WIDTH / 2), marginTop: -46, alignItems: 'center', justifyContent: 'center', padding: 4, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
  nodeSelected: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  nodeTrace: { borderColor: Palette.accentBright },
  nodeFailed: { borderColor: Palette.danger, borderWidth: 2 },
  nodeName: { color: Palette.text, fontFamily: Fonts.semibold, textAlign: 'center' },
  nodeDetail: { color: Palette.textMuted, textAlign: 'center' },
  nodeAddress: { maxWidth: '100%', alignItems: 'center' },
  nodePrefix: { color: Palette.green, textAlign: 'center' },
  connectionList: { padding: Space.sm, gap: Space.xs, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  inspector: { padding: Space.md, gap: Space.sm, borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.surface },
  inspectorHeading: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  inspectorHeadingCopy: { flex: 1, minWidth: 0 },
  inspectorTitle: { color: Palette.text, fontFamily: Fonts.semibold },
  recordGroup: { gap: Space.xs },
  record: { minWidth: 0, padding: Space.sm, gap: 2, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
  recordTitle: { color: Palette.green, fontFamily: Fonts.semibold },
  strong: { color: Palette.text, fontFamily: Fonts.semibold },
  muted: { color: Palette.textMuted },
  orange: { color: Palette.orange, fontFamily: Fonts.medium },
  green: { color: Palette.green, fontFamily: Fonts.medium },
  tracePanel: { padding: Space.sm, gap: Space.xs, borderWidth: 1 },
  traceSuccess: { borderColor: Palette.green, backgroundColor: Palette.greenSoft },
  traceWarning: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
});
