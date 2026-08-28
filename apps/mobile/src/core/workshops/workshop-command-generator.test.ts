import {
  commandGroupsTextFallback,
  deriveIpv4Network,
  fingerprintTopologyConfiguration,
  generateTopologyCommandGroups,
  prefixToSubnetMask,
} from '@netbite/workshops/command-generator';
import type { WorkshopTopology } from '@netbite/workshops/contracts';

const topology: WorkshopTopology = {
  id: "static-routing",
  title: "Static routing example",
  accessibilityDescription: "R1 is connected to SW1.",
  devices: [
    {
      id: "r1",
      type: "router",
      name: "R1",
      x: 0.3,
      y: 0.5,
      interfaces: [
        {
          id: "r1-g0",
          name: "G0/0",
          ipv4Address: "192.168.10.1",
          prefix: 24,
          state: "up",
        },
        {
          id: "r1-g1",
          name: "G0/1",
          ipv4Address: "10.0.12.1",
          prefix: 30,
          state: "down",
        },
      ],
      routes: [{ destination: "0.0.0.0", prefix: 0, nextHop: "10.0.12.2" }],
    },
    {
      id: "sw1",
      type: "switch",
      name: "SW1",
      x: 0.7,
      y: 0.5,
      interfaces: [
        { id: "sw1-f1", name: "F0/1", vlan: 10, state: "up" },
        { id: "sw1-f24", name: "F0/24", state: "up" },
      ],
    },
  ],
  links: [
    {
      id: "access",
      fromDeviceId: "r1",
      fromInterfaceId: "r1-g0",
      toDeviceId: "sw1",
      toInterfaceId: "sw1-f1",
      accessVlan: 10,
      state: "up",
    },
  ],
};

describe("workshop command generation", () => {
  test.each([
    [0, "0.0.0.0"],
    [24, "255.255.255.0"],
    [30, "255.255.255.252"],
    [32, "255.255.255.255"],
  ])("converts /%i to %s", (prefix, mask) => {
    expect(prefixToSubnetMask(prefix)).toBe(mask);
  });

  it("derives the network without changing the authored address", () => {
    expect(deriveIpv4Network("192.168.10.70", 26)).toBe("192.168.10.64/26");
  });

  it("generates editable router and switch starters", () => {
    const result = generateTopologyCommandGroups(topology);
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].commands).toEqual(
      expect.arrayContaining([
        " ip address 192.168.10.1 255.255.255.0",
        " shutdown",
        "ip route 0.0.0.0 0.0.0.0 10.0.12.2",
      ]),
    );
    expect(result.groups[1].commands).toEqual(
      expect.arrayContaining([
        " switchport mode access",
        " switchport access vlan 10",
      ]),
    );
    expect(commandGroupsTextFallback(result.groups)).toContain("R1\nenable");
  });

  it("warns instead of inventing incomplete interface values", () => {
    const incomplete: WorkshopTopology = JSON.parse(JSON.stringify(topology));
    incomplete.devices[0].interfaces[0].prefix = undefined;
    const result = generateTopologyCommandGroups(incomplete);
    expect(result.warnings[0]).toContain(
      "needs both a valid IPv4 address and prefix",
    );
    expect(result.groups[0].commands).not.toContain(
      expect.stringContaining("ip address 192.168.10.1"),
    );
  });

  it("changes the fingerprint when the source configuration changes", () => {
    const changed: WorkshopTopology = JSON.parse(JSON.stringify(topology));
    changed.devices[0].interfaces[0].ipv4Address = "192.168.10.2";
    expect(fingerprintTopologyConfiguration(changed)).not.toBe(
      fingerprintTopologyConfiguration(topology),
    );
  });
});
