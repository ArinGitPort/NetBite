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

import { type WorkshopLinkContext } from "./topology-authoring-types";

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
        purpose: link.purpose ??
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
  if (!from || !to || !fromInterface || !toInterface) {
    return "Choose an existing device and interface at both ends.";
  }
  if (
    !isPhysicalInterface(fromInterface) || !isPhysicalInterface(toInterface)
  ) {
    return "Cables can connect only physical interfaces.";
  }
  const used = usedCableEndpointIds(topology);
  if (
    used.has(`${fromDeviceId}:${fromInterfaceId}`) ||
    used.has(`${toDeviceId}:${toInterfaceId}`)
  ) {
    return "One of these interfaces already has a cable.";
  }
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
  if (kind === "port-channel") {
    return `Port-channel${
      Math.max(
        1,
        device.interfaces.filter((item) => item.kind === "port-channel")
          .length + 1,
      )
    }`;
  }
  const number = device.interfaces.filter(isPhysicalInterface).length;
  if (device.type === "router") return `G0/${number}`;
  if (device.type === "switch") return `F0/${number + 1}`;
  return number ? `E${number}` : "E0";
}

export function endpoint(
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
  if ((link.state ?? "up") === "down") {
    return { label: "LINK DOWN", tone: "warning" };
  }
  if (hasWorkshopLinkPurposeConflict(link)) {
    return { label: "NEEDS ATTENTION", tone: "warning" };
  }
  const purpose = deriveWorkshopLinkPurpose(link, topology);
  if (purpose === "trunk") {
    return {
      label: link.trunkVlans?.length
        ? `TRUNK VLANs ${
          [...new Set(link.trunkVlans)].sort((a, b) => a - b).join(", ")
        }`
        : "TRUNK VLANs NOT SET",
      tone: "vlan",
    };
  }
  if (purpose === "access") {
    return {
      label: link.accessVlan
        ? `ACCESS VLAN ${link.accessVlan}`
        : "ACCESS VLAN NOT SET",
      tone: "vlan",
    };
  }
  if (purpose === "routed" && link.network) {
    return { label: link.network, tone: "network" };
  }
  const first = endpoint(topology, link.fromDeviceId, link.fromInterfaceId);
  const second = endpoint(topology, link.toDeviceId, link.toInterfaceId);
  const firstNetwork = deriveIpv4Network(first?.ipv4Address, first?.prefix);
  const secondNetwork = deriveIpv4Network(second?.ipv4Address, second?.prefix);
  if (
    purpose === "routed" && firstNetwork && secondNetwork &&
    firstNetwork !== secondNetwork
  ) {
    return { label: "SUBNET MISMATCH", tone: "warning" };
  }
  if (purpose === "routed" && (firstNetwork || secondNetwork)) {
    return { label: firstNetwork ?? secondNetwork!, tone: "network" };
  }
  if (purpose === "routed") {
    return { label: "NETWORK NOT SET", tone: "warning" };
  }
  return { label: link.label || "ETHERNET LINK", tone: "neutral" };
}
