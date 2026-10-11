import { event, failure } from "./sandbox-trace";
import {
  endpointKey,
  findDevice,
  findInterface,
} from "./sandbox-device-lookup";
import {
  type SandboxDevice,
  type SandboxInterface,
  type SandboxLink,
  type SandboxLinkEndpoint,
  type SandboxTraceResult,
  type SandboxWorkspace,
} from "./sandbox-types";
import { BROADCAST_MAC, cloneWorkspace } from "./sandbox-workspace";

export function linkOtherEndpoint(
  link: SandboxLink,
  endpoint: SandboxLinkEndpoint,
) {
  return endpointKey(link.a) === endpointKey(endpoint) ? link.b : link.a;
}
export function physicalInterface(
  device: SandboxDevice,
  item: SandboxInterface,
) {
  return item.parentInterfaceId
    ? findInterface(device, item.parentInterfaceId)
    : item;
}
export function interfaceOperational(
  device: SandboxDevice,
  item: SandboxInterface,
) {
  if (!item.adminUp) return false;
  if (!item.parentInterfaceId) return true;
  const parent = findInterface(device, item.parentInterfaceId);
  return Boolean(parent?.adminUp && item.encapsulationVlan !== undefined);
}
export function interfaceCarriesVlan(
  device: SandboxDevice,
  item: SandboxInterface,
  vlan: number,
) {
  if (!item.adminUp) return false;
  if (device.type !== "switch") return true;
  return item.switchportMode === "trunk"
    ? Boolean(item.allowedVlans?.includes(vlan))
    : (item.accessVlan ?? 1) === vlan;
}

export function inferSourceVlan(
  state: SandboxWorkspace,
  deviceId: string,
  interfaceId: string,
) {
  const sourceDevice = findDevice(state, deviceId);
  const sourceInterface = findInterface(sourceDevice, interfaceId);
  if (
    sourceInterface?.parentInterfaceId &&
    sourceInterface.encapsulationVlan !== undefined
  ) return sourceInterface.encapsulationVlan;
  const physicalId = sourceInterface?.parentInterfaceId ?? interfaceId;
  const link = state.links.find((candidate) =>
    [endpointKey(candidate.a), endpointKey(candidate.b)].includes(
      `${deviceId}:${physicalId}`,
    )
  );
  if (!link) return 1;
  const other = linkOtherEndpoint(link, { deviceId, interfaceId });
  const otherDevice = findDevice(state, other.deviceId);
  const otherInterface = findInterface(otherDevice, other.interfaceId);
  return otherDevice?.type === "switch" &&
      otherInterface?.switchportMode !== "trunk"
    ? otherInterface?.accessVlan ?? 1
    : 1;
}

export function layer2Path(
  state: SandboxWorkspace,
  source: SandboxLinkEndpoint,
  destination: SandboxLinkEndpoint,
  vlan: number,
  enforceVlan = true,
) {
  const queue: {
    endpoint: SandboxLinkEndpoint;
    devices: string[];
    links: string[];
  }[] = [{ endpoint: source, devices: [source.deviceId], links: [] }];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = endpointKey(current.endpoint);
    if (key === endpointKey(destination)) return current;
    if (visited.has(key)) continue;
    visited.add(key);
    const currentDevice = findDevice(state, current.endpoint.deviceId);
    const currentInterface = findInterface(
      currentDevice,
      current.endpoint.interfaceId,
    );
    if (
      !currentDevice || !currentInterface || !currentInterface.adminUp ||
      (enforceVlan &&
        !interfaceCarriesVlan(currentDevice, currentInterface, vlan))
    ) continue;
    if (currentDevice.type === "switch") {
      currentDevice.interfaces.filter((item) =>
        item.id !== currentInterface.id && item.adminUp &&
        (!enforceVlan || interfaceCarriesVlan(currentDevice, item, vlan))
      ).forEach((item) => {
        queue.push({
          endpoint: { deviceId: currentDevice.id, interfaceId: item.id },
          devices: current.devices,
          links: current.links,
        });
      });
    }
    state.links.filter((link) =>
      endpointKey(link.a) === key || endpointKey(link.b) === key
    ).forEach((link) => {
      const other = linkOtherEndpoint(link, current.endpoint);
      queue.push({
        endpoint: other,
        devices: current.devices.includes(other.deviceId)
          ? current.devices
          : [...current.devices, other.deviceId],
        links: [...current.links, link.id],
      });
    });
  }
  return undefined;
}

export function learnAlongPath(
  state: SandboxWorkspace,
  deviceIds: string[],
  linkIds: string[],
  sourceMac: string,
  vlan: number,
) {
  deviceIds.forEach((deviceId) => {
    const device = findDevice(state, deviceId);
    if (device?.type !== "switch") return;
    const link = linkIds
      .map((linkId) => state.links.find((candidate) => candidate.id === linkId))
      .find((candidate) =>
        candidate?.a.deviceId === deviceId || candidate?.b.deviceId === deviceId
      );
    const interfaceId = link?.a.deviceId === deviceId
      ? link.a.interfaceId
      : link?.b.interfaceId;
    if (!interfaceId) return;
    const existing = device.macTable.find((entry) =>
      entry.macAddress === sourceMac && entry.vlan === vlan
    );
    if (existing?.interfaceId === interfaceId) return;
    device.macTable = [
      ...device.macTable.filter((entry) =>
        !(entry.macAddress === sourceMac && entry.vlan === vlan)
      ),
      { macAddress: sourceMac, interfaceId, vlan },
    ];
  });
}

export function processSandboxFrame(
  state: SandboxWorkspace,
  sourceDeviceId: string,
  destinationMac = BROADCAST_MAC,
): SandboxTraceResult {
  const next = cloneWorkspace(state);
  const source = findDevice(next, sourceDeviceId);
  const sourceInterface = source?.interfaces.find((item) => item.adminUp);
  if (!source || !sourceInterface) {
    return failure(
      next,
      "No active source interface.",
      "The frame was not sent.",
      "Enable and connect an interface.",
    );
  }
  const destination = destinationMac === BROADCAST_MAC
    ? undefined
    : next.devices.find((device) =>
      device.interfaces.some((item) =>
        item.macAddress === destinationMac.toUpperCase()
      )
    );
  if (destinationMac !== BROADCAST_MAC && !destination) {
    return failure(
      next,
      "Destination MAC is not present.",
      "The destination is unknown in this workspace.",
      "Choose an existing endpoint or send a broadcast.",
    );
  }
  const vlan = inferSourceVlan(next, source.id, sourceInterface.id);
  const destinationInterface = destination?.interfaces.find((item) =>
    item.macAddress === destinationMac.toUpperCase()
  );
  const sourceEndpoint = {
    deviceId: source.id,
    interfaceId: sourceInterface.id,
  };
  const path = destination && destinationInterface
    ? layer2Path(next, sourceEndpoint, {
      deviceId: destination.id,
      interfaceId: destinationInterface.id,
    }, vlan)
    : undefined;
  if (destination && !path) {
    return failure(
      next,
      `No Layer 2 path carries VLAN ${vlan}.`,
      "The frame cannot reach the selected destination.",
      "Check links, access VLANs, and both trunk endpoints.",
    );
  }
  const floodPaths = destination
    ? []
    : next.devices.flatMap((device) =>
      device.interfaces.flatMap((item) => {
        if (
          device.id === source.id && item.id === sourceInterface.id
        ) return [];
        const candidate = layer2Path(next, sourceEndpoint, {
          deviceId: device.id,
          interfaceId: item.id,
        }, vlan);
        return candidate ? [candidate] : [];
      })
    );
  const devices = path?.devices ??
    [...new Set([source.id, ...floodPaths.flatMap((item) => item.devices)])];
  const links = path?.links ??
    [...new Set(floodPaths.flatMap((item) => item.links))];
  const firstSwitch = devices.map((id) => findDevice(next, id)).find((device) =>
    device?.type === "switch"
  );
  const destinationKnown = Boolean(
    destination &&
      firstSwitch?.macTable.some((entry) =>
        entry.macAddress === destinationMac.toUpperCase() && entry.vlan === vlan
      ),
  );
  learnAlongPath(next, devices, links, sourceInterface.macAddress, vlan);
  return {
    success: true,
    reason: destination
      ? `Frame delivered in VLAN ${vlan}.`
      : `Broadcast emitted in VLAN ${vlan}.`,
    conclusion: destination
      ? "The selected Layer 2 path is available."
      : "Broadcasts remain inside the selected VLAN broadcast domain.",
    events: [
      event(
        "frame-source",
        "FRAME CREATED",
        `${source.name} uses source MAC ${sourceInterface.macAddress}.`,
        [source.id],
        [],
        "active",
      ),
      event(
        "frame-path",
        destination
          ? destinationKnown
            ? "KNOWN UNICAST FORWARDED"
            : "UNKNOWN UNICAST FLOODED"
          : "BROADCAST FLOODED",
        destination
          ? destinationKnown
            ? `The switch uses its VLAN ${vlan} MAC entry for the selected path.`
            : `The unknown destination is flooded in VLAN ${vlan}; only the addressed endpoint accepts it.`
          : `Switches flood VLAN ${vlan} except toward each ingress port.`,
        devices,
        links,
        "success",
      ),
    ],
    state: next,
  };
}
