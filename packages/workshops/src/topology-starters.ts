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

import { topologyStarters } from "./topology-starter-catalog";

export function iface(
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

export function device(
  id: string,
  type: WorkshopDeviceType,
  name: string,
  x: number,
  y: number,
  interfaces: WorkshopDeviceInterface[],
): WorkshopTopologyDevice {
  return { id, type, name, x, y, interfaces, routes: [], configuration: {} };
}

export function cable(
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
    accessibilityDescription:
      `${title}. Select a device or cable to inspect the instructor-provided configuration.`,
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
  const routed = starterId === "static-routing" ||
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
    if (starterId === "single-area-ospf") {
      for (const [index, router] of [r1, r2, r3].entries()) {
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
      }
    }
    r1.y = 0.3;
    r2.y = 0.7;
    r3.y = 0.3;
    if (starterId === "route-source") {
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
    }
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
  if (starterId === "dns-service") {
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
  }
  if (starterId === "acl-placement") {
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
  }
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
