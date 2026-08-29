import { deriveIpv4Network } from "@netbite/networking";
import type {
  WorkshopDeviceInterface,
  WorkshopDeviceType,
  WorkshopTopology,
  WorkshopTopologyDevice,
  WorkshopTopologyLink,
  WorkshopLinkPurpose,
  WorkshopTopologyStarterId,
} from "./workshop-contract";

export interface WorkshopLinkContext {
  label: string;
  tone: "network" | "vlan" | "warning" | "neutral";
}

export interface WorkshopConnectionCandidate {
  deviceId: string;
  interfaceId: string;
  deviceName: string;
  interfaceName: string;
}

export interface WorkshopTopologyViewport {
  width: number;
  height: number;
  fontScale: number;
}

export interface WorkshopTopologyNodeBounds {
  deviceId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkshopTopologyPoint {
  x: number;
  y: number;
}

export interface WorkshopTopologyLabelGeometry extends WorkshopTopologyPoint {
  id: string;
  linkId: string;
  kind: "endpoint" | "context";
  text: string;
  width: number;
  height: number;
  tone: WorkshopLinkContext["tone"];
}

export interface WorkshopCableGeometry {
  linkId: string;
  start: WorkshopTopologyPoint;
  end: WorkshopTopologyPoint;
  endpointLabels: WorkshopTopologyLabelGeometry[];
  contextLabel: WorkshopTopologyLabelGeometry;
}

export const topologyStarters: Array<{
  id: WorkshopTopologyStarterId;
  title: string;
  description: string;
}> = [
  {
    id: "first-network",
    title: "First switched network",
    description: "Two PCs connected through one switch.",
  },
  {
    id: "static-routing",
    title: "Static routing",
    description: "Two LANs connected by three routers.",
  },
  {
    id: "vlan-trunk",
    title: "VLAN access and trunking",
    description: "Two switches carrying VLANs 10 and 20.",
  },
  {
    id: "router-on-a-stick",
    title: "Router-on-a-Stick",
    description: "One router trunk with VLAN subinterfaces.",
  },
  {
    id: "dhcp-relay",
    title: "DHCP relay",
    description: "A client reaches a DHCP server through a relay router.",
  },
  {
    id: "dns-service",
    title: "DNS service path",
    description: "A client resolves a name before reaching a server.",
  },
  {
    id: "acl-placement",
    title: "ACL placement",
    description: "A routed flow crosses an interface policy.",
  },
  {
    id: "nat-pat",
    title: "NAT and PAT",
    description: "An inside LAN reaches an outside network through PAT.",
  },
  {
    id: "ipv6-delivery",
    title: "IPv6 delivery",
    description: "Two IPv6 LANs connected through routers.",
  },
  {
    id: "stp-redundancy",
    title: "Redundant STP switching",
    description: "Three switches form a redundant triangle.",
  },
  {
    id: "lacp-etherchannel",
    title: "LACP EtherChannel",
    description: "Two switches use two physical bundle members.",
  },
  {
    id: "route-source",
    title: "Route-source comparison",
    description: "A router compares connected, static, and OSPF candidates.",
  },
  {
    id: "single-area-ospf",
    title: "Single-area OSPF",
    description: "Three routers share Area 0 topology information.",
  },
];

export function normalizeWorkshopTopology(
  value: WorkshopTopology,
): WorkshopTopology {
  return {
    ...value,
    schemaVersion: 2,
    devices: (value.devices ?? []).map((device) => ({
      ...device,
      interfaces: (device.interfaces ?? []).map((networkInterface) => ({
        ...networkInterface,
        kind: networkInterface.kind ?? "physical",
        state: networkInterface.state ?? "up",
      })),
      routes: device.routes ?? [],
      configuration: device.configuration ?? {},
    })),
    links: (value.links ?? []).map((link) => {
      const hasConflict = Boolean(link.accessVlan && link.trunkVlans?.length);
      return {
        ...link,
        purpose:
          link.purpose ??
          (hasConflict ? undefined : deriveWorkshopLinkPurpose(link, value)),
        state: link.state ?? "up",
      };
    }),
  };
}

export function deriveWorkshopLinkPurpose(
  link: WorkshopTopologyLink,
  topology?: WorkshopTopology,
): WorkshopLinkPurpose {
  if (link.purpose) return link.purpose;
  if (link.trunkVlans?.length) return "trunk";
  if (link.accessVlan) return "access";
  if (link.network) return "routed";
  if (topology) {
    const first = endpoint(topology, link.fromDeviceId, link.fromInterfaceId);
    const second = endpoint(topology, link.toDeviceId, link.toInterfaceId);
    if (first?.ipv4Address || second?.ipv4Address) return "routed";
  }
  return "basic";
}

export function hasWorkshopLinkPurposeConflict(link: WorkshopTopologyLink) {
  return Boolean(
    !link.purpose && link.accessVlan && link.trunkVlans?.length,
  );
}

export function isPhysicalInterface(networkInterface: WorkshopDeviceInterface) {
  return (networkInterface.kind ?? "physical") === "physical";
}

export function usedCableEndpointIds(topology: WorkshopTopology) {
  return new Set(
    topology.links.flatMap((link) => [
      `${link.fromDeviceId}:${link.fromInterfaceId}`,
      `${link.toDeviceId}:${link.toInterfaceId}`,
    ]),
  );
}

export function getAvailableConnectionInterfaces(
  topology: WorkshopTopology,
  deviceId: string,
) {
  const used = usedCableEndpointIds(topology);
  const device = topology.devices.find(
    (candidate) => candidate.id === deviceId,
  );
  return (device?.interfaces ?? []).filter(
    (networkInterface) =>
      isPhysicalInterface(networkInterface) &&
      !used.has(`${deviceId}:${networkInterface.id}`),
  );
}

export function validateWorkshopConnection(
  topology: WorkshopTopology,
  fromDeviceId: string,
  fromInterfaceId: string,
  toDeviceId: string,
  toInterfaceId: string,
) {
  if (fromDeviceId === toDeviceId) return "Choose two different devices.";
  const from = topology.devices.find((device) => device.id === fromDeviceId);
  const to = topology.devices.find((device) => device.id === toDeviceId);
  const fromInterface = from?.interfaces.find(
    (item) => item.id === fromInterfaceId,
  );
  const toInterface = to?.interfaces.find((item) => item.id === toInterfaceId);
  if (!from || !to || !fromInterface || !toInterface)
    return "Choose an existing device and interface at both ends.";
  if (!isPhysicalInterface(fromInterface) || !isPhysicalInterface(toInterface))
    return "Cables can connect only physical interfaces.";
  const used = usedCableEndpointIds(topology);
  if (
    used.has(`${fromDeviceId}:${fromInterfaceId}`) ||
    used.has(`${toDeviceId}:${toInterfaceId}`)
  )
    return "One of these interfaces already has a cable.";
  return undefined;
}

export function suggestWorkshopInterfaceName(
  device: Pick<WorkshopTopologyDevice, "type" | "interfaces">,
  kind: WorkshopDeviceInterface["kind"] = "physical",
  parentInterfaceId?: string,
  vlan?: number,
) {
  if (kind === "subinterface") {
    const parent = device.interfaces.find(
      (item) => item.id === parentInterfaceId,
    );
    return `${parent?.name ?? "G0/0"}.${vlan ?? 10}`;
  }
  if (kind === "svi") return `Vlan${vlan ?? 10}`;
  if (kind === "port-channel")
    return `Port-channel${Math.max(1, device.interfaces.filter((item) => item.kind === "port-channel").length + 1)}`;
  const number = device.interfaces.filter(isPhysicalInterface).length;
  if (device.type === "router") return `G0/${number}`;
  if (device.type === "switch") return `F0/${number + 1}`;
  return number ? `E${number}` : "E0";
}

function endpoint(
  topology: WorkshopTopology,
  deviceId: string,
  interfaceId: string,
) {
  const device = topology.devices.find(
    (candidate) => candidate.id === deviceId,
  );
  return device?.interfaces.find((candidate) => candidate.id === interfaceId);
}

export function deriveWorkshopLinkContext(
  topology: WorkshopTopology,
  link: WorkshopTopologyLink,
): WorkshopLinkContext {
  if ((link.state ?? "up") === "down")
    return { label: "LINK DOWN", tone: "warning" };
  if (hasWorkshopLinkPurposeConflict(link))
    return { label: "NEEDS ATTENTION", tone: "warning" };
  const purpose = deriveWorkshopLinkPurpose(link, topology);
  if (purpose === "trunk")
    return {
      label: link.trunkVlans?.length
        ? `TRUNK VLANs ${[...new Set(link.trunkVlans)].sort((a, b) => a - b).join(", ")}`
        : "TRUNK VLANs NOT SET",
      tone: "vlan",
    };
  if (purpose === "access")
    return {
      label: link.accessVlan
        ? `ACCESS VLAN ${link.accessVlan}`
        : "ACCESS VLAN NOT SET",
      tone: "vlan",
    };
  if (purpose === "routed" && link.network)
    return { label: link.network, tone: "network" };
  const first = endpoint(topology, link.fromDeviceId, link.fromInterfaceId);
  const second = endpoint(topology, link.toDeviceId, link.toInterfaceId);
  const firstNetwork = deriveIpv4Network(first?.ipv4Address, first?.prefix);
  const secondNetwork = deriveIpv4Network(second?.ipv4Address, second?.prefix);
  if (purpose === "routed" && firstNetwork && secondNetwork && firstNetwork !== secondNetwork)
    return { label: "SUBNET MISMATCH", tone: "warning" };
  if (purpose === "routed" && (firstNetwork || secondNetwork))
    return { label: firstNetwork ?? secondNetwork!, tone: "network" };
  if (purpose === "routed")
    return { label: "NETWORK NOT SET", tone: "warning" };
  return { label: link.label || "ETHERNET LINK", tone: "neutral" };
}

interface GeometryRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function labelSize(
  text: string,
  kind: "endpoint" | "context",
  fontScale: number,
) {
  const scale = Math.max(1, Math.min(2, fontScale));
  const horizontalPadding = kind === "endpoint" ? 8 : 18;
  return {
    width: Math.max(
      kind === "endpoint" ? 30 : 64,
      text.length * (kind === "endpoint" ? 5 : 6.2) * scale +
        horizontalPadding,
    ),
    height: 20 * scale,
  };
}

function labelRect(
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

function overlaps(first: GeometryRect, second: GeometryRect, clearance = 4) {
  return !(
    first.right + clearance <= second.left ||
    first.left >= second.right + clearance ||
    first.bottom + clearance <= second.top ||
    first.top >= second.bottom + clearance
  );
}

function clippedEndpoint(
  from: WorkshopTopologyNodeBounds,
  to: WorkshopTopologyNodeBounds,
): WorkshopTopologyPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / distance;
  const unitY = dy / distance;
  const horizontal =
    Math.abs(unitX) < 0.0001
      ? Number.POSITIVE_INFINITY
      : from.width / 2 / Math.abs(unitX);
  const vertical =
    Math.abs(unitY) < 0.0001
      ? Number.POSITIVE_INFINITY
      : from.height / 2 / Math.abs(unitY);
  const edgeDistance = Math.min(horizontal, vertical);
  return { x: from.x + unitX * edgeDistance, y: from.y + unitY * edgeDistance };
}

function clampLabel(
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

function chooseLabelPosition(
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
      0.5, 0.46, 0.54, 0.42, 0.58, 0.38, 0.62, 0.34, 0.66, 0.26, 0.74,
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

function iface(
  id: string,
  name: string,
  address?: string,
  prefix?: number,
): WorkshopDeviceInterface {
  return {
    id,
    name,
    kind: "physical",
    state: "up",
    ipv4Address: address,
    prefix,
  };
}

function device(
  id: string,
  type: WorkshopDeviceType,
  name: string,
  x: number,
  y: number,
  interfaces: WorkshopDeviceInterface[],
): WorkshopTopologyDevice {
  return { id, type, name, x, y, interfaces, routes: [], configuration: {} };
}

function cable(
  id: string,
  a: string,
  ai: string,
  b: string,
  bi: string,
  extras: Partial<WorkshopTopologyLink> = {},
): WorkshopTopologyLink {
  return {
    id,
    fromDeviceId: a,
    fromInterfaceId: ai,
    toDeviceId: b,
    toInterfaceId: bi,
    state: "up",
    ...extras,
  };
}

export function createWorkshopTopologyStarter(
  starterId: WorkshopTopologyStarterId,
  topologyId = `topology-${Date.now()}`,
): WorkshopTopology {
  const base = (
    title: string,
    devices: WorkshopTopologyDevice[],
    links: WorkshopTopologyLink[],
    checklist: string[],
  ): WorkshopTopology => ({
    schemaVersion: 2,
    id: topologyId,
    starterId,
    title,
    accessibilityDescription: `${title}. Select a device or cable to inspect the instructor-provided configuration.`,
    devices,
    links,
    checklist,
  });
  if (starterId === "first-network") {
    const devices = [
      device("pc1", "pc", "PC1", 0.15, 0.5, [iface("e0", "E0")]),
      device("sw1", "switch", "SW1", 0.5, 0.5, [
        iface("f01", "F0/1"),
        iface("f02", "F0/2"),
      ]),
      device("pc2", "pc", "PC2", 0.85, 0.5, [iface("e0", "E0")]),
    ];
    return base(
      "First switched network",
      devices,
      [
        cable("l1", "pc1", "e0", "sw1", "f01"),
        cable("l2", "sw1", "f02", "pc2", "e0"),
      ],
      ["Assign endpoint addresses", "Confirm both links are up"],
    );
  }
  if (starterId === "vlan-trunk") {
    const sw1 = device("sw1", "switch", "SW1", 0.38, 0.5, [
      iface("f01", "F0/1"),
      iface("f024", "F0/24"),
    ]);
    const sw2 = device("sw2", "switch", "SW2", 0.68, 0.5, [
      iface("f024", "F0/24"),
      iface("f01", "F0/1"),
    ]);
    sw1.configuration = {
      vlans: [
        { id: 10, name: "USERS" },
        { id: 20, name: "SERVERS" },
      ],
    };
    sw2.configuration = { vlans: [{ id: 10 }, { id: 20 }] };
    return base(
      "VLAN access and trunking",
      [
        device("pc1", "pc", "PC1", 0.1, 0.5, [iface("e0", "E0")]),
        sw1,
        sw2,
        device("pc2", "pc", "PC2", 0.92, 0.5, [iface("e0", "E0")]),
      ],
      [
        cable("l1", "pc1", "e0", "sw1", "f01", { accessVlan: 10 }),
        cable("l2", "sw1", "f024", "sw2", "f024", { trunkVlans: [10, 20] }),
        cable("l3", "sw2", "f01", "pc2", "e0", { accessVlan: 20 }),
      ],
      ["Review access VLANs", "Review the trunk VLAN list"],
    );
  }
  if (starterId === "router-on-a-stick") {
    const router = device("r1", "router", "R1", 0.5, 0.18, [
      iface("g00", "G0/0"),
    ]);
    router.interfaces.push(
      {
        id: "g0010",
        name: "G0/0.10",
        kind: "subinterface",
        parentInterfaceId: "g00",
        encapsulationVlan: 10,
        state: "up",
        ipv4Address: "192.168.10.1",
        prefix: 24,
      },
      {
        id: "g0020",
        name: "G0/0.20",
        kind: "subinterface",
        parentInterfaceId: "g00",
        encapsulationVlan: 20,
        state: "up",
        ipv4Address: "192.168.20.1",
        prefix: 24,
      },
    );
    return base(
      "Router-on-a-Stick",
      [
        router,
        device("sw1", "switch", "SW1", 0.5, 0.52, [
          iface("f024", "F0/24"),
          iface("f01", "F0/1"),
          iface("f02", "F0/2"),
        ]),
        device("pc1", "pc", "PC1", 0.2, 0.82, [iface("e0", "E0")]),
        device("pc2", "pc", "PC2", 0.8, 0.82, [iface("e0", "E0")]),
      ],
      [
        cable("l1", "r1", "g00", "sw1", "f024", { trunkVlans: [10, 20] }),
        cable("l2", "sw1", "f01", "pc1", "e0", { accessVlan: 10 }),
        cable("l3", "sw1", "f02", "pc2", "e0", { accessVlan: 20 }),
      ],
      ["Confirm the switch trunk", "Review both 802.1Q subinterfaces"],
    );
  }
  if (starterId === "stp-redundancy" || starterId === "lacp-etherchannel") {
    const a = device("sw1", "switch", "SW1", 0.25, 0.25, [
      iface("f01", "F0/1"),
      iface("f02", "F0/2"),
      iface("f03", "F0/3"),
    ]);
    const b = device("sw2", "switch", "SW2", 0.75, 0.25, [
      iface("f01", "F0/1"),
      iface("f02", "F0/2"),
      iface("f03", "F0/3"),
    ]);
    if (starterId === "lacp-etherchannel") {
      a.interfaces.push({
        id: "po1",
        name: "Port-channel1",
        kind: "port-channel",
        state: "up",
      });
      b.interfaces.push({
        id: "po1",
        name: "Port-channel1",
        kind: "port-channel",
        state: "up",
      });
      a.configuration = {
        etherChannel: {
          groups: [
            {
              id: "po1",
              number: 1,
              portChannelInterfaceId: "po1",
              memberInterfaceIds: ["f01", "f02"],
              lacpMode: "active",
            },
          ],
        },
      };
      b.configuration = {
        etherChannel: {
          groups: [
            {
              id: "po1",
              number: 1,
              portChannelInterfaceId: "po1",
              memberInterfaceIds: ["f01", "f02"],
              lacpMode: "passive",
            },
          ],
        },
      };
      return base(
        "LACP EtherChannel",
        [a, b],
        [
          cable("l1", "sw1", "f01", "sw2", "f01", { trunkVlans: [10, 20] }),
          cable("l2", "sw1", "f02", "sw2", "f02", { trunkVlans: [10, 20] }),
        ],
        ["Review LACP modes", "Confirm compatible member settings"],
      );
    }
    const c = device("sw3", "switch", "SW3", 0.5, 0.78, [
      iface("f01", "F0/1"),
      iface("f02", "F0/2"),
    ]);
    a.configuration = { stp: { bridgePriority: 24576, rootRole: "root" } };
    return base(
      "Redundant STP switching",
      [a, b, c],
      [
        cable("l1", "sw1", "f01", "sw2", "f01", { trunkVlans: [10] }),
        cable("l2", "sw1", "f02", "sw3", "f01", { trunkVlans: [10] }),
        cable("l3", "sw2", "f02", "sw3", "f02", { trunkVlans: [10] }),
      ],
      ["Choose the root bridge", "Record forwarding and alternate port roles"],
    );
  }
  const routed =
    starterId === "static-routing" ||
    starterId === "single-area-ospf" ||
    starterId === "route-source";
  if (routed) {
    const r1 = device("r1", "router", "R1", 0.3, 0.5, [
      iface("g00", "G0/0", "192.168.10.1", 24),
      iface("g01", "G0/1", "10.0.12.1", 30),
    ]);
    const r2 = device("r2", "router", "R2", 0.5, 0.5, [
      iface("g00", "G0/0", "10.0.12.2", 30),
      iface("g01", "G0/1", "10.0.23.1", 30),
    ]);
    const r3 = device("r3", "router", "R3", 0.7, 0.5, [
      iface("g00", "G0/0", "10.0.23.2", 30),
      iface("g01", "G0/1", "192.168.30.1", 24),
    ]);
    if (starterId === "single-area-ospf")
      for (const [index, router] of [r1, r2, r3].entries())
        router.configuration = {
          ospf: {
            processId: 1,
            routerId: `${index + 1}.${index + 1}.${index + 1}.${index + 1}`,
            networks: router.interfaces.map((item) => ({
              id: item.id,
              network: deriveIpv4Network(item.ipv4Address, item.prefix)!,
              area: 0,
            })),
          },
        };
    r1.y = 0.3;
    r2.y = 0.7;
    r3.y = 0.3;
    if (starterId === "route-source")
      r2.configuration = {
        expectedState: {
          routeEntries: [
            {
              destination: "192.168.30.0/24",
              source: "OSPF",
              nextHop: "10.0.23.2",
              metric: 20,
            },
          ],
        },
      };
    return base(
      starterId === "static-routing"
        ? "Static routing"
        : starterId === "single-area-ospf"
          ? "Single-area OSPF"
          : "Route-source comparison",
      [
        device("pc1", "pc", "PC1", 0.08, 0.62, [
          iface("e0", "E0", "192.168.10.10", 24),
        ]),
        r1,
        r2,
        r3,
        device("pc3", "pc", "PC3", 0.92, 0.62, [
          iface("e0", "E0", "192.168.30.10", 24),
        ]),
      ],
      [
        cable("l1", "pc1", "e0", "r1", "g00"),
        cable("l2", "r1", "g01", "r2", "g00"),
        cable("l3", "r2", "g01", "r3", "g00"),
        cable("l4", "r3", "g01", "pc3", "e0"),
      ],
      [
        "Review every connected network",
        starterId === "static-routing"
          ? "Add forward and return static routes"
          : "Review route advertisements and installed routes",
      ],
    );
  }
  const r1 = device("r1", "router", "R1", 0.5, 0.5, [
    iface("g00", "G0/0", "192.168.10.1", 24),
    iface("g01", "G0/1", "203.0.113.1", 30),
  ]);
  const pc1 = device("pc1", "pc", "PC1", 0.12, 0.5, [
    iface("e0", "E0", "192.168.10.10", 24),
  ]);
  const server = device(
    "server1",
    "server",
    starterId === "dhcp-relay"
      ? "DHCP1"
      : starterId === "dns-service"
        ? "DNS1"
        : "WEB1",
    0.88,
    0.5,
    [iface("e0", "E0", "203.0.113.2", 30)],
  );
  if (starterId === "dhcp-relay") {
    r1.interfaces[0].protocolSettings = { dhcpRelayAddress: "203.0.113.2" };
    server.configuration = {
      services: {
        dhcpPools: [
          {
            id: "pool1",
            name: "CLIENTS",
            network: "192.168.10.0",
            prefix: 24,
            firstAddress: "192.168.10.100",
            lastAddress: "192.168.10.110",
            gateway: "192.168.10.1",
          },
        ],
      },
    };
  }
  if (starterId === "dns-service")
    server.configuration = {
      services: {
        dnsRecords: [
          {
            id: "a1",
            name: "server.netbite.test",
            type: "A",
            value: "203.0.113.2",
            ttl: 300,
          },
        ],
      },
    };
  if (starterId === "acl-placement")
    r1.configuration = {
      acl: {
        name: "OFFICE-POLICY",
        rules: [
          {
            id: "10",
            sequence: 10,
            action: "permit",
            protocol: "tcp",
            source: "192.168.10.0/24",
            destination: "203.0.113.2/32",
            destinationPort: 443,
          },
        ],
        applications: [{ interfaceId: "g00", direction: "in" }],
      },
    };
  if (starterId === "nat-pat") {
    r1.interfaces[0].protocolSettings = { natRole: "inside" };
    r1.interfaces[1].protocolSettings = { natRole: "outside" };
    r1.configuration = {
      nat: {
        eligibleNetworks: ["192.168.10.0/24"],
        overloadInterfaceId: "g01",
      },
    };
  }
  if (starterId === "ipv6-delivery") {
    pc1.interfaces[0].ipv6Addresses = [
      { id: "v6pc", address: "2001:db8:10::10", prefix: 64, scope: "global" },
    ];
    r1.interfaces[0].ipv6Addresses = [
      { id: "v6r", address: "2001:db8:10::1", prefix: 64, scope: "global" },
    ];
  }
  return base(
    topologyStarters.find((item) => item.id === starterId)!.title,
    [pc1, r1, server],
    [
      cable("l1", "pc1", "e0", "r1", "g00"),
      cable("l2", "r1", "g01", "server1", "e0"),
    ],
    ["Review interface addressing", "Add the protocol-specific teaching state"],
  );
}
