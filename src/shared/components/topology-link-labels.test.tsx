import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  calculateCableEndpointLabels,
  calculateTopologyLabelLayout,
  formatTopologyCaption,
  getTopologyCaptionSize,
  getTopologyLabelSize,
  getTopologyRect,
  isAtomicTopologyCaption,
  topologyRectsOverlap,
  TopologyLinkLabels,
} from '@/shared/components/topology-link-labels';

const bounds = { halfWidth: 50, halfHeight: 40 };

function resolveTestLink({ anchor = { kind: 'link' as const, side: 'above' as const, gap: 24 }, contextLabel, fontScale = 1, from = { x: 80, y: 110 }, id = 'test-link', to = { x: 420, y: 110 } }: {
  anchor?: { kind: 'link'; side: 'above' | 'below'; gap?: number } | { kind: 'device'; deviceId: string; side: 'top' | 'bottom' | 'left' | 'right'; gap?: number };
  contextLabel?: string;
  fontScale?: number;
  from?: { x: number; y: number };
  id?: string;
  to?: { x: number; y: number };
}) {
  return calculateTopologyLabelLayout({
    canvas: { width: 500, height: 260 },
    fontScale,
    nodes: [{ id: 'a', point: from, bounds }, { id: 'b', point: to, bounds }],
    links: [{ id, fromDeviceId: 'a', toDeviceId: 'b', fromLabel: 'E0', toLabel: 'G0/0', contextLabel, anchor }],
  })[id];
}

describe('topology link labels', () => {
  test('places horizontal labels outside both device bounds', () => {
    const positions = calculateCableEndpointLabels({ x: 100, y: 100 }, { x: 400, y: 100 }, bounds, bounds);
    expect(positions.from.x).toBeGreaterThan(150);
    expect(positions.from.y).toBe(100);
    expect(positions.to.x).toBeLessThan(350);
    expect(positions.to.y).toBe(100);
  });

  test('places vertical labels outside both device bounds', () => {
    const positions = calculateCableEndpointLabels({ x: 100, y: 100 }, { x: 100, y: 400 }, bounds, bounds);
    expect(positions.from.y).toBeGreaterThan(140);
    expect(positions.from.x).toBe(100);
    expect(positions.to.y).toBeLessThan(360);
    expect(positions.to.x).toBe(100);
  });

  test('staggering keeps labels on short vertical links from overlapping', () => {
    const fromSize = getTopologyLabelSize('E0');
    const toSize = getTopologyLabelSize('G0/0.10');
    const positions = calculateCableEndpointLabels(
      { x: 100, y: 100 },
      { x: 100, y: 205 },
      bounds,
      bounds,
      fromSize,
      toSize,
    );
    const horizontalGap = Math.abs(positions.to.x - positions.from.x);
    expect(horizontalGap).toBeGreaterThanOrEqual((fromSize.width + toSize.width) / 2 + 8);
  });

  test('places an anchored network caption in a separate lane above its cable', () => {
    const resolved = resolveTestLink({ contextLabel: '192.168.10.0/24' });
    expect(resolved.context?.position.x).toBe(250);
    expect(resolved.context?.position.y).toBeLessThan(110);
  });

  test('keeps a device-related warning below its owning device as text grows', () => {
    const normal = resolveTestLink({ anchor: { kind: 'device', deviceId: 'a', side: 'bottom', gap: 8 }, contextLabel: 'NOT TRUNKED' });
    const large = resolveTestLink({ anchor: { kind: 'device', deviceId: 'a', side: 'bottom', gap: 8 }, contextLabel: 'NOT TRUNKED', fontScale: 2 });
    expect(normal.context!.position.y).toBeGreaterThan(110 + bounds.halfHeight);
    expect(large.context!.position.y).toBeGreaterThan(normal.context!.position.y);
  });

  test('expands technical plates with system font scale without truncating the value', () => {
    const normalCaption = getTopologyCaptionSize('192.168.10.0/24', 1);
    const largeCaption = getTopologyCaptionSize('192.168.10.0/24', 2);
    expect(largeCaption.width).toBeGreaterThan(196);
    expect(largeCaption.height).toBeGreaterThan(normalCaption.height);
    expect(formatTopologyCaption('192.168.10.0/24', 2)).toBe('192.168.10.0/24');
    expect(isAtomicTopologyCaption('192.168.10.0/24')).toBe(true);
    expect(getTopologyLabelSize('G0/0.10', 2).width).toBeGreaterThan(getTopologyLabelSize('G0/0.10', 1).width);
  });

  test('keeps a large subnet caption clear of nodes and endpoint plates', () => {
    const from = { x: 100, y: 140 };
    const to = { x: 384, y: 140 };
    const fontScale = 2;
    const fromSize = getTopologyLabelSize('E0', fontScale);
    const toSize = getTopologyLabelSize('G0/0', fontScale);
    const captionSize = getTopologyCaptionSize('192.168.10.0/24', fontScale);
    const resolved = calculateTopologyLabelLayout({
      canvas: { width: 484, height: 280 },
      fontScale,
      nodes: [{ id: 'a', point: from, bounds }, { id: 'b', point: to, bounds }],
      links: [{ id: 'large', fromDeviceId: 'a', toDeviceId: 'b', fromLabel: 'E0', toLabel: 'G0/0', contextLabel: '192.168.10.0/24', anchor: { kind: 'link', side: 'above', gap: 20 } }],
    }).large;
    const captionPosition = resolved.context!.position;
    const captionRect = getTopologyRect(captionPosition, captionSize);
    const otherRects = [
      getTopologyRect(from, { width: 100, height: 80 }),
      getTopologyRect(to, { width: 100, height: 80 }),
      getTopologyRect(resolved.from.position, fromSize),
      getTopologyRect(resolved.to.position, toSize),
    ];
    otherRects.forEach((rect) => expect(topologyRectsOverlap(captionRect, rect, 4)).toBe(false));
  });

  test('renders exact endpoint names as horizontal application text', async () => {
    const screen = await render(<TopologyLinkLabels accessibilityLabel="Cable from R1 G0/0.10 to SW1 F0/24" from={{ x: 80, y: 80 }} fromBounds={bounds} fromLabel="G0/0.10" id="route-link" to={{ x: 300, y: 80 }} toBounds={bounds} toLabel="F0/24" />);
    expect(screen.getByText('G0/0.10')).toBeTruthy();
    expect(screen.getByText('F0/24')).toBeTruthy();
    expect(screen.getByLabelText('Cable from R1 G0/0.10 to SW1 F0/24')).toBeTruthy();
    const style = StyleSheet.flatten(screen.getByTestId('topology-link-label-route-link-from').props.style);
    expect(style.position).toBe('absolute');
    expect(style.width).toBeGreaterThanOrEqual(getTopologyLabelSize('G0/0.10').width);
    expect(screen.queryByTestId('topology-link-label-route-link-context')).toBeNull();
  });

  test('renders a derived subnet caption separately from both endpoint plates', async () => {
    const resolvedLayout = resolveTestLink({ contextLabel: '192.168.10.0/24', from: { x: 80, y: 100 }, id: 'subnet-link', to: { x: 420, y: 100 } });
    const screen = await render(<TopologyLinkLabels accessibilityLabel="Routed cable" contextLabel="192.168.10.0/24" from={{ x: 80, y: 100 }} fromBounds={bounds} fromLabel="E0" id="subnet-link" resolvedLayout={resolvedLayout} to={{ x: 420, y: 100 }} toBounds={bounds} toLabel="G0/0" />);
    const context = StyleSheet.flatten(screen.getByTestId('topology-link-label-subnet-link-context').props.style);
    const from = StyleSheet.flatten(screen.getByTestId('topology-link-label-subnet-link-from').props.style);
    expect(screen.getByText(/192\.168\.10\.0\s*\/24/)).toBeTruthy();
    expect(screen.getByText('192.168.10.0/24').props.numberOfLines).toBe(1);
    expect(context.top).toBeLessThan(from.top);
  });

  test('keeps a complete transit subnet visible without ellipsis or a split prefix', async () => {
    const resolvedLayout = calculateTopologyLabelLayout({ canvas: { width: 420, height: 220 }, nodes: [{ id: 'a', point: { x: 70, y: 120 }, bounds }, { id: 'b', point: { x: 350, y: 120 }, bounds }], links: [{ id: 'transit-subnet', fromDeviceId: 'a', toDeviceId: 'b', fromLabel: 'G0/1', toLabel: 'G0/0', contextLabel: '10.0.23.0/30', anchor: { kind: 'link', side: 'above', gap: 24 } }] })['transit-subnet'];
    const screen = await render(<TopologyLinkLabels contextLabel="10.0.23.0/30" from={{ x: 70, y: 120 }} fromBounds={bounds} fromLabel="G0/1" id="transit-subnet" resolvedLayout={resolvedLayout} to={{ x: 350, y: 120 }} toBounds={bounds} toLabel="G0/0" />);
    const label = screen.getByText('10.0.23.0/30');
    const plate = StyleSheet.flatten(screen.getByTestId('topology-link-label-transit-subnet-context').props.style);
    expect(label.props.numberOfLines).toBe(1);
    expect(plate.width).toBeGreaterThanOrEqual(getTopologyCaptionSize('10.0.23.0/30').width);
    expect(formatTopologyCaption('10.0.23.0/30', 2)).toBe('10.0.23.0/30');
  });
});
