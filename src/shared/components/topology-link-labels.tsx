import { StyleSheet, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Fonts, Palette } from '@/shared/theme';

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

export interface TopologyLinkCaptionPlacement {
  along?: number;
  perpendicular?: number;
}

const LABEL_HEIGHT = 22;
const LABEL_GAP = 5;

export function getTopologyLabelSize(label: string): TopologyLabelSize {
  return { width: Math.max(34, Math.min(58, 12 + label.length * 7)), height: LABEL_HEIGHT };
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

export function getTopologyCaptionSize(label: string): TopologyLabelSize {
  return { width: Math.max(92, Math.min(176, 20 + label.length * 7)), height: 26 };
}

export function calculateCableMidpointLabel(
  from: TopologyPoint,
  to: TopologyPoint,
  labelSize: TopologyLabelSize,
  placement: TopologyLinkCaptionPlacement = {},
  canvas?: { width: number; height: number },
): TopologyPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const along = placement.along ?? 0;
  const perpendicular = placement.perpendicular ?? -36;
  const unitX = dx / length;
  const unitY = dy / length;
  let x = (from.x + to.x) / 2 + unitX * along - unitY * perpendicular;
  let y = (from.y + to.y) / 2 + unitY * along + unitX * perpendicular;
  if (canvas) {
    x = Math.max(labelSize.width / 2 + 4, Math.min(canvas.width - labelSize.width / 2 - 4, x));
    y = Math.max(labelSize.height / 2 + 4, Math.min(canvas.height - labelSize.height / 2 - 4, y));
  }
  return { x, y };
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
  contextPlacement,
  canvas,
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
  contextPlacement?: TopologyLinkCaptionPlacement;
  canvas?: { width: number; height: number };
}) {
  const fromSize = getTopologyLabelSize(fromLabel);
  const toSize = getTopologyLabelSize(toLabel);
  const positions = calculateCableEndpointLabels(from, to, fromBounds, toBounds, fromSize, toSize);
  const contextSize = contextLabel ? getTopologyCaptionSize(contextLabel) : undefined;
  const contextPosition = contextSize ? calculateCableMidpointLabel(from, to, contextSize, contextPlacement, canvas) : undefined;
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
        <Text accessible={false} numberOfLines={1} variant="technical" style={[styles.text, contextTone === 'warning' && styles.warningText]}>{contextLabel}</Text>
      </View> : null}
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: Palette.textMuted,
    backgroundColor: Palette.background,
  },
  text: { color: Palette.white, fontFamily: Fonts.medium, textAlign: 'center', textTransform: 'none' },
  contextLabel: { zIndex: 2, paddingHorizontal: 8, borderColor: Palette.border, backgroundColor: Palette.surfaceRaised },
  contextWarning: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  warningText: { color: Palette.orange },
});
