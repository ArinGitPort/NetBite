import { describe, expect, test } from "vitest";
import { validateWorkshopTopology } from "@netbite/workshops/contracts";
import {
  calculateWorkshopTopologyGeometry,
  createWorkshopTopologyStarter,
  deriveWorkshopLinkPurpose,
  getAvailableConnectionInterfaces,
  hasWorkshopLinkPurposeConflict,
  normalizeWorkshopTopology,
  topologyStarters,
  validateWorkshopConnection,
} from "@netbite/workshops/topology-authoring";
import { generateTopologyCommandGroups } from "@netbite/workshops/command-generator";

describe("workshop topology authoring", () => {
  test("provides one valid editable starter for every curriculum pattern", () => {
    expect(topologyStarters).toHaveLength(13);
    for (const starter of topologyStarters) {
      const topology = createWorkshopTopologyStarter(starter.id, starter.id);
      expect(topology.schemaVersion).toBe(2);
      expect(topology.devices.length).toBeGreaterThan(1);
      expect(
        validateWorkshopTopology(topology).filter(
          (issue) => issue.severity === "error",
        ),
      ).toEqual([]);
    }
  });

  test("normalizes legacy interfaces without changing stable identifiers", () => {
    const legacy = createWorkshopTopologyStarter(
      "first-network",
      "stable-topology",
    );
    delete legacy.schemaVersion;
    delete legacy.devices[0].interfaces[0].kind;
    const normalized = normalizeWorkshopTopology(legacy);
    expect(normalized.id).toBe("stable-topology");
    expect(normalized.devices[0].interfaces[0].kind).toBe("physical");
  });

  test("normalizes legacy connection purposes without discarding conflicts", () => {
    const routed = createWorkshopTopologyStarter("static-routing");
    const normalized = normalizeWorkshopTopology(routed);
    expect(normalized.links.every((link) => link.purpose === "routed")).toBe(
      true,
    );

    const conflict = {
      ...normalized.links[0],
      purpose: undefined,
      accessVlan: 10,
      trunkVlans: [10, 20],
    };
    const conflicted = normalizeWorkshopTopology({
      ...normalized,
      links: [conflict],
    }).links[0];
    expect(conflicted.purpose).toBeUndefined();
    expect(hasWorkshopLinkPurposeConflict(conflicted)).toBe(true);
    expect(deriveWorkshopLinkPurpose(conflicted)).toBe("trunk");
  });

  test("requires explicit unused physical ports for a cable", () => {
    const topology = createWorkshopTopologyStarter("first-network");
    expect(getAvailableConnectionInterfaces(topology, "pc1")).toEqual([]);
    expect(
      validateWorkshopConnection(topology, "pc1", "e0", "pc2", "e0"),
    ).toMatch(/already has a cable/i);
  });

  test("rejects a cable attached directly to a router subinterface", () => {
    const topology = createWorkshopTopologyStarter("router-on-a-stick");
    topology.links[0].fromInterfaceId = "g0010";
    expect(
      validateWorkshopTopology(topology).some((issue) =>
        issue.message.includes("Physical cables"),
      ),
    ).toBe(true);
  });

  test("clips horizontal cables to device edges and keeps labels with their endpoint", () => {
    const topology = createWorkshopTopologyStarter("first-network");
    const viewport = { width: 1000, height: 600, fontScale: 1 };
    const bounds = topology.devices.map((device) => ({
      deviceId: device.id,
      x: device.x * viewport.width,
      y: device.y * viewport.height,
      width: 96,
      height: 72,
    }));
    const geometry = calculateWorkshopTopologyGeometry(
      topology,
      viewport,
      bounds,
    );
    expect(geometry).toHaveLength(topology.links.length);
    for (const cable of geometry) {
      const link = topology.links.find((item) => item.id === cable.linkId)!;
      const from = bounds.find((item) => item.deviceId === link.fromDeviceId)!;
      const to = bounds.find((item) => item.deviceId === link.toDeviceId)!;
      expect(
        Math.hypot(cable.start.x - from.x, cable.start.y - from.y),
      ).toBeGreaterThan(30);
      expect(
        Math.hypot(cable.end.x - to.x, cable.end.y - to.y),
      ).toBeGreaterThan(30);
      expect(
        Math.hypot(
          cable.endpointLabels[0].x - cable.start.x,
          cable.endpointLabels[0].y - cable.start.y,
        ),
      ).toBeLessThan(
        Math.hypot(
          cable.endpointLabels[0].x - cable.end.x,
          cable.endpointLabels[0].y - cable.end.y,
        ),
      );
      expect(
        Math.hypot(
          cable.endpointLabels[1].x - cable.end.x,
          cable.endpointLabels[1].y - cable.end.y,
        ),
      ).toBeLessThan(
        Math.hypot(
          cable.endpointLabels[1].x - cable.start.x,
          cable.endpointLabels[1].y - cable.start.y,
        ),
      );
    }
  });

  test("keeps every label center directly on its cable", () => {
    const topology = createWorkshopTopologyStarter("vlan-trunk");
    const viewport = { width: 1200, height: 620, fontScale: 1 };
    const geometry = calculateWorkshopTopologyGeometry(
      topology,
      viewport,
      topology.devices.map((device) => ({
        deviceId: device.id,
        x: device.x * viewport.width,
        y: device.y * viewport.height,
        width: 96,
        height: 72,
      })),
    );
    for (const cable of geometry) {
      const dx = cable.end.x - cable.start.x;
      const dy = cable.end.y - cable.start.y;
      for (const label of [...cable.endpointLabels, cable.contextLabel]) {
        const cross =
          (label.x - cable.start.x) * dy -
          (label.y - cable.start.y) * dx;
        expect(Math.abs(cross)).toBeLessThan(0.001);
      }
    }
  });

  test("keeps complete network captions inside the viewport at large font scale", () => {
    const topology = createWorkshopTopologyStarter("static-routing");
    const viewport = { width: 1440, height: 680, fontScale: 2 };
    const geometry = calculateWorkshopTopologyGeometry(
      topology,
      viewport,
      topology.devices.map((device) => ({
        deviceId: device.id,
        x: device.x * viewport.width,
        y: device.y * viewport.height,
        width: 96,
        height: 72,
      })),
    );
    const captions = geometry.map((cable) => cable.contextLabel);
    expect(captions.map((label) => label.text)).toEqual(
      expect.arrayContaining([
        "192.168.10.0/24",
        "10.0.12.0/30",
        "10.0.23.0/30",
        "192.168.30.0/24",
      ]),
    );
    for (const label of geometry.flatMap((cable) => [
      ...cable.endpointLabels,
      cable.contextLabel,
    ])) {
      expect(label.x - label.width / 2).toBeGreaterThanOrEqual(0);
      expect(label.x + label.width / 2).toBeLessThanOrEqual(viewport.width);
      expect(label.y - label.height / 2).toBeGreaterThanOrEqual(0);
      expect(label.y + label.height / 2).toBeLessThanOrEqual(viewport.height);
    }
  });

  test("places cable labels outside device cards and other label plates", () => {
    const topology = createWorkshopTopologyStarter("single-area-ospf");
    const viewport = { width: 1280, height: 680, fontScale: 1 };
    const nodes = topology.devices.map((device) => ({
      deviceId: device.id,
      x: device.x * viewport.width,
      y: device.y * viewport.height,
      width: 96,
      height: 72,
    }));
    const labels = calculateWorkshopTopologyGeometry(
      topology,
      viewport,
      nodes,
    ).flatMap((cable) => [...cable.endpointLabels, cable.contextLabel]);
    const rectangles = labels.map((label) => ({
      id: label.id,
      left: label.x - label.width / 2,
      right: label.x + label.width / 2,
      top: label.y - label.height / 2,
      bottom: label.y + label.height / 2,
    }));
    const intersects = (
      first: { left: number; right: number; top: number; bottom: number },
      second: { left: number; right: number; top: number; bottom: number },
    ) =>
      first.left < second.right &&
      first.right > second.left &&
      first.top < second.bottom &&
      first.bottom > second.top;
    for (const label of rectangles) {
      expect(
        nodes.some((node) =>
          intersects(label, {
            left: node.x - node.width / 2,
            right: node.x + node.width / 2,
            top: node.y - node.height / 2,
            bottom: node.y + node.height / 2,
          }),
        ),
      ).toBe(false);
      expect(
        rectangles.some(
          (other) => other.id !== label.id && intersects(label, other),
        ),
      ).toBe(false);
    }
  });

  test.each([
    ["horizontal", 0.2, 0.5, 0.8, 0.5],
    ["vertical", 0.5, 0.2, 0.5, 0.8],
    ["shallow diagonal", 0.15, 0.42, 0.85, 0.58],
    ["steep diagonal", 0.42, 0.12, 0.58, 0.88],
  ])("keeps %s cable geometry finite and clipped", (_name, x1, y1, x2, y2) => {
    const topology = createWorkshopTopologyStarter("first-network");
    const link = topology.links[0];
    const first = topology.devices.find(
      (device) => device.id === link.fromDeviceId,
    )!;
    const second = topology.devices.find(
      (device) => device.id === link.toDeviceId,
    )!;
    Object.assign(first, { x: x1, y: y1 });
    Object.assign(second, { x: x2, y: y2 });
    topology.links = [link];
    const viewport = { width: 900, height: 560, fontScale: 1 };
    const nodes = [first, second].map((device) => ({
      deviceId: device.id,
      x: device.x * viewport.width,
      y: device.y * viewport.height,
      width: 96,
      height: 72,
    }));
    const [cable] = calculateWorkshopTopologyGeometry(
      topology,
      viewport,
      nodes,
    );
    expect(
      [cable.start.x, cable.start.y, cable.end.x, cable.end.y].every(
        Number.isFinite,
      ),
    ).toBe(true);
    expect(cable.start).not.toEqual({ x: nodes[0].x, y: nodes[0].y });
    expect(cable.end).not.toEqual({ x: nodes[1].x, y: nodes[1].y });
  });

  test("keeps a long IPv6 link caption complete", () => {
    const topology = createWorkshopTopologyStarter("first-network");
    topology.links = [topology.links[0]];
    topology.links[0].network = "2001:db8:1234:5678::/64";
    const viewport = { width: 768, height: 480, fontScale: 1 };
    const geometry = calculateWorkshopTopologyGeometry(
      topology,
      viewport,
      topology.devices.map((device) => ({
        deviceId: device.id,
        x: device.x * viewport.width,
        y: device.y * viewport.height,
        width: 96,
        height: 72,
      })),
    );
    expect(geometry[0].contextLabel.text).toBe("2001:db8:1234:5678::/64");
    expect(geometry[0].contextLabel.width).toBeGreaterThan(
      geometry[0].contextLabel.text.length * 6,
    );
  });

  test("generates router-on-a-stick and OSPF command references", () => {
    const subinterfaces = generateTopologyCommandGroups(
      createWorkshopTopologyStarter("router-on-a-stick"),
    );
    expect(subinterfaces.groups[0].commands).toContain(
      " encapsulation dot1q 10",
    );
    const ospf = generateTopologyCommandGroups(
      createWorkshopTopologyStarter("single-area-ospf"),
    );
    expect(ospf.groups.flatMap((group) => group.commands)).toContain(
      "router ospf 1",
    );
    expect(ospf.groups.flatMap((group) => group.commands)).toContain(
      " network 10.0.12.0 0.0.0.3 area 0",
    );
  });

  test("generates IPv6 interface and static-route references", () => {
    const topology = createWorkshopTopologyStarter("ipv6-delivery");
    const router = topology.devices.find((device) => device.type === "router")!;
    router.routes = [
      {
        addressFamily: "ipv6",
        destination: "2001:db8:30::",
        prefix: 64,
        nextHop: "2001:db8:20::2",
      },
    ];
    const commands = generateTopologyCommandGroups(topology).groups.flatMap(
      (group) => group.commands,
    );
    expect(commands).toContain(" ipv6 address 2001:db8:10::1/64");
    expect(commands).toContain("ipv6 route 2001:db8:30::/64 2001:db8:20::2");
  });
});
