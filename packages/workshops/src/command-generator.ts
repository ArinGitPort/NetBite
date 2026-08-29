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

function aclSourceFromCidr(value: string) {
  const [address, prefixText] = value.split("/");
  const mask = prefixToSubnetMask(Number(prefixText));
  if (!address || !mask) return value;
  const wildcard = mask.split(".").map((part) => 255 - Number(part)).join(".");
  return `${address} ${wildcard}`;
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
    if (networkInterface.kind === "subinterface" && networkInterface.encapsulationVlan) {
      commands.push(` encapsulation dot1q ${networkInterface.encapsulationVlan}`);
    }
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
    for (const assignment of networkInterface.ipv6Addresses ?? []) {
      commands.push(` ipv6 address ${assignment.address}/${assignment.prefix}`);
    }
    if (networkInterface.protocolSettings?.dhcpRelayAddress)
      commands.push(` ip helper-address ${networkInterface.protocolSettings.dhcpRelayAddress}`);
    if (networkInterface.protocolSettings?.natRole)
      commands.push(` ip nat ${networkInterface.protocolSettings.natRole}`);
    commands.push(
      networkInterface.state === "down" ? " shutdown" : " no shutdown",
    );
    commands.push("exit");
  }
  const acl = device.configuration?.acl;
  if (acl) {
    commands.push(`ip access-list extended ${acl.name}`);
    for (const rule of [...acl.rules].sort((a, b) => a.sequence - b.sequence)) {
      commands.push(` ${rule.sequence} ${rule.action} ${rule.protocol} ${rule.source} ${rule.destination}${rule.destinationPort ? ` eq ${rule.destinationPort}` : ""}`);
    }
    commands.push("exit");
    for (const application of acl.applications ?? []) {
      const target = device.interfaces.find((item) => item.id === application.interfaceId);
      if (!target) continue;
      commands.push(`interface ${target.name}`, ` ip access-group ${acl.name} ${application.direction}`, "exit");
    }
  }
  const nat = device.configuration?.nat;
  if (nat) {
    nat.staticMappings?.forEach((mapping) => commands.push(`ip nat inside source static ${mapping.insideLocal} ${mapping.insideGlobal}`));
    if (nat.eligibleNetworks?.length) {
      commands.push("access-list 1 permit " + aclSourceFromCidr(nat.eligibleNetworks[0]));
      const overload = device.interfaces.find((item) => item.id === nat.overloadInterfaceId);
      if (overload) commands.push(`ip nat inside source list 1 interface ${overload.name} overload`);
    }
  }
  const ospf = device.configuration?.ospf;
  if (ospf) {
    commands.push(`router ospf ${ospf.processId}`, ` router-id ${ospf.routerId}`);
    for (const network of ospf.networks) {
      const [address, prefixText] = network.network.split("/");
      const prefix = Number(prefixText);
      const mask = prefixToSubnetMask(prefix);
      if (mask) {
        const wildcard = mask.split(".").map((part) => 255 - Number(part)).join(".");
        commands.push(` network ${address} ${wildcard} area ${network.area}`);
      }
    }
    commands.push("exit");
  }
  for (const route of device.routes ?? []) {
    if (route.addressFamily === "ipv6") {
      if (route.destination && route.nextHop && route.prefix >= 0 && route.prefix <= 128) {
        commands.push(`ipv6 route ${route.destination}/${route.prefix} ${route.nextHop}`);
      } else {
        warnings.push(
          `${device.name} has an incomplete IPv6 static route that was not included.`,
        );
      }
      continue;
    }
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
  for (const vlan of device.configuration?.vlans ?? []) {
    commands.push(`vlan ${vlan.id}`);
    if (vlan.name) commands.push(` name ${vlan.name}`);
    commands.push("exit");
  }
  for (const networkInterface of device.interfaces) {
    if (networkInterface.kind === "port-channel") continue;
    const link = relevantLink(topology, device.id, networkInterface.id);
    commands.push(`interface ${networkInterface.name}`);
    const switchport = networkInterface.switchport;
    const trunkVlans = switchport?.allowedVlans ?? link?.trunkVlans;
    if (switchport?.mode === "trunk" || trunkVlans?.length) {
      commands.push(" switchport mode trunk");
      if (trunkVlans?.length) commands.push(` switchport trunk allowed vlan ${[...new Set(trunkVlans)].sort((a, b) => a - b).join(",")}`);
    } else {
      const accessVlan = switchport?.accessVlan ?? link?.accessVlan ?? networkInterface.vlan;
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
  for (const group of device.configuration?.etherChannel?.groups ?? []) {
    const members = group.memberInterfaceIds.map((id) => device.interfaces.find((item) => item.id === id)?.name).filter(Boolean);
    if (members.length) commands.push(`interface range ${members.join(" , ")}`, ` channel-group ${group.number} mode ${group.lacpMode}`, "exit");
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
