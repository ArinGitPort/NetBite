import {
  calculateSubnetRange,
  parseIPv4Address,
  type RouteEntry,
  selectBestRoute,
} from "@/core/network/advanced-networking";

import { muted, normal, success, warning } from "./cli-commands";
import {
  type CliDeviceState,
  type CliInterfaceState,
  type CliNetworkState,
  type CliOutputLine,
  type PathTraceResult,
  type PingSimulation,
} from "./cli-types";

export function modeError(expected: string): CliOutputLine[] {
  return [warning(`NETBITE: This command is available in ${expected}.`)];
}

export function deriveConnectedRoutes(device: CliDeviceState): RouteEntry[] {
  return device.interfaces.flatMap((item) => {
    const parent = item.parentInterface
      ? device.interfaces.find((candidate) =>
        candidate.name === item.parentInterface
      )
      : undefined;
    const operational = item.adminUp && item.linkUp &&
      (!parent ||
        (parent.adminUp && parent.linkUp &&
          item.encapsulationVlan !== undefined));
    if (!item.ipv4 || item.prefix === undefined || !operational) return [];
    const range = calculateSubnetRange(item.ipv4, item.prefix);
    return range
      ? [{
        prefix: range.network,
        prefixLength: item.prefix,
        exitInterface: item.name,
        source: "connected" as const,
      }]
      : [];
  });
}

export function showRunningConfig(device: CliDeviceState) {
  const lines = [`HOSTNAME ${device.name}`];
  device.interfaces.forEach((item) => {
    lines.push(`INTERFACE ${item.name}`);
    if (item.ipv4 && item.prefix !== undefined) {
      lines.push(`  IP ADDRESS ${item.ipv4}/${item.prefix}`);
    }
    if (item.parentInterface) lines.push(`  PARENT ${item.parentInterface}`);
    if (item.encapsulationVlan !== undefined) {
      lines.push(`  ENCAPSULATION DOT1Q ${item.encapsulationVlan}`);
    }
    lines.push(
      `  STATE ${item.adminUp ? "ENABLED" : "DISABLED"} / LINK ${
        item.linkUp ? "UP" : "DOWN"
      }`,
    );
    if (item.switchportMode) {
      lines.push(`  SWITCHPORT MODE ${item.switchportMode.toUpperCase()}`);
    }
    if (item.accessVlan) lines.push(`  ACCESS VLAN ${item.accessVlan}`);
    if (item.allowedVlans) {
      lines.push(`  ALLOWED VLANS ${item.allowedVlans.join(",")}`);
    }
  });
  device.routes.forEach((route) =>
    lines.push(
      `IP ROUTE ${route.prefix}/${route.prefixLength} VIA ${route.nextHop}`,
    )
  );
  return lines.map(normal);
}

export function showIpRoute(device: CliDeviceState) {
  const routes = [...deriveConnectedRoutes(device), ...device.routes];
  return routes.length
    ? routes.map((route) =>
      normal(
        `${
          route.source === "connected"
            ? "C"
            : route.source === "default"
            ? "D"
            : "S"
        } ${route.prefix}/${route.prefixLength} ${
          route.nextHop
            ? `VIA ${route.nextHop}`
            : `DIRECT ${route.exitInterface}`
        }`,
      )
    )
    : [muted("NO USABLE ROUTES")];
}

export function findDevice(state: CliNetworkState, id: string) {
  return state.devices.find((device) => device.id === id);
}
export function findInterface(device: CliDeviceState, name?: string) {
  return device.interfaces.find((item) => item.name === name);
}
export function cliInterfaceOperational(
  device: CliDeviceState,
  item: CliInterfaceState,
) {
  if (!item.adminUp || !item.linkUp) return false;
  if (!item.parentInterface) return true;
  const parent = findInterface(device, item.parentInterface);
  return Boolean(
    parent?.adminUp && parent.linkUp && item.encapsulationVlan !== undefined,
  );
}
export function cliPhysicalInterface(
  device: CliDeviceState,
  item: CliInterfaceState,
) {
  return item.parentInterface
    ? findInterface(device, item.parentInterface)
    : item;
}
export function cliInterfaceCarriesVlan(
  device: CliDeviceState,
  item: CliInterfaceState,
  vlan: number,
) {
  if (!item.adminUp || !item.linkUp) return false;
  if (device.type !== "switch") return true;
  return item.switchportMode === "trunk"
    ? Boolean(item.allowedVlans?.includes(vlan))
    : (item.accessVlan ?? 1) === vlan;
}
export function cliVlanForInterface(
  state: CliNetworkState,
  device: CliDeviceState,
  item: CliInterfaceState,
) {
  if (item.parentInterface && item.encapsulationVlan !== undefined) {
    return item.encapsulationVlan;
  }
  const physical = cliPhysicalInterface(device, item);
  const link = state.links.find((candidate) =>
    (candidate.aDeviceId === device.id &&
      candidate.aInterface === physical?.name) ||
    (candidate.bDeviceId === device.id &&
      candidate.bInterface === physical?.name)
  );
  if (!link) return 1;
  const otherDeviceId = link.aDeviceId === device.id
    ? link.bDeviceId
    : link.aDeviceId;
  const otherInterfaceName = link.aDeviceId === device.id
    ? link.bInterface
    : link.aInterface;
  const otherDevice = findDevice(state, otherDeviceId);
  const otherInterface = otherDevice
    ? findInterface(otherDevice, otherInterfaceName)
    : undefined;
  return otherDevice?.type === "switch" && otherInterface &&
      otherInterface.switchportMode !== "trunk"
    ? otherInterface.accessVlan ?? 1
    : 1;
}
export function cliLayer2Path(
  state: CliNetworkState,
  sourceDevice: CliDeviceState,
  sourceInterface: CliInterfaceState,
  targetDevice: CliDeviceState,
  targetInterface: CliInterfaceState,
  vlan: number,
) {
  const sourcePhysical = cliPhysicalInterface(sourceDevice, sourceInterface);
  const targetPhysical = cliPhysicalInterface(targetDevice, targetInterface);
  if (!sourcePhysical || !targetPhysical) return false;
  const queue = [{
    deviceId: sourceDevice.id,
    interfaceName: sourcePhysical.name,
  }];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = `${current.deviceId}:${current.interfaceName}`;
    if (key === `${targetDevice.id}:${targetPhysical.name}`) return true;
    if (visited.has(key)) continue;
    visited.add(key);
    const device = findDevice(state, current.deviceId);
    const item = device
      ? findInterface(device, current.interfaceName)
      : undefined;
    if (!device || !item || !cliInterfaceCarriesVlan(device, item, vlan)) {
      continue;
    }
    if (device.type === "switch") {
      device.interfaces.filter((candidate) =>
        candidate.name !== item.name &&
        cliInterfaceCarriesVlan(device, candidate, vlan)
      )
        .forEach((candidate) =>
          queue.push({ deviceId: device.id, interfaceName: candidate.name })
        );
    }
    state.links.filter((link) =>
      (link.aDeviceId === device.id && link.aInterface === item.name) ||
      (link.bDeviceId === device.id && link.bInterface === item.name)
    ).forEach((link) =>
      queue.push(
        link.aDeviceId === device.id
          ? { deviceId: link.bDeviceId, interfaceName: link.bInterface }
          : { deviceId: link.aDeviceId, interfaceName: link.aInterface },
      )
    );
  }
  return false;
}

export function traceIPv4Path(
  state: CliNetworkState,
  sourceDeviceId: string,
  destination: string,
): PathTraceResult {
  if (!parseIPv4Address(destination)) {
    return { success: false, reason: "invalid-destination", hops: [] };
  }
  let current = findDevice(state, sourceDeviceId);
  if (!current) {
    return { success: false, reason: "next-hop-unreachable", hops: [] };
  }
  const visited = new Set<string>();
  const hops: string[] = [];
  for (let count = 0; count <= state.devices.length + 1; count += 1) {
    if (visited.has(current.id)) {
      return { success: false, reason: "loop", hops };
    }
    visited.add(current.id);
    hops.push(current.name);
    if (
      current.interfaces.some((item) =>
        item.ipv4 === destination && cliInterfaceOperational(current!, item)
      )
    ) return { success: true, reason: "delivered", hops };
    if (
      current.interfaces.some((item) => item.ipv4) &&
      !current.interfaces.some((item) =>
        item.ipv4 && item.adminUp && item.linkUp
      )
    ) {
      return { success: false, reason: "interface-down", hops };
    }
    const route = selectBestRoute(destination, [
      ...deriveConnectedRoutes(current),
      ...current.routes,
    ]);
    if (!route) return { success: false, reason: "no-route", hops };
    if (!route.nextHop) {
      const target = state.devices.find((device) =>
        device.interfaces.some((item) =>
          item.ipv4 === destination && cliInterfaceOperational(device, item)
        )
      );
      if (!target) {
        return { success: false, reason: "next-hop-unreachable", hops };
      }
      const outgoing = findInterface(current, route.exitInterface) ??
        current.interfaces.find((item) => item.ipv4);
      const targetInterface = target.interfaces.find((item) =>
        item.ipv4 === destination
      )!;
      if (
        !outgoing ||
        !cliLayer2Path(
          state,
          current,
          outgoing,
          target,
          targetInterface,
          cliVlanForInterface(state, current, outgoing),
        )
      ) return { success: false, reason: "next-hop-unreachable", hops };
      current = target;
      continue;
    }
    const next = state.devices.find((device) =>
      device.interfaces.some((item) =>
        item.ipv4 === route.nextHop && cliInterfaceOperational(device, item)
      )
    );
    if (!next) return { success: false, reason: "next-hop-unreachable", hops };
    const outgoing = findInterface(current, route.exitInterface) ??
      current.interfaces.find((item) =>
        item.ipv4 &&
        calculateSubnetRange(item.ipv4, item.prefix ?? -1)?.network ===
          calculateSubnetRange(route.nextHop!, item.prefix ?? -1)?.network
      );
    const nextInterface = next.interfaces.find((item) =>
      item.ipv4 === route.nextHop
    )!;
    if (
      !outgoing ||
      !cliLayer2Path(
        state,
        current,
        outgoing,
        next,
        nextInterface,
        cliVlanForInterface(state, current, outgoing),
      )
    ) return { success: false, reason: "next-hop-unreachable", hops };
    current = next;
  }
  return { success: false, reason: "loop", hops };
}

export function simulatePing(
  state: CliNetworkState,
  sourceDeviceId: string,
  destination: string,
): PingSimulation {
  const forward = traceIPv4Path(state, sourceDeviceId, destination);
  if (!forward.success) {
    return {
      success: false,
      forward,
      output: [
        normal(`PING TARGET ${destination}`),
        warning(
          `NO ECHO REPLY / ${
            forward.reason.replaceAll("-", " ").toUpperCase()
          }`,
        ),
        muted(`CHECKED PATH ${forward.hops.join(" → ") || "NONE"}`),
      ],
    };
  }
  const destinationDevice = state.devices.find((device) =>
    device.interfaces.some((item) => item.ipv4 === destination)
  );
  const sourceDevice = findDevice(state, sourceDeviceId);
  const sourceRoute = sourceDevice
    ? selectBestRoute(destination, [
      ...deriveConnectedRoutes(sourceDevice),
      ...sourceDevice.routes,
    ])
    : undefined;
  const sourceAddress = sourceDevice
    ? findInterface(sourceDevice, sourceRoute?.exitInterface)?.ipv4 ??
      sourceDevice.interfaces.find((item) =>
        item.ipv4 && cliInterfaceOperational(sourceDevice, item)
      )?.ipv4
    : undefined;
  const reverse = destinationDevice && sourceAddress
    ? traceIPv4Path(state, destinationDevice.id, sourceAddress)
    : undefined;
  if (!reverse?.success) {
    return {
      success: false,
      forward,
      reverse,
      output: [
        normal(`PING TARGET ${destination}`),
        warning("FORWARD PATH REACHED TARGET / NO RETURN ECHO REPLY"),
        muted(`FORWARD ${forward.hops.join(" → ")}`),
      ],
    };
  }
  return {
    success: true,
    forward,
    reverse,
    output: [
      normal(`PING TARGET ${destination}`),
      success("ECHO REPLY RECEIVED / THIS ROUND TRIP SUCCEEDED"),
      muted(`PATH ${forward.hops.join(" → ")}`),
    ],
  };
}

export function deriveVlanReachability(
  state: CliNetworkState,
  sourceId: string,
  destinationId: string,
) {
  const source = findDevice(state, sourceId);
  const destination = findDevice(state, destinationId);
  const sourceLink = state.links.find((link) =>
    link.aDeviceId === sourceId || link.bDeviceId === sourceId
  );
  const destinationLink = state.links.find((link) =>
    link.aDeviceId === destinationId || link.bDeviceId === destinationId
  );
  if (!source || !destination || !sourceLink || !destinationLink) {
    return { reachable: false, reason: "An endpoint is not attached." };
  }
  const sourceSwitchId = sourceLink.aDeviceId === sourceId
    ? sourceLink.bDeviceId
    : sourceLink.aDeviceId;
  const destinationSwitchId = destinationLink.aDeviceId === destinationId
    ? destinationLink.bDeviceId
    : destinationLink.aDeviceId;
  const sourcePortName = sourceLink.aDeviceId === sourceSwitchId
    ? sourceLink.aInterface
    : sourceLink.bInterface;
  const destinationPortName = destinationLink.aDeviceId === destinationSwitchId
    ? destinationLink.aInterface
    : destinationLink.bInterface;
  const sourcePort = findInterface(
    findDevice(state, sourceSwitchId)!,
    sourcePortName,
  );
  const destinationPort = findInterface(
    findDevice(state, destinationSwitchId)!,
    destinationPortName,
  );
  const sourceVlan = sourcePort?.switchportMode === "access"
    ? sourcePort.accessVlan
    : undefined;
  const destinationVlan = destinationPort?.switchportMode === "access"
    ? destinationPort.accessVlan
    : undefined;
  if (!sourceVlan || !destinationVlan) {
    return {
      reachable: false,
      reason: "Both endpoint ports need access VLAN membership.",
    };
  }
  if (sourceVlan !== destinationVlan) {
    return {
      reachable: false,
      reason: "Different VLANs require Layer 3 routing.",
    };
  }
  if (sourceSwitchId === destinationSwitchId) {
    return {
      reachable: true,
      reason: `Both access ports belong to VLAN ${sourceVlan}.`,
    };
  }
  const trunkLink = state.links.find((link) =>
    [link.aDeviceId, link.bDeviceId].includes(sourceSwitchId) &&
    [link.aDeviceId, link.bDeviceId].includes(destinationSwitchId)
  );
  if (!trunkLink) {
    return {
      reachable: false,
      reason: "The switches have no shared trunk link.",
    };
  }
  const aPort = findInterface(
    findDevice(state, trunkLink.aDeviceId)!,
    trunkLink.aInterface,
  );
  const bPort = findInterface(
    findDevice(state, trunkLink.bDeviceId)!,
    trunkLink.bInterface,
  );
  const carries = [aPort, bPort].every((item) =>
    item?.switchportMode === "trunk" && item.allowedVlans?.includes(sourceVlan)
  );
  return carries
    ? {
      reachable: true,
      reason: `Both trunk endpoints carry VLAN ${sourceVlan}.`,
    }
    : {
      reachable: false,
      reason: `VLAN ${sourceVlan} is not allowed on both trunk endpoints.`,
    };
}
