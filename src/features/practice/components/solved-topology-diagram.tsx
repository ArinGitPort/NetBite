import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Image } from 'expo-image';

import type { SolvedExampleTopology } from '@/features/practice/solved-lab-examples';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { Text } from '@/shared/components/console-text';
import { calculateTopologyLabelLayout, TopologyLinkLabels } from '@/shared/components/topology-link-labels';
import { Fonts, Palette, Space } from '@/shared/theme';

interface Point { x: number; y: number }

export function SolvedTopologyDiagram({ topology, selectedId, onSelect }: { topology: SolvedExampleTopology; selectedId?: string; onSelect: (id: string) => void }) {
  const { fontScale } = useWindowDimensions();
  const layout = useMemo(() => buildLayout(topology), [topology]);
  const labelLayout = useMemo(() => calculateTopologyLabelLayout({
    canvas: { width: layout.width, height: layout.height },
    fontScale,
    nodes: topology.nodes.map((node) => ({ id: node.id, point: layout.points[node.id], bounds: { halfWidth: 52, halfHeight: 46 } })).filter((node) => Boolean(node.point)),
    links: topology.links.filter((link) => link.fromInterface || link.toInterface).map((link) => ({
      id: link.id,
      fromDeviceId: link.from,
      toDeviceId: link.to,
      fromLabel: link.fromInterface ?? 'PORT',
      toLabel: link.toInterface ?? 'PORT',
      contextLabel: link.context,
      anchor: topology.layout?.captions[link.id] ?? (link.context ? { kind: 'link' as const, side: 'above' as const, gap: 36 } : undefined),
    })),
  }), [fontScale, layout, topology]);
  return <ScrollView accessibilityLabel={topology.description} horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.scroll}>
    <View style={[styles.canvas, { width: layout.width, height: layout.height }]}>
      <Svg accessible={false} pointerEvents="none" style={StyleSheet.absoluteFill} width={layout.width} height={layout.height}>
        {topology.links.map((link) => { const a = layout.points[link.from]; const b = layout.points[link.to]; return a && b ? <Line key={link.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={Palette.green} strokeWidth={3} /> : null; })}
      </Svg>
      {topology.links.map((link) => {
        const a = layout.points[link.from]; const b = layout.points[link.to];
        if (!a || !b || (!link.fromInterface && !link.toInterface)) return null;
        const fromName = topology.nodes.find((node) => node.id === link.from)?.label ?? link.from;
        const toName = topology.nodes.find((node) => node.id === link.to)?.label ?? link.to;
        return <TopologyLinkLabels
          key={`${link.id}-labels`}
          accessibilityLabel={`Connection from ${fromName} ${link.fromInterface ?? 'interface'} to ${toName} ${link.toInterface ?? 'interface'}. ${link.context ?? link.state ?? 'Connected'}.`}
          contextLabel={link.context}
          contextTone={link.state === 'ATTENTION' || link.state === 'LINK DOWN' ? 'warning' : 'normal'}
          from={a}
          fromBounds={{ halfWidth: 52, halfHeight: 46 }}
          fromLabel={link.fromInterface ?? 'PORT'}
          id={`solved-${link.id}`}
          resolvedLayout={labelLayout[link.id]}
          to={b}
          toBounds={{ halfWidth: 52, halfHeight: 46 }}
          toLabel={link.toInterface ?? 'PORT'}
        />;
      })}
      {topology.nodes.map((node) => { const point = layout.points[node.id]; if (!point) return null; return <Pressable key={node.id} accessibilityHint="Shows this device's completed configuration" accessibilityRole="button" accessibilityState={{ selected: selectedId === node.id }} onPress={() => onSelect(node.id)} style={[styles.node, { left: point.x - 52, top: point.y - 46 }, selectedId === node.id && styles.selected]}>
        {node.kind === 'server' ? <Image accessibilityIgnoresInvertColors contentFit="contain" source={require('@/assets/images/education/server-terminal-mobile.png')} style={styles.server} /> : <DeviceGlyph size={44} type={node.kind} />}
        <Text variant="technical" style={styles.nodeName}>{node.label}</Text>
      </Pressable>; })}
    </View>
  </ScrollView>;
}

function buildLayout(topology: SolvedExampleTopology) {
  if (topology.layout) return { width: topology.layout.width, height: topology.layout.height, points: topology.layout.nodes };
  const degree = Object.fromEntries(topology.nodes.map((node) => [node.id, 0])) as Record<string, number>;
  topology.links.forEach((link) => { degree[link.from] = (degree[link.from] ?? 0) + 1; degree[link.to] = (degree[link.to] ?? 0) + 1; });
  const hub = topology.nodes.reduce((best, node) => degree[node.id] > degree[best.id] ? node : best, topology.nodes[0]);
  if (hub && degree[hub.id] >= 3) {
    const width = 820; const height = 380; const points: Record<string, Point> = { [hub.id]: { x: width / 2, y: height / 2 } };
    const remaining = topology.nodes.filter((node) => node.id !== hub.id);
    remaining.forEach((node, index) => { const angle = (-Math.PI / 2) + (2 * Math.PI * index / remaining.length); points[node.id] = { x: width / 2 + Math.cos(angle) * 300, y: height / 2 + Math.sin(angle) * 135 }; });
    return { width, height, points };
  }
  const ordered = orderPath(topology);
  const width = Math.max(600, ordered.length * 240); const height = 300; const points: Record<string, Point> = {};
  ordered.forEach((node, index) => { points[node.id] = { x: 110 + index * 240, y: height / 2 + 28 }; });
  return { width, height, points };
}

function orderPath(topology: SolvedExampleTopology) {
  if (topology.nodes.length < 2) return topology.nodes;
  const neighbors = new Map<string, string[]>();
  topology.nodes.forEach((node) => neighbors.set(node.id, []));
  topology.links.forEach((link) => { neighbors.get(link.from)?.push(link.to); neighbors.get(link.to)?.push(link.from); });
  const start = topology.nodes.find((node) => neighbors.get(node.id)?.length === 1) ?? topology.nodes[0];
  const ordered = []; const visited = new Set<string>(); let current: string | undefined = start.id;
  while (current) { const node = topology.nodes.find((entry) => entry.id === current); if (node) ordered.push(node); visited.add(current); current = neighbors.get(current)?.find((id) => !visited.has(id)); }
  return ordered.length === topology.nodes.length ? ordered : topology.nodes;
}

const styles = StyleSheet.create({
  scroll: { minWidth: '100%' }, canvas: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
  node: { position: 'absolute', zIndex: 2, width: 104, minHeight: 92, padding: Space.xs, alignItems: 'center', justifyContent: 'center', gap: Space.xs, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surfaceRaised },
  server: { width: 44, height: 44 },
  selected: { borderWidth: 2, borderColor: Palette.orange, backgroundColor: Palette.orangeSoft }, nodeName: { color: Palette.text, fontFamily: Fonts.semibold, textAlign: 'center' },
});
