import { deriveIpv4Network } from "@netbite/networking";
import type {
  WorkshopDeviceInterface,
  WorkshopDeviceType,
  WorkshopLinkPurpose,
  WorkshopTopology,
  WorkshopTopologyDevice,
  WorkshopTopologyLink,
  WorkshopTopologyStarterId,
} from "./workshop-contract";

import {
  type WorkshopCableGeometry,
  type WorkshopLinkContext,
  type WorkshopTopologyLabelGeometry,
  type WorkshopTopologyNodeBounds,
  type WorkshopTopologyPoint,
  type WorkshopTopologyViewport,
} from "./topology-authoring-types";
import { deriveWorkshopLinkContext } from "./topology-connections";

export interface GeometryRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function labelSize(
  text: string,
  kind: "endpoint" | "context",
  fontScale: number,
) {
  const scale = Math.max(1, Math.min(2, fontScale));
  const horizontalPadding = kind === "endpoint" ? 8 : 18;
  return {
    width: Math.max(
      kind === "endpoint" ? 30 : 64,
      text.length * (kind === "endpoint" ? 6.2 : 6.8) * scale +
        horizontalPadding,
    ),
    height: 22 * scale,
  };
}

export function labelRect(
  point: WorkshopTopologyPoint,
  width: number,
  height: number,
): GeometryRect {
  return {
    left: point.x - width / 2,
    top: point.y - height / 2,
    right: point.x + width / 2,
    bottom: point.y + height / 2,
  };
}

export function overlaps(
  first: GeometryRect,
  second: GeometryRect,
  clearance = 4,
) {
  return !(
    first.right + clearance <= second.left ||
    first.left >= second.right + clearance ||
    first.bottom + clearance <= second.top ||
    first.top >= second.bottom + clearance
  );
}

export function clippedEndpoint(
  from: WorkshopTopologyNodeBounds,
  to: WorkshopTopologyNodeBounds,
): WorkshopTopologyPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / distance;
  const unitY = dy / distance;
  const horizontal = Math.abs(unitX) < 0.0001
    ? Number.POSITIVE_INFINITY
    : from.width / 2 / Math.abs(unitX);
  const vertical = Math.abs(unitY) < 0.0001
    ? Number.POSITIVE_INFINITY
    : from.height / 2 / Math.abs(unitY);
  const edgeDistance = Math.min(horizontal, vertical);
  return { x: from.x + unitX * edgeDistance, y: from.y + unitY * edgeDistance };
}

export function clampLabel(
  point: WorkshopTopologyPoint,
  width: number,
  height: number,
  viewport: WorkshopTopologyViewport,
) {
  const margin = 6;
  return {
    x: Math.max(
      width / 2 + margin,
      Math.min(viewport.width - width / 2 - margin, point.x),
    ),
    y: Math.max(
      height / 2 + margin,
      Math.min(viewport.height - height / 2 - margin, point.y),
    ),
  };
}

export function chooseLabelPosition(
  candidates: WorkshopTopologyPoint[],
  width: number,
  height: number,
  viewport: WorkshopTopologyViewport,
  occupied: GeometryRect[],
) {
  let best = clampLabel(candidates[0], width, height, viewport);
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const point = clampLabel(candidate, width, height, viewport);
    const rect = labelRect(point, width, height);
    const score = occupied.reduce(
      (total, item) => total + (overlaps(rect, item) ? 1 : 0),
      0,
    );
    if (score < bestScore) {
      best = point;
      bestScore = score;
      if (score === 0) break;
    }
  }
  occupied.push(labelRect(best, width, height));
  return best;
}

export function calculateWorkshopTopologyGeometry(
  topology: WorkshopTopology,
  viewport: WorkshopTopologyViewport,
  nodeBounds: WorkshopTopologyNodeBounds[],
): WorkshopCableGeometry[] {
  if (viewport.width <= 0 || viewport.height <= 0) return [];
  const nodes = new Map(nodeBounds.map((node) => [node.deviceId, node]));
  const occupied: GeometryRect[] = nodeBounds.map((node) => ({
    left: node.x - node.width / 2,
    top: node.y - node.height / 2,
    right: node.x + node.width / 2,
    bottom: node.y + node.height / 2,
  }));
  const result: WorkshopCableGeometry[] = [];
  const linksByDevicePair = new Map<string, WorkshopTopologyLink[]>();
  for (const link of topology.links) {
    const pair = [link.fromDeviceId, link.toDeviceId].sort().join("::");
    linksByDevicePair.set(pair, [
      ...(linksByDevicePair.get(pair) ?? []),
      link,
    ]);
  }
  for (const link of topology.links) {
    const fromNode = nodes.get(link.fromDeviceId);
    const toNode = nodes.get(link.toDeviceId);
    const fromDevice = topology.devices.find(
      (device) => device.id === link.fromDeviceId,
    );
    const toDevice = topology.devices.find(
      (device) => device.id === link.toDeviceId,
    );
    const fromInterface = fromDevice?.interfaces.find(
      (item) => item.id === link.fromInterfaceId,
    );
    const toInterface = toDevice?.interfaces.find(
      (item) => item.id === link.toInterfaceId,
    );
    if (!fromNode || !toNode || !fromInterface || !toInterface) continue;
    let start = clippedEndpoint(fromNode, toNode);
    let end = clippedEndpoint(toNode, fromNode);
    const baseDx = end.x - start.x;
    const baseDy = end.y - start.y;
    const baseLength = Math.max(1, Math.hypot(baseDx, baseDy));
    const pair = [link.fromDeviceId, link.toDeviceId].sort().join("::");
    const parallelLinks = linksByDevicePair.get(pair) ?? [link];
    if (parallelLinks.length > 1) {
      const lane = parallelLinks.findIndex((item) => item.id === link.id);
      const laneOffset = (lane - (parallelLinks.length - 1) / 2) * 24;
      const perpendicularX = -baseDy / baseLength;
      const perpendicularY = baseDx / baseLength;
      start = {
        x: start.x + perpendicularX * laneOffset,
        y: start.y + perpendicularY * laneOffset,
      };
      end = {
        x: end.x + perpendicularX * laneOffset,
        y: end.y + perpendicularY * laneOffset,
      };
    }
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const unitX = dx / length;
    const unitY = dy / length;
    const makeLabel = (
      id: string,
      kind: "endpoint" | "context",
      text: string,
      tone: WorkshopLinkContext["tone"],
      candidates: WorkshopTopologyPoint[],
    ): WorkshopTopologyLabelGeometry => {
      const size = labelSize(text, kind, viewport.fontScale);
      return {
        id,
        linkId: link.id,
        kind,
        text,
        tone,
        ...size,
        ...chooseLabelPosition(
          candidates,
          size.width,
          size.height,
          viewport,
          occupied,
        ),
      };
    };
    const endpointCandidates = (
      anchor: WorkshopTopologyPoint,
      direction: 1 | -1,
    ) =>
      [15, 22, 30, 42, 54, 66].map((along) => ({
        x: anchor.x + unitX * along * direction,
        y: anchor.y + unitY * along * direction,
      }));
    const context = deriveWorkshopLinkContext(topology, link);
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const contextCandidates = [
      0.5,
      0.46,
      0.54,
      0.42,
      0.58,
      0.38,
      0.62,
      0.34,
      0.66,
      0.26,
      0.74,
    ].map(
      (along) => ({
        x: start.x + dx * along,
        y: start.y + dy * along,
      }),
    );
    result.push({
      linkId: link.id,
      start,
      end,
      endpointLabels: [
        makeLabel(
          `${link.id}-from`,
          "endpoint",
          fromInterface.name,
          "neutral",
          endpointCandidates(start, 1),
        ),
        makeLabel(
          `${link.id}-to`,
          "endpoint",
          toInterface.name,
          "neutral",
          endpointCandidates(end, -1),
        ),
      ],
      contextLabel: makeLabel(
        `${link.id}-context`,
        "context",
        context.label,
        context.tone,
        [...contextCandidates, midpoint],
      ),
    });
  }
  return result;
}
