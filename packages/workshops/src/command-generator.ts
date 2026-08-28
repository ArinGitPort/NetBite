import type {
  WorkshopCommandGroup,
  WorkshopTopology,
  WorkshopTopologyDevice,
  WorkshopTopologyLink,
} from "./workshop-contract";
import { prefixToSubnetMask } from "@netbite/networking";

export { deriveIpv4Network, prefixToSubnetMask } from "@netbite/networking";

export interface WorkshopCommandGenerationResult {
  groups: WorkshopCommandGroup[];
  warnings: string[];
  fingerprint: string;
}

export function commandGroupsTextFallback(groups: WorkshopCommandGroup[]) {
  return groups
    .map((group) => `${group.title}\n${group.commands.join("\n")}`)
    .join("\n\n");
}

function relevantLink(
  topology: WorkshopTopology,
  deviceId: string,
  interfaceId: string,
): WorkshopTopologyLink | undefined {
  return topology.links.find(
    (link) =>
      (link.fromDeviceId === deviceId &&
        link.fromInterfaceId === interfaceId) ||
      (link.toDeviceId === deviceId && link.toInterfaceId === interfaceId),
  );
}

function generateRouter(
  device: WorkshopTopologyDevice,
  warnings: string[],
): WorkshopCommandGroup {
  const commands = ["enable", "configure terminal"];
  for (const networkInterface of device.interfaces) {
    commands.push(`interface ${networkInterface.name}`);
    const mask =
      networkInterface.prefix == null
        ? null
        : prefixToSubnetMask(networkInterface.prefix);
    if (networkInterface.ipv4Address && mask) {
      commands.push(` ip address ${networkInterface.ipv4Address} ${mask}`);
    } else if (
      networkInterface.ipv4Address ||
      networkInterface.prefix != null
    ) {
      warnings.push(
        `${device.name} ${networkInterface.name} needs both a valid IPv4 address and prefix before an IP ADDRESS command can be generated.`,
      );
    }
    commands.push(
      networkInterface.state === "down" ? " shutdown" : " no shutdown",
    );
    commands.push("exit");
  }
  for (const route of device.routes ?? []) {
    const mask = prefixToSubnetMask(route.prefix);
    if (route.destination && route.nextHop && mask) {
      commands.push(`ip route ${route.destination} ${mask} ${route.nextHop}`);
    } else {
      warnings.push(
        `${device.name} has an incomplete static route that was not included.`,
      );
    }
  }
  commands.push("end");
  return {
    id: `commands-${device.id}`,
    title: device.name,
    deviceId: device.id,
    commands,
    explanation: `Configuration generated from the interfaces and static routes currently shown for ${device.name}.`,
  };
}

function generateSwitch(
  topology: WorkshopTopology,
  device: WorkshopTopologyDevice,
): WorkshopCommandGroup {
  const commands = ["enable", "configure terminal"];
  for (const networkInterface of device.interfaces) {
    const link = relevantLink(topology, device.id, networkInterface.id);
    commands.push(`interface ${networkInterface.name}`);
    if (link?.trunkVlans?.length) {
      commands.push(" switchport mode trunk");
      commands.push(
        ` switchport trunk allowed vlan ${[...new Set(link.trunkVlans)].sort((a, b) => a - b).join(",")}`,
      );
    } else {
      const accessVlan = link?.accessVlan ?? networkInterface.vlan;
      if (accessVlan != null) {
        commands.push(" switchport mode access");
        commands.push(` switchport access vlan ${accessVlan}`);
      }
    }
    commands.push(
      networkInterface.state === "down" ? " shutdown" : " no shutdown",
    );
    commands.push("exit");
  }
  commands.push("end");
  return {
    id: `commands-${device.id}`,
    title: device.name,
    deviceId: device.id,
    commands,
    explanation: `Configuration generated from the interfaces and VLAN links currently shown for ${device.name}.`,
  };
}

function canonicalConfiguration(topology: WorkshopTopology) {
  return JSON.stringify({
    devices: topology.devices
      .filter((device) => device.type === "router" || device.type === "switch")
      .map((device) => ({
        id: device.id,
        type: device.type,
        name: device.name,
        interfaces: device.interfaces,
        routes: device.routes ?? [],
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    links: topology.links
      .map((link) => ({
        fromDeviceId: link.fromDeviceId,
        fromInterfaceId: link.fromInterfaceId,
        toDeviceId: link.toDeviceId,
        toInterfaceId: link.toInterfaceId,
        accessVlan: link.accessVlan,
        trunkVlans: link.trunkVlans,
        state: link.state,
      }))
      .sort((a, b) =>
        `${a.fromDeviceId}:${a.fromInterfaceId}`.localeCompare(
          `${b.fromDeviceId}:${b.fromInterfaceId}`,
        ),
      ),
  });
}

export function fingerprintTopologyConfiguration(topology: WorkshopTopology) {
  const value = canonicalConfiguration(topology);
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function generateTopologyCommandGroups(
  topology: WorkshopTopology,
): WorkshopCommandGenerationResult {
  const warnings: string[] = [];
  const groups = topology.devices.flatMap((device) => {
    if (device.type === "router") return [generateRouter(device, warnings)];
    if (device.type === "switch") return [generateSwitch(topology, device)];
    return [];
  });
  if (!groups.length) {
    warnings.push(
      "Add a router or switch before generating configuration commands.",
    );
  }
  return {
    groups,
    warnings,
    fingerprint: fingerprintTopologyConfiguration(topology),
  };
}
