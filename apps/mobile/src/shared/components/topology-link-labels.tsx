import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Fonts, type ThemeColors } from '@/shared/theme';
import { useCanvasThemeStyles } from '@/shared/theme-context';

export interface TopologyPoint {
  x: number;
  y: number;
}

export interface TopologyNodeBounds {
  halfHeight: number;
  halfWidth: number;
}

export interface TopologyEndpointLabelPositions {
  from: TopologyPoint;
  to: TopologyPoint;
}

export interface TopologyLabelSize {
  height: number;
  width: number;
}

export type TopologyCaptionAnchor =
  | { kind: 'link'; side: 'above' | 'below'; along?: number; gap?: number }
  | { kind: 'device'; deviceId: string; side: 'top' | 'bottom' | 'left' | 'right'; gap?: number; offset?: number };

export interface AuthoredTopologyLayout {
  width: number;
  height: number;
  nodes: Record<string, TopologyPoint>;
  captions: Record<string, TopologyCaptionAnchor>;
}

export interface TopologyLabelLayoutNode {
  bounds: TopologyNodeBounds;
  id: string;
  point: TopologyPoint;
}

export interface TopologyLabelLayoutLink {
  anchor?: TopologyCaptionAnchor;
  contextLabel?: string;
  fromDeviceId: string;
  fromLabel: string;
  id: string;
  toDeviceId: string;
  toLabel: string;
}

export interface ResolvedTopologyLinkLabels {
  context?: { position: TopologyPoint; size: TopologyLabelSize };
  from: { position: TopologyPoint; size: TopologyLabelSize };
  to: { position: TopologyPoint; size: TopologyLabelSize };
}

export interface TopologyRect {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

const LABEL_HEIGHT = 22;
const LABEL_GAP = 5;
const MAX_FONT_SCALE = 2;
const CAPTION_MAX_WIDTH = 196;
const ATOMIC_CAPTION_MAX_WIDTH = 480;

const normalizedFontScale = (fontScale: number) => Math.max(1, Math.min(MAX_FONT_SCALE, fontScale));

export function getTopologyLabelSize(label: string, fontScale = 1): TopologyLabelSize {
  const scale = normalizedFontScale(fontScale);
  return {
    width: Math.max(34, Math.min(108, 12 + label.length * 7 * scale)),
    height: Math.ceil(5 + 17 * scale),
  };
}

function positionOutsideNode(origin: TopologyPoint, target: TopologyPoint, bounds: TopologyNodeBounds, labelSize: TopologyLabelSize) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return { ...origin };

  const unitX = dx / length;
  const unitY = dy / length;
  const horizontalBoundary = Math.abs(unitX) > 0.001 ? bounds.halfWidth / Math.abs(unitX) : Number.POSITIVE_INFINITY;
  const verticalBoundary = Math.abs(unitY) > 0.001 ? bounds.halfHeight / Math.abs(unitY) : Number.POSITIVE_INFINITY;
  const boundaryDistance = Math.min(horizontalBoundary, verticalBoundary);
  const labelExtent = Math.abs(unitX) * labelSize.width / 2 + Math.abs(unitY) * labelSize.height / 2;
  const distance = boundaryDistance + LABEL_GAP + labelExtent;

  return { x: origin.x + unitX * distance, y: origin.y + unitY * distance };
}

export function calculateCableEndpointLabels(
  from: TopologyPoint,
  to: TopologyPoint,
  fromBounds: TopologyNodeBounds,
  toBounds: TopologyNodeBounds,
  fromLabelSize: TopologyLabelSize = { width: 46, height: LABEL_HEIGHT },
  toLabelSize: TopologyLabelSize = { width: 46, height: LABEL_HEIGHT },
): TopologyEndpointLabelPositions {
  const fromPosition = positionOutsideNode(from, to, fromBounds, fromLabelSize);
  const toPosition = positionOutsideNode(to, from, toBounds, toLabelSize);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);

  if (length > 0 && Math.hypot(toPosition.x - fromPosition.x, toPosition.y - fromPosition.y) < Math.max(fromLabelSize.width, toLabelSize.width) * 0.9) {
    const perpendicularX = -dy / length;
    const perpendicularY = dx / length;
    const separation = Math.abs(dy) >= Math.abs(dx)
      ? (fromLabelSize.width + toLabelSize.width) / 4 + 4
      : (fromLabelSize.height + toLabelSize.height) / 4 + 4;
    fromPosition.x += perpendicularX * separation;
    fromPosition.y += perpendicularY * separation;
    toPosition.x -= perpendicularX * separation;
    toPosition.y -= perpendicularY * separation;
  }

  return { from: fromPosition, to: toPosition };
}

export function getTopologyCaptionSize(label: string, fontScale = 1): TopologyLabelSize {
  const scale = normalizedFontScale(fontScale);
  const estimatedWidth = 24 + label.length * 8.5 * scale;
  if (isAtomicTopologyCaption(label)) {
    return {
      width: Math.max(92, Math.min(ATOMIC_CAPTION_MAX_WIDTH, estimatedWidth)),
      height: Math.ceil(8 + 17 * scale),
    };
  }
  const wraps = estimatedWidth > CAPTION_MAX_WIDTH;
  return {
    width: Math.max(92, Math.min(CAPTION_MAX_WIDTH, estimatedWidth)),
    height: Math.ceil(8 + 17 * scale * (wraps ? 2 : 1)),
  };
}

export function formatTopologyCaption(label: string, fontScale = 1) {
  if (isAtomicTopologyCaption(label)) return label;
  if (24 + label.length * 8.5 * normalizedFontScale(fontScale) <= CAPTION_MAX_WIDTH) return label;
  const slash = label.lastIndexOf('/');
  if (slash > 0) return `${label.slice(0, slash)}\n${label.slice(slash)}`;
  const space = label.lastIndexOf(' ', Math.ceil(label.length / 2));
  return space > 0 ? `${label.slice(0, space)}\n${label.slice(space + 1)}` : label;
}

export function isAtomicTopologyCaption(label: string) {
  return /^(?:\d{1,3}\.){3}\d{1,3}\/(?:[0-9]|[12]\d|3[0-2])$/.test(label.trim());
}

export function getTopologyRect(center: TopologyPoint, size: TopologyLabelSize): TopologyRect {
  return {
    left: center.x - size.width / 2,
    right: center.x + size.width / 2,
    top: center.y - size.height / 2,
    bottom: center.y + size.height / 2,
  };
}

export function topologyRectsOverlap(a: TopologyRect, b: TopologyRect, gap = 0) {
  return a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
}

function rectInsideCanvas(rect: TopologyRect, canvas: { width: number; height: number }) {
  return rect.left >= 4 && rect.top >= 4 && rect.right <= canvas.width - 4 && rect.bottom <= canvas.height - 4;
}

function contextOrigin(anchor: TopologyCaptionAnchor, size: TopologyLabelSize, nodes: Map<string, TopologyLabelLayoutNode>, from: TopologyPoint, to: TopologyPoint) {
  if (anchor.kind === 'device') {
    const node = nodes.get(anchor.deviceId);
    if (!node) return undefined;
    const gap = anchor.gap ?? 8;
    const offset = anchor.offset ?? 0;
    if (anchor.side === 'top') return { point: { x: node.point.x + offset, y: node.point.y - node.bounds.halfHeight - gap - size.height / 2 }, direction: { x: 0, y: -1 } };
    if (anchor.side === 'bottom') return { point: { x: node.point.x + offset, y: node.point.y + node.bounds.halfHeight + gap + size.height / 2 }, direction: { x: 0, y: 1 } };
    if (anchor.side === 'left') return { point: { x: node.point.x - node.bounds.halfWidth - gap - size.width / 2, y: node.point.y + offset }, direction: { x: -1, y: 0 } };
    return { point: { x: node.point.x + node.bounds.halfWidth + gap + size.width / 2, y: node.point.y + offset }, direction: { x: 1, y: 0 } };
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const unit = { x: dx / length, y: dy / length };
  let normal = { x: -unit.y, y: unit.x };
  if ((anchor.side === 'above' && normal.y > 0) || (anchor.side === 'below' && normal.y < 0)) normal = { x: -normal.x, y: -normal.y };
  const extent = Math.abs(normal.x) * size.width / 2 + Math.abs(normal.y) * size.height / 2;
  const distance = (anchor.gap ?? 12) + extent;
  return {
    point: {
      x: (from.x + to.x) / 2 + unit.x * (anchor.along ?? 0) + normal.x * distance,
      y: (from.y + to.y) / 2 + unit.y * (anchor.along ?? 0) + normal.y * distance,
    },
    direction: normal,
  };
}

function nearestClearPosition(origin: TopologyPoint, size: TopologyLabelSize, directions: TopologyPoint[], reserved: TopologyRect[], canvas: { width: number; height: number }, maxSteps = 24) {
  for (let step = 0; step <= maxSteps; step += 1) {
    const distance = step * 8;
    for (const direction of directions) {
      const candidate = { x: origin.x + direction.x * distance, y: origin.y + direction.y * distance };
      const rect = getTopologyRect(candidate, size);
      if (rectInsideCanvas(rect, canvas) && reserved.every((item) => !topologyRectsOverlap(rect, item, 4))) return candidate;
    }
  }
  return origin;
}

export function calculateTopologyLabelLayout({ canvas, fontScale = 1, links, nodes }: {
  canvas: { width: number; height: number };
  fontScale?: number;
  links: TopologyLabelLayoutLink[];
  nodes: TopologyLabelLayoutNode[];
}) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const reserved = nodes.map((node) => getTopologyRect(node.point, { width: node.bounds.halfWidth * 2, height: node.bounds.halfHeight * 2 }));
  const resolved: Record<string, ResolvedTopologyLinkLabels> = {};

  links.forEach((link) => {
    const fromNode = nodeMap.get(link.fromDeviceId);
    const toNode = nodeMap.get(link.toDeviceId);
    if (!fromNode || !toNode) return;
    const fromSize = getTopologyLabelSize(link.fromLabel, fontScale);
    const toSize = getTopologyLabelSize(link.toLabel, fontScale);
    const positions = calculateCableEndpointLabels(fromNode.point, toNode.point, fromNode.bounds, toNode.bounds, fromSize, toSize);
    const dx = toNode.point.x - fromNode.point.x;
    const dy = toNode.point.y - fromNode.point.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const tangent = { x: -dy / length, y: dx / length };
    const from = { position: nearestClearPosition(positions.from, fromSize, [tangent, { x: -tangent.x, y: -tangent.y }], reserved, canvas, 10), size: fromSize };
    reserved.push(getTopologyRect(from.position, from.size));
    const to = { position: nearestClearPosition(positions.to, toSize, [{ x: -tangent.x, y: -tangent.y }, tangent], reserved, canvas, 10), size: toSize };
    reserved.push(getTopologyRect(to.position, to.size));
    resolved[link.id] = { from, to };
  });

  links.forEach((link) => {
    if (!link.contextLabel || !link.anchor || !resolved[link.id]) return;
    const fromNode = nodeMap.get(link.fromDeviceId);
    const toNode = nodeMap.get(link.toDeviceId);
    if (!fromNode || !toNode) return;
    const size = getTopologyCaptionSize(link.contextLabel, fontScale);
    const origin = contextOrigin(link.anchor, size, nodeMap, fromNode.point, toNode.point);
    if (!origin) return;
    const position = nearestClearPosition(origin.point, size, [origin.direction], reserved, canvas);
    const rect = getTopologyRect(position, size);
    reserved.push(rect);
    resolved[link.id].context = { position, size };
  });

  return resolved;
}

export function TopologyLinkLabels({
  accessibilityLabel,
  from,
  fromBounds,
  fromLabel,
  id,
  to,
  toBounds,
  toLabel,
  contextLabel,
  contextTone = 'normal',
  resolvedLayout,
}: {
  accessibilityLabel?: string;
  from: TopologyPoint;
  fromBounds: TopologyNodeBounds;
  fromLabel: string;
  id: string;
  to: TopologyPoint;
  toBounds: TopologyNodeBounds;
  toLabel: string;
  contextLabel?: string;
  contextTone?: 'normal' | 'warning';
  resolvedLayout?: ResolvedTopologyLinkLabels;
}) {
  const styles = useCanvasThemeStyles(createStyles);
  const { fontScale } = useWindowDimensions();
  const fromSize = resolvedLayout?.from.size ?? getTopologyLabelSize(fromLabel, fontScale);
  const toSize = resolvedLayout?.to.size ?? getTopologyLabelSize(toLabel, fontScale);
  const positions = resolvedLayout ? { from: resolvedLayout.from.position, to: resolvedLayout.to.position } : calculateCableEndpointLabels(from, to, fromBounds, toBounds, fromSize, toSize);
  const contextSize = resolvedLayout?.context?.size;
  const contextPosition = resolvedLayout?.context?.position;
  const renderedContextLabel = contextLabel ? formatTopologyCaption(contextLabel, fontScale) : undefined;
  return (
    <>
      <View
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
        pointerEvents="none"
        style={[styles.label, { left: positions.from.x - fromSize.width / 2, top: positions.from.y - fromSize.height / 2, width: fromSize.width, minHeight: fromSize.height }]}
        testID={`topology-link-label-${id}-from`}>
        <Text accessible={false} numberOfLines={1} variant="technical" style={styles.text}>{fromLabel}</Text>
      </View>
      <View
        accessible={false}
        pointerEvents="none"
        style={[styles.label, { left: positions.to.x - toSize.width / 2, top: positions.to.y - toSize.height / 2, width: toSize.width, minHeight: toSize.height }]}
        testID={`topology-link-label-${id}-to`}>
        <Text accessible={false} numberOfLines={1} variant="technical" style={styles.text}>{toLabel}</Text>
      </View>
      {contextLabel && contextSize && contextPosition ? <View
        accessible={false}
        pointerEvents="none"
        style={[styles.label, styles.contextLabel, contextTone === 'warning' && styles.contextWarning, { left: contextPosition.x - contextSize.width / 2, top: contextPosition.y - contextSize.height / 2, width: contextSize.width, minHeight: contextSize.height }]}
        testID={`topology-link-label-${id}-context`}>
        <Text accessible={false} numberOfLines={isAtomicTopologyCaption(contextLabel) ? 1 : 2} variant="technical" style={[styles.text, contextTone === 'warning' && styles.warningText]}>{renderedContextLabel}</Text>
      </View> : null}
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  label: {
    position: 'absolute',
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.textMuted,
    backgroundColor: colors.background,
  },
  text: { color: colors.text, fontFamily: Fonts.medium, textAlign: 'center', textTransform: 'none' },
  contextLabel: { zIndex: 2, paddingHorizontal: 8, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  contextWarning: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  warningText: { color: colors.orange },
});
