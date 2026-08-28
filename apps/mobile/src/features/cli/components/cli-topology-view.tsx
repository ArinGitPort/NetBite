import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import {
  deriveConnectedRoutes,
  deriveCliLinkContext,
  prefixToSubnetMask,
  type CliDeviceState,
  type CliNetworkState,
  type PingSimulation,
} from '@/core/network/cli-simulator';
import { calculateSubnetRange } from '@/core/network/advanced-networking';
import type { CliTopologyLayout } from '@/features/cli/cli-lab-definitions';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { DisclosureSection } from '@/shared/components/disclosure-section';
import { LinkConnectionRecord } from '@/shared/components/link-connection-record';
import { calculateTopologyLabelLayout, TopologyLinkLabels } from '@/shared/components/topology-link-labels';
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
    reason: ping.success ? 'The Echo request and return path both succeeded in this test.' : ping.reverse && !ping.reverse.success ? `The forward path arrived, but the return path stopped: ${ping.reverse.reason.replaceAll('-', ' ')}.` : `The forward path stopped: ${ping.forward.reason.replaceAll('-', ' ')}.`,
    forwardDeviceIds: expandHops(network, ping.forward.hops),
    reverseDeviceIds: expandHops(network, ping.reverse?.hops ?? []),
  };
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

function DetailField({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailField}><Text variant="bodySmall" style={styles.detailLabel}>{label}</Text><Text selectable variant="technical" style={styles.detailValue}>{value}</Text></View>;
}

function InterfaceRecord({ device, network, item }: { device: CliDeviceState; network: CliNetworkState; item: CliDeviceState['interfaces'][number] }) {
  const range = item.ipv4 && item.prefix !== undefined ? calculateSubnetRange(item.ipv4, item.prefix) : undefined;
  return <View style={styles.record}>
    <Text variant="label" style={styles.strong}>INTERFACE {item.name}</Text>
    <DetailField label="State" value={item.adminUp && item.linkUp ? 'Up' : 'Down'} />
    {item.ipv4 && item.prefix !== undefined ? <>
      <DetailField label="IPv4 address" value={item.ipv4} />
      <DetailField label="Prefix length" value={`/${item.prefix}`} />
      <DetailField label="Subnet mask" value={prefixToSubnetMask(item.prefix) ?? 'Invalid prefix'} />
      <DetailField label="Network" value={range ? `${range.network}/${item.prefix}` : 'Invalid address'} />
    </> : <DetailField label="IPv4 address" value="Not configured" />}
    {device.type === 'switch' ? <>
      <DetailField label="Switchport mode" value={item.switchportMode ? item.switchportMode.toUpperCase() : 'Not configured'} />
      {item.switchportMode === 'access' ? <DetailField label="Access VLAN" value={String(item.accessVlan ?? 'Not configured')} /> : null}
      {item.switchportMode === 'trunk' ? <DetailField label="Allowed VLANs" value={item.allowedVlans?.join(', ') || 'Not configured'} /> : null}
    </> : null}
    <DetailField label="Connected to" value={connectedEndpoint(network, device.id, item.name)} />
  </View>;
}

function RouteRecord({ route }: { route: CliDeviceState['routes'][number] }) {
  return <View style={styles.record}>
    <Text variant="label" style={styles.strong}>{route.source === 'static' ? 'STATIC ROUTE' : route.source === 'connected' ? 'CONNECTED ROUTE' : 'DEFAULT ROUTE'}</Text>
    <DetailField label="Destination" value={`${route.prefix}/${route.prefixLength}`} />
    <DetailField label="Subnet mask" value={prefixToSubnetMask(route.prefixLength) ?? 'Invalid prefix'} />
    {route.nextHop ? <DetailField label="Next hop" value={route.nextHop} /> : null}
    {route.exitInterface ? <DetailField label="Exit interface" value={route.exitInterface} /> : null}
  </View>;
}

function DeviceInspector({ device, network, cliAvailable, onOpenCli }: { device: CliDeviceState; network: CliNetworkState; cliAvailable: boolean; onOpenCli: () => void }) {
  const connectedRoutes = device.type === 'router' ? deriveConnectedRoutes(device) : [];
  return (
    <View accessibilityLabel={`${device.name} configuration inspector`} style={styles.inspector}>
      <View style={styles.inspectorHeading}>
        <DeviceGlyph size={56} type={device.type === 'host' ? 'pc' : device.type} />
        <View style={styles.inspectorHeadingCopy}><Text variant="label" style={styles.orange}>SELECTED DEVICE</Text><Text variant="sectionHeading" style={styles.inspectorTitle}>{device.name} — {device.type === 'host' ? 'PC' : device.type.toUpperCase()}</Text></View>
      </View>
      {device.type === 'host' ? <View style={styles.record}><Text variant="label" style={styles.recordTitle}>HOST CONFIGURATION</Text><DetailField label="Default gateway" value={defaultGateway(device) ?? 'Not configured'} /></View> : null}
      {device.type === 'switch' ? <View style={styles.record}><Text variant="label" style={styles.recordTitle}>VLAN DATABASE</Text><DetailField label="Available VLANs" value={device.vlans.length ? device.vlans.map((vlan) => `VLAN ${vlan}`).join(', ') : 'Not configured'} /></View> : null}
      <View style={styles.recordGroup}>
        <Text variant="label" style={styles.recordTitle}>INTERFACES</Text>
        {device.interfaces.length ? device.interfaces.map((item) => <InterfaceRecord key={item.name} device={device} item={item} network={network} />) : <Text variant="technical">NOT CONFIGURED</Text>}
      </View>
      {device.type === 'router' ? <View style={styles.recordGroup}><Text variant="label" style={styles.recordTitle}>CONNECTED NETWORKS</Text>{connectedRoutes.length ? connectedRoutes.map((route) => <RouteRecord key={`${route.prefix}-${route.exitInterface}`} route={route} />) : <Text variant="technical">NOT CONFIGURED</Text>}</View> : null}
      {device.type !== 'switch' ? <View style={styles.recordGroup}><Text variant="label" style={styles.recordTitle}>ROUTING TABLE</Text>{device.routes.length ? device.routes.map((route, index) => <RouteRecord key={`${route.prefix}-${route.nextHop}-${index}`} route={route} />) : <Text variant="technical">NO ROUTES INSTALLED</Text>}</View> : null}
      {device.type === 'switch' ? <View style={styles.recordGroup}><Text variant="label" style={styles.recordTitle}>MAC ADDRESS TABLE</Text>{device.macEntries?.length ? device.macEntries.map((entry) => <View key={`${entry.vlan}-${entry.macAddress}`} style={styles.record}><DetailField label="VLAN" value={String(entry.vlan)} /><DetailField label="MAC address" value={entry.macAddress} /><DetailField label="Interface" value={entry.interfaceName} /></View>) : <Text variant="technical">NO LEARNED ENTRIES</Text>}</View> : null}
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
  const { fontScale } = useWindowDimensions();
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [viewportWidth, setViewportWidth] = useState(0);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const selected = network.devices.find((device) => device.id === selectedDeviceId) ?? network.devices[0];
  const activePairs = [...tracePairs(trace?.forwardDeviceIds ?? []), ...tracePairs(trace?.reverseDeviceIds ?? [])];
  const activeIds = new Set([...(trace?.forwardDeviceIds ?? []), ...(trace?.reverseDeviceIds ?? [])]);
  const failedId = trace && !trace.success ? (trace.reverseDeviceIds.at(-1) ?? trace.forwardDeviceIds.at(-1)) : undefined;
  const isActiveLink = (a: string, b: string) => activePairs.some(([left, right]) => (left === a && right === b) || (left === b && right === a));
  const authoredWidth = layout.width[mode];
  const canvasWidth = Math.max(authoredWidth, viewportWidth);
  const canPan = viewportWidth > 0 && canvasWidth > viewportWidth;
  const topologyLabelLayout = useMemo(() => {
    if (canvasSize.width <= 0 || canvasSize.height <= 0) return {};
    return calculateTopologyLabelLayout({
      canvas: canvasSize,
      fontScale,
      nodes: network.devices.flatMap((device) => {
        const point = positions[device.id];
        return point ? [{ id: device.id, point: { x: canvasSize.width * point.x / 100, y: canvasSize.height * point.y / 100 }, bounds: { halfWidth: NODE_WIDTH / 2, halfHeight: 42 } }] : [];
      }),
      links: network.links.flatMap((link) => {
        const id = `${link.aDeviceId}-${link.aInterface}-${link.bDeviceId}-${link.bInterface}`;
        const context = deriveCliLinkContext(network, link);
        const anchor = layout.linkCaptions?.[id]?.[mode];
        return anchor ? [{ id, fromDeviceId: link.aDeviceId, toDeviceId: link.bDeviceId, fromLabel: link.aInterface, toLabel: link.bInterface, contextLabel: context.label, anchor }] : [];
      }),
    });
  }, [canvasSize, fontScale, layout.linkCaptions, mode, network, positions]);

  useEffect(() => {
    const point = positions[selectedDeviceId];
    if (!point || !viewportWidth || !canvasWidth) return;
    const targetX = canvasWidth * point.x / 100 - viewportWidth / 2;
    horizontalScrollRef.current?.scrollTo({ x: Math.max(0, Math.min(canvasWidth - viewportWidth, targetX)), animated: false });
  }, [canvasWidth, positions, selectedDeviceId, viewportWidth]);

  return (
    <View style={styles.topologySection}>
      {canPan ? <Text variant="technical" style={styles.panCue}>SCROLL TO FOLLOW THE NETWORK PATH</Text> : null}
      <View onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)} style={styles.viewport} testID="cli-topology-viewport">
      <ScrollView accessibilityLabel="Scrollable network topology" directionalLockEnabled horizontal nestedScrollEnabled ref={horizontalScrollRef} scrollEnabled={canPan} showsHorizontalScrollIndicator={canPan} style={styles.horizontalScroll} testID="cli-topology-scroll">
      <View accessibilityLabel={layout.description} onLayout={(event) => setCanvasSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })} style={[styles.canvas, { height: layout.height[mode], width: canvasWidth }]} testID="cli-topology-canvas">
        <Svg accessibilityElementsHidden height="100%" importantForAccessibility="no-hide-descendants" preserveAspectRatio="none" style={styles.cables} testID="cli-topology-cables" viewBox="0 0 100 100" width="100%">
          {network.links.map((link) => {
            const from = positions[link.aDeviceId]; const to = positions[link.bDeviceId];
            if (!from || !to) return null;
            const active = isActiveLink(link.aDeviceId, link.bDeviceId);
            return <Line key={`${link.aDeviceId}-${link.aInterface}-${link.bDeviceId}-${link.bInterface}`} stroke={active ? Palette.accentBright : Palette.accent} strokeLinecap="square" strokeOpacity={active ? 1 : 0.82} strokeWidth={active ? 1.4 : 0.85} x1={from.x} x2={to.x} y1={from.y} y2={to.y} />;
          })}
        </Svg>
        {canvasSize.width > 0 && canvasSize.height > 0 ? network.links.map((link) => {
          const from = positions[link.aDeviceId]; const to = positions[link.bDeviceId];
          if (!from || !to) return null;
          const fromName = network.devices.find((device) => device.id === link.aDeviceId)?.name ?? link.aDeviceId;
          const toName = network.devices.find((device) => device.id === link.bDeviceId)?.name ?? link.bDeviceId;
          const context = deriveCliLinkContext(network, link);
          const id = `${link.aDeviceId}-${link.aInterface}-${link.bDeviceId}-${link.bInterface}`;
          const contextLabel = context.label;
          return <TopologyLinkLabels
            key={`${id}-labels`}
            accessibilityLabel={`Cable from ${fromName} ${link.aInterface} to ${toName} ${link.bInterface}. ${context.label}.`}
            from={{ x: canvasSize.width * from.x / 100, y: canvasSize.height * from.y / 100 }}
            fromBounds={{ halfWidth: NODE_WIDTH / 2, halfHeight: 42 }}
            fromLabel={link.aInterface}
            id={id}
            contextLabel={contextLabel}
            contextTone={context.tone === 'warning' ? 'warning' : 'normal'}
            resolvedLayout={topologyLabelLayout[id]}
            to={{ x: canvasSize.width * to.x / 100, y: canvasSize.height * to.y / 100 }}
            toBounds={{ halfWidth: NODE_WIDTH / 2, halfHeight: 42 }}
            toLabel={link.bInterface}
          />;
        }) : null}
        {network.devices.map((device) => {
          const point = positions[device.id]; if (!point) return null;
          const primary = device.interfaces.find((item) => item.ipv4);
          const detail = device.type === 'host' ? (primary?.ipv4 ? `${primary.ipv4}/${primary.prefix}` : 'IP NOT SET') : device.type === 'router' ? `${device.interfaces.length} INTERFACES` : `${device.vlans.length} VLAN${device.vlans.length === 1 ? '' : 'S'}`;
          return <Pressable key={device.id} accessibilityHint="Shows this device's current configuration" accessibilityLabel={`${device.name}, ${device.type}, ${detail}${device.id === selected.id ? ', selected' : ''}`} accessibilityRole="button" accessibilityState={{ selected: device.id === selected.id }} onPress={() => onSelectDevice(device.id)} style={[styles.node, { left: `${point.x}%`, top: `${point.y}%` }, device.id === selected.id && styles.nodeSelected, activeIds.has(device.id) && styles.nodeTrace, failedId === device.id && styles.nodeFailed]} testID={`cli-topology-node-${device.id}`}>
            <DeviceGlyph size={52} type={device.type === 'host' ? 'pc' : device.type} />
            <Text variant="technical" style={styles.nodeName}>{device.name}</Text>
          </Pressable>;
        })}
      </View>
      </ScrollView>
      </View>
      <DisclosureSection title="LINK DETAILS" summary="Device ports, link context, and current operational state.">{network.links.map((link, index) => {
        const context = deriveCliLinkContext(network, link);
        const aName = network.devices.find((item) => item.id === link.aDeviceId)?.name ?? link.aDeviceId;
        const bName = network.devices.find((item) => item.id === link.bDeviceId)?.name ?? link.bDeviceId;
        return <LinkConnectionRecord key={`${link.aDeviceId}-${link.aInterface}-${link.bDeviceId}-${link.bInterface}`} index={index + 1} a={{ deviceName: aName, interfaceName: link.aInterface }} b={{ deviceName: bName, interfaceName: link.bInterface }} context={context.kind === 'operational' ? context.networkLabel : context.label} state={context.kind === 'operational' ? context.label : context.tone === 'warning' ? 'ATTENTION' : 'UP'} />;
      })}</DisclosureSection>
      {trace ? <View accessibilityLiveRegion="polite" style={[styles.tracePanel, trace.success ? styles.traceSuccess : styles.traceWarning]}><Text variant="label" style={trace.success ? styles.green : styles.orange}>{trace.success ? 'PING PATH VERIFIED' : 'PING PATH STOPPED'}</Text><Text variant="bodySmall">TARGET / {trace.destination}</Text><Text variant="technical">FORWARD / {trace.forwardDeviceIds.map((id) => network.devices.find((device) => device.id === id)?.name ?? id).join(' → ') || 'NO PATH'}</Text>{trace.reverseDeviceIds.length ? <Text variant="technical">RETURN / {trace.reverseDeviceIds.map((id) => network.devices.find((device) => device.id === id)?.name ?? id).join(' → ')}</Text> : null}<Text variant="bodySmall">{trace.reason}</Text></View> : null}
      <View testID="cli-device-inspector"><DeviceInspector cliAvailable={cliDeviceIds.includes(selected.id)} device={selected} network={network} onOpenCli={() => onOpenCli(selected.id)} /></View>
    </View>
  );
}

const NODE_WIDTH = 104;
const styles = StyleSheet.create({
  topologySection: { width: '100%', minWidth: 0, gap: Space.sm },
  viewport: { width: '100%', minWidth: 0, overflow: 'hidden' },
  horizontalScroll: { width: '100%' },
  panCue: { color: Palette.orange },
  canvas: { width: '100%', minWidth: 0, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  cables: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
  node: { position: 'absolute', zIndex: 4, width: NODE_WIDTH, minHeight: 84, marginLeft: -(NODE_WIDTH / 2), marginTop: -42, alignItems: 'center', justifyContent: 'center', padding: 4, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
  nodeSelected: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  nodeTrace: { borderColor: Palette.accentBright },
  nodeFailed: { borderColor: Palette.danger, borderWidth: 2 },
  nodeName: { color: Palette.text, fontFamily: Fonts.semibold, textAlign: 'center' },
  inspector: { padding: Space.md, gap: Space.sm, borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.surface },
  inspectorHeading: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  inspectorHeadingCopy: { flex: 1, minWidth: 0 },
  inspectorTitle: { color: Palette.text, fontFamily: Fonts.semibold },
  recordGroup: { gap: Space.xs },
  record: { minWidth: 0, padding: Space.sm, gap: 2, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
  recordTitle: { color: Palette.green, fontFamily: Fonts.semibold },
  strong: { color: Palette.text, fontFamily: Fonts.semibold },
  detailField: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: Space.sm },
  detailLabel: { minWidth: 112, flexShrink: 0, color: Palette.textMuted },
  detailValue: { minWidth: 0, flex: 1, color: Palette.text },
  muted: { color: Palette.textMuted },
  orange: { color: Palette.orange, fontFamily: Fonts.medium },
  green: { color: Palette.green, fontFamily: Fonts.medium },
  tracePanel: { padding: Space.sm, gap: Space.xs, borderWidth: 1 },
  traceSuccess: { borderColor: Palette.green, backgroundColor: Palette.greenSoft },
  traceWarning: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
});
