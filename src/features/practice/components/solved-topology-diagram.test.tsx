import { render } from '@testing-library/react-native';

import { SolvedTopologyDiagram } from '@/features/practice/components/solved-topology-diagram';
import { cliLabDefinitions } from '@/features/cli/cli-lab-definitions';
import { buildSolvedLabExample, solvedLabExampleDefinitions } from '@/features/practice/solved-lab-examples';
import { calculateTopologyLabelLayout, getTopologyRect, topologyRectsOverlap } from '@/shared/components/topology-link-labels';

describe('SolvedTopologyDiagram', () => {
  test('renders complete routed subnet captions and both endpoint interfaces', async () => {
    const topology = buildSolvedLabExample('static-route-board')!.topology!;
    const screen = await render(<SolvedTopologyDiagram onSelect={jest.fn()} selectedId="pc-a" topology={topology} />);
    expect(screen.getByText('192.168.10.0/24')).toBeTruthy();
    expect(screen.getByText('10.0.12.0/30')).toBeTruthy();
    expect(screen.getByText('10.0.23.0/30')).toBeTruthy();
    expect(screen.getByText('192.168.30.0/24')).toBeTruthy();
    expect(screen.getAllByText('E0')).toHaveLength(2);
    expect(screen.getAllByText('G0/0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('G0/1').length).toBeGreaterThan(0);
  });

  test('uses the corresponding live CLI layout in each CLI completed example', () => {
    ['ping-diagnostic-desk', 'static-route-board', 'vlan-port-desk', 'inter-vlan-routing-desk'].forEach((labId) => {
      const topology = buildSolvedLabExample(labId)!.topology!;
      const live = cliLabDefinitions[labId].topology;
      expect(topology.layout?.width).toBe(live.width.wide);
      expect(topology.layout?.height).toBe(live.height.wide);
      topology.links.forEach((link) => {
        const liveId = `${link.from}-${link.fromInterface}-${link.to}-${link.toInterface}`;
        expect(topology.layout?.captions[link.id]).toEqual(live.linkCaptions?.[liveId]?.wide);
      });
    });
  });

  test('keeps every label-bearing completed example anchored and collision-free at large text', () => {
    Object.keys(solvedLabExampleDefinitions).forEach((labId) => {
      const topology = buildSolvedLabExample(labId)?.topology;
      if (!topology?.links.some((link) => link.fromInterface || link.toInterface)) return;
      expect(topology.layout).toBeDefined();
      const layout = topology.layout!;
      [1, 2].forEach((fontScale) => {
        const nodes = topology.nodes.map((node) => ({ id: node.id, point: layout.nodes[node.id], bounds: { halfWidth: 52, halfHeight: 46 } }));
        const links = topology.links.filter((link) => link.fromInterface || link.toInterface).map((link) => ({
          id: link.id,
          fromDeviceId: link.from,
          toDeviceId: link.to,
          fromLabel: link.fromInterface ?? 'PORT',
          toLabel: link.toInterface ?? 'PORT',
          contextLabel: link.context,
          anchor: layout.captions[link.id] ?? (link.context ? { kind: 'link' as const, side: 'above' as const, gap: 36 } : undefined),
        }));
        const resolved = calculateTopologyLabelLayout({ canvas: layout, fontScale, links, nodes });
        const nodeRects = nodes.map((node) => getTopologyRect(node.point, { width: 104, height: 92 }));
        const labels = Object.entries(resolved).flatMap(([id, item]) => [
          { id: `${id}:from`, rect: getTopologyRect(item.from.position, item.from.size) },
          { id: `${id}:to`, rect: getTopologyRect(item.to.position, item.to.size) },
          ...(item.context ? [{ id: `${id}:context`, rect: getTopologyRect(item.context.position, item.context.size) }] : []),
        ]);
        labels.forEach((label, index) => {
          nodeRects.forEach((node) => expect(topologyRectsOverlap(label.rect, node, 4)).toBe(false));
          labels.slice(index + 1).forEach((other) => {
            if (topologyRectsOverlap(label.rect, other.rect, 4)) throw new Error(`${labId} ${label.id} overlaps ${other.id} at ${fontScale}x`);
          });
        });
      });
    });
  });
});
