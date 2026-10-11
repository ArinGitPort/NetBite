import {
  calculateSubnetRange,
  parseIPv4Address,
  type RouteEntry,
  selectBestRoute,
} from "@/core/network/advanced-networking";

import {
  inferSourceVlan,
  interfaceOperational,
  layer2Path,
  learnAlongPath,
  physicalInterface,
} from "./sandbox-switching";
import { findDevice, findInterface } from "./sandbox-device-lookup";
import { event, failure } from "./sandbox-trace";
import {
  type SandboxDevice,
  type SandboxInterface,
  type SandboxTraceResult,
  type SandboxWorkspace,
} from "./sandbox-types";
import { cloneWorkspace } from "./sandbox-workspace";

export function activeInterfaceWithAddress(device: SandboxDevice) {
  return device.interfaces.find((item) =>
    interfaceOperational(device, item) && item.ipv4 && item.prefix !== undefined
  );
}
export function routeForDevice(device: SandboxDevice, destination: string) {
  const connected = device.interfaces.flatMap((item) => {
    if (
      !interfaceOperational(device, item) || !item.ipv4 ||
      item.prefix === undefined
    ) return [];
    const range = calculateSubnetRange(item.ipv4, item.prefix);
    return range
      ? [{
        prefix: range.network,
        prefixLength: item.prefix,
        exitInterface: item.id,
        source: "connected" as const,
      }]
      : [];
  });
  return selectBestRoute(destination, [...connected, ...device.routes]);
}

export function deriveSubinterfaceConnectedRoutes(
  device: SandboxDevice,
): RouteEntry[] {
  return device.interfaces.flatMap((item) => {
    if (
      !item.parentInterfaceId || !interfaceOperational(device, item) ||
      !item.ipv4 || item.prefix === undefined
    ) return [];
    const range = calculateSubnetRange(item.ipv4, item.prefix);
    return range
      ? [{
        prefix: range.network,
        prefixLength: item.prefix,
        exitInterface: item.id,
        source: "connected" as const,
      }]
      : [];
  });
}

export function resolveInterVlanGateway(
  state: SandboxWorkspace,
  sourceDeviceId: string,
) {
  const source = findDevice(state, sourceDeviceId);
  const item = source?.type === "pc"
    ? activeInterfaceWithAddress(source)
    : undefined;
  if (!source || !item || !source.defaultGateway) {
    return {
      ok: false as const,
      reason: "A configured PC and default gateway are required.",
    };
  }
  const gateway = state.devices.flatMap((device) =>
    device.interfaces.map((candidate) => ({ device, candidate }))
  )
    .find(({ device, candidate }) =>
      device.type === "router" && interfaceOperational(device, candidate) &&
      candidate.ipv4 === source.defaultGateway
    );
  if (!gateway) {
    return {
      ok: false as const,
      reason:
        "No operational router interface owns the configured gateway address.",
    };
  }
  return {
    ok: true as const,
    routerId: gateway.device.id,
    interfaceId: gateway.candidate.id,
    vlan: gateway.candidate.encapsulationVlan,
  };
}

export function traceInterVlanPath(
  state: SandboxWorkspace,
  sourceDeviceId: string,
  destinationIp: string,
) {
  return traceSandboxIPv4Path(state, sourceDeviceId, destinationIp);
}

export function sourceInterfaceForPing(
  device: SandboxDevice,
  destination: string,
) {
  const active = device.interfaces.filter((item) =>
    interfaceOperational(device, item) && item.ipv4 && item.prefix !== undefined
  );
  if (
    !active.length || device.type === "pc" || !parseIPv4Address(destination)
  ) return active[0];
  const route = routeForDevice(device, destination);
  if (!route) return active[0];
  const nextHop = route.nextHop ?? destination;
  return findInterface(device, route.exitInterface) ??
    active.find((item) =>
      calculateSubnetRange(item.ipv4!, item.prefix!)?.network ===
        calculateSubnetRange(nextHop, item.prefix!)?.network
    ) ?? active[0];
}

export function traceSandboxIPv4Path(
  state: SandboxWorkspace,
  sourceDeviceId: string,
  destinationIp: string,
) {
  if (!parseIPv4Address(destinationIp)) {
    return {
      success: false as const,
      reason: "invalid-destination",
      deviceIds: [] as string[],
      linkIds: [] as string[],
      steps: [] as {
        currentId: string;
        nextHopIp: string;
        interfaceId: string;
        vlan: number;
        l2Devices: string[];
        l2Links: string[];
      }[],
    };
  }
  let current = findDevice(state, sourceDeviceId);
  const visited = new Set<string>();
  const deviceIds: string[] = [];
  const linkIds: string[] = [];
  const steps = [];
  for (
    let count = 0;
    current && count <= state.devices.length + 1;
    count += 1
  ) {
    if (visited.has(current.id)) {
      return {
        success: false as const,
        reason: "routing-loop",
        deviceIds,
        linkIds,
        steps,
      };
    }
    visited.add(current.id);
    deviceIds.push(current.id);
    if (
      current.interfaces.some((item) =>
        interfaceOperational(current!, item) && item.ipv4 === destinationIp
      )
    ) {
      return {
        success: true as const,
        reason: "delivered",
        deviceIds,
        linkIds,
        steps,
      };
    }
    const route = routeForDevice(current, destinationIp);
    let nextHopIp: string | undefined;
    let outgoing: SandboxInterface | undefined;
    if (current.type === "pc") {
      const hostInterface = activeInterfaceWithAddress(current);
      if (!hostInterface) {
        const configuredButDown = current.interfaces.some((item) =>
          item.ipv4 && item.prefix !== undefined && !item.adminUp
        );
        return {
          success: false as const,
          reason: configuredButDown ? "interface-down" : "source-unconfigured",
          deviceIds,
          linkIds,
          steps,
        };
      }
      const local = calculateSubnetRange(
        hostInterface.ipv4!,
        hostInterface.prefix!,
      );
      const target = calculateSubnetRange(destinationIp, hostInterface.prefix!);
      const sameSubnet = local?.network === target?.network;
      nextHopIp = sameSubnet ? destinationIp : current.defaultGateway;
      outgoing = hostInterface;
      if (!nextHopIp) {
        return {
          success: false as const,
          reason: "no-default-gateway",
          deviceIds,
          linkIds,
          steps,
        };
      }
      if (
        !sameSubnet &&
        calculateSubnetRange(nextHopIp, hostInterface.prefix!)?.network !==
          local?.network
      ) {
        return {
          success: false as const,
          reason: "gateway-off-subnet",
          deviceIds,
          linkIds,
          steps,
        };
      }
    } else {
      if (!route) {
        const matchingDownInterface = current.interfaces.some((item) => {
          if (
            item.adminUp || !item.ipv4 || item.prefix === undefined
          ) return false;
          return calculateSubnetRange(item.ipv4, item.prefix)?.network ===
            calculateSubnetRange(destinationIp, item.prefix)?.network;
        });
        return {
          success: false as const,
          reason: matchingDownInterface ? "interface-down" : "no-route",
          deviceIds,
          linkIds,
          steps,
        };
      }
      nextHopIp = route.nextHop ?? destinationIp;
      outgoing = findInterface(current, route.exitInterface) ??
        current.interfaces.find((item) => {
          if (!item.ipv4 || item.prefix === undefined) return false;
          return calculateSubnetRange(item.ipv4, item.prefix)?.network ===
            calculateSubnetRange(nextHopIp!, item.prefix)?.network;
        });
      if (!outgoing) {
        return {
          success: false as const,
          reason: "no-exit-interface",
          deviceIds,
          linkIds,
          steps,
        };
      }
    }
    if (!interfaceOperational(current, outgoing)) {
      return {
        success: false as const,
        reason: "interface-down",
        deviceIds,
        linkIds,
        steps,
      };
    }
    const nextDevice = state.devices.find((device) =>
      device.interfaces.some((item) =>
        interfaceOperational(device, item) && item.ipv4 === nextHopIp
      )
    );
    const nextInterface = nextDevice?.interfaces.find((item) =>
      interfaceOperational(nextDevice, item) && item.ipv4 === nextHopIp
    );
    if (!nextDevice || !nextInterface) {
      return {
        success: false as const,
        reason: "next-hop-unresolved",
        deviceIds,
        linkIds,
        steps,
      };
    }
    const vlan = inferSourceVlan(state, current.id, outgoing.id);
    const outgoingPhysical = physicalInterface(current, outgoing);
    const nextPhysical = physicalInterface(nextDevice, nextInterface);
    const l2 = layer2Path(state, {
      deviceId: current.id,
      interfaceId: outgoingPhysical?.id ?? outgoing.id,
    }, {
      deviceId: nextDevice.id,
      interfaceId: nextPhysical?.id ?? nextInterface.id,
    }, vlan);
    if (!l2) {
      const physicalPath = layer2Path(
        state,
        {
          deviceId: current.id,
          interfaceId: outgoingPhysical?.id ?? outgoing.id,
        },
        {
          deviceId: nextDevice.id,
          interfaceId: nextPhysical?.id ?? nextInterface.id,
        },
        vlan,
        false,
      );
      return {
        success: false as const,
        reason: physicalPath ? "vlan-blocked" : "no-layer2-path",
        deviceIds,
        linkIds,
        steps,
      };
    }
    l2.devices.forEach((id) => {
      if (!deviceIds.includes(id)) deviceIds.push(id);
    });
    l2.links.forEach((id) => {
      if (!linkIds.includes(id)) linkIds.push(id);
    });
    steps.push({
      currentId: current.id,
      nextHopIp,
      interfaceId: outgoing.id,
      vlan,
      l2Devices: l2.devices,
      l2Links: l2.links,
    });
    current = nextDevice;
  }
  return {
    success: false as const,
    reason: "routing-loop",
    deviceIds,
    linkIds,
    steps,
  };
}

export function applyPathLearning(
  state: SandboxWorkspace,
  path: ReturnType<typeof traceSandboxIPv4Path>,
) {
  if (!("steps" in path)) return;
  path.steps.forEach((step) => {
    const current = findDevice(state, step.currentId);
    const outgoing = findInterface(current, step.interfaceId);
    const target = state.devices.find((device) =>
      device.interfaces.some((item) => item.ipv4 === step.nextHopIp)
    );
    const targetInterface = target?.interfaces.find((item) =>
      item.ipv4 === step.nextHopIp
    );
    if (!current || !outgoing || !targetInterface) return;
    const existing = current.arpTable.find((entry) =>
      entry.ip === step.nextHopIp
    );
    if (
      existing?.macAddress === targetInterface.macAddress &&
      existing.interfaceId === outgoing.id
    ) {
      learnAlongPath(
        state,
        step.l2Devices,
        step.l2Links,
        outgoing.macAddress,
        inferSourceVlan(state, current.id, outgoing.id),
      );
      return;
    }
    current.arpTable = [
      ...current.arpTable.filter((entry) => entry.ip !== step.nextHopIp),
      {
        ip: step.nextHopIp,
        macAddress: targetInterface.macAddress,
        interfaceId: outgoing.id,
      },
    ];
    learnAlongPath(
      state,
      step.l2Devices,
      step.l2Links,
      outgoing.macAddress,
      inferSourceVlan(state, current.id, outgoing.id),
    );
  });
}

export function simulateSandboxPing(
  state: SandboxWorkspace,
  sourceDeviceId: string,
  destinationIp: string,
): SandboxTraceResult {
  const next = cloneWorkspace(state);
  const forward = traceSandboxIPv4Path(next, sourceDeviceId, destinationIp);
  const destinationOwners = next.devices.filter((device) =>
    device.interfaces.some((item) =>
      interfaceOperational(device, item) && item.ipv4 === destinationIp
    )
  );
  if (destinationOwners.length > 1) {
    return failure(
      next,
      `Destination ${destinationIp} is duplicated.`,
      "The model cannot identify one unambiguous destination interface.",
      "Give every active interface a unique IPv4 address.",
    );
  }
  const source = findDevice(next, sourceDeviceId);
  const sourceAddress = source
    ? findInterface(source, forward.steps[0]?.interfaceId)?.ipv4 ??
      activeInterfaceWithAddress(source)?.ipv4
    : undefined;
  const destination = next.devices.find((device) =>
    device.interfaces.some((item) => item.ipv4 === destinationIp)
  );
  if (!forward.success) {
    const explanation = explainPingFailure(forward.reason, "forward");
    return failure(
      next,
      explanation.reason,
      explanation.conclusion,
      explanation.suggestion,
      [event(
        "ping-forward",
        "ECHO REQUEST",
        `${source?.name ?? "Source"} attempts ${destinationIp}.`,
        forward.deviceIds,
        forward.linkIds,
        "active",
      )],
    );
  }
  applyPathLearning(next, forward);
  if (!destination || !sourceAddress) {
    return failure(
      next,
      "The return endpoint is not fully configured.",
      "The forward path exists, but a complete round trip was not established.",
      "Configure both endpoint addresses.",
    );
  }
  const reverse = traceSandboxIPv4Path(next, destination.id, sourceAddress);
  if (!reverse.success) {
    const explanation = explainPingFailure(reverse.reason, "return");
    return failure(
      next,
      explanation.reason,
      explanation.conclusion,
      explanation.suggestion,
      [event(
        "ping-forward",
        "ECHO REQUEST DELIVERED",
        `The request reached ${destination.name}.`,
        forward.deviceIds,
        forward.linkIds,
        "active",
      )],
    );
  }
  applyPathLearning(next, reverse);
  const learningEvents = forward.steps.flatMap((step, index) => {
    const current = findDevice(state, step.currentId);
    const cached = current?.arpTable.some((entry) =>
      entry.ip === step.nextHopIp
    );
    return [
      event(
        `next-hop-${index}`,
        cached
          ? "ARP CACHE USED"
          : index === 0
          ? "GATEWAY MAC RESOLVED"
          : "DESTINATION MAC RESOLVED",
        cached
          ? `${current?.name} already knows the MAC for ${step.nextHopIp} in VLAN ${step.vlan}.`
          : `${current?.name} resolves ${step.nextHopIp} inside VLAN ${step.vlan} before sending.`,
        step.l2Devices,
        step.l2Links,
        "neutral",
      ),
      event(
        `route-${index}`,
        index === 0 ? "TAGGED PATH TO NEXT HOP" : "LINK-LAYER FRAME REPLACED",
        index === 0
          ? `${current?.name} sends through the Layer 2 path carrying VLAN ${step.vlan}.`
          : `${current?.name} preserves the IP endpoints and builds new Ethernet framing for VLAN ${step.vlan}.`,
        step.l2Devices,
        step.l2Links,
        "active",
      ),
    ];
  });
  return {
    success: true,
    reason: "The ICMP Echo Request and Reply completed successfully.",
    conclusion:
      "This confirms reachability for this configured path; it does not measure latency or prove every application works.",
    events: [
      event(
        "ping-forward",
        "ECHO REQUEST CREATED",
        `${source?.name} sends toward ${destinationIp}.`,
        [sourceIdOrEmpty(source)],
        [],
        "active",
      ),
      ...learningEvents,
      event(
        "ping-reverse",
        "ECHO REPLY",
        `${destination.name} returns an Echo Reply.`,
        reverse.deviceIds,
        reverse.linkIds,
        "success",
      ),
    ],
    state: next,
  };
}

export function explainPingFailure(
  reason: string,
  phase: "forward" | "return",
) {
  const direction = phase === "forward" ? "Forward path" : "Return path";
  if (reason === "source-unconfigured") {
    return {
      reason:
        `${direction} stopped: the source has no active IPv4 configuration.`,
      conclusion: "No Echo round trip can begin from this device.",
      suggestion: "Configure and enable an IPv4 interface on the source.",
    };
  }
  if (reason === "interface-down") {
    return {
      reason: `${direction} stopped: a required interface is disabled.`,
      conclusion: phase === "forward"
        ? "The Echo Request cannot leave through the required interface."
        : "The Echo Reply cannot return through the required interface.",
      suggestion: "Inspect interface state and enable the required port.",
    };
  }
  if (reason === "vlan-blocked") {
    return {
      reason:
        `${direction} stopped: the required VLAN is blocked along the Layer 2 path.`,
      conclusion:
        "The physical links exist, but their VLAN configuration does not carry this traffic.",
      suggestion: "Check access VLANs, trunk mode, and allowed VLANs.",
    };
  }
  if (reason === "no-layer2-path") {
    return {
      reason:
        `${direction} stopped: no active Layer 2 path reaches the next hop.`,
      conclusion:
        "The required endpoint or gateway cannot be reached over the current links.",
      suggestion: "Check cabling and interface state.",
    };
  }
  if (reason === "no-default-gateway" || reason === "gateway-off-subnet") {
    return {
      reason: `${direction} stopped: ${reason.replaceAll("-", " ")}.`,
      conclusion: "Remote traffic has no usable local gateway.",
      suggestion: "Configure a gateway inside the source subnet.",
    };
  }
  if (
    reason === "no-route" || reason === "no-exit-interface" ||
    reason === "next-hop-unresolved"
  ) {
    return {
      reason: `${direction} stopped: ${reason.replaceAll("-", " ")}.`,
      conclusion: phase === "forward"
        ? "No usable route to the destination was found."
        : "The destination was reached, but no usable return route was found.",
      suggestion:
        "Inspect connected and static routes plus the selected next hop.",
    };
  }
  return {
    reason: `${direction} stopped: ${reason.replaceAll("-", " ")}.`,
    conclusion: phase === "forward"
      ? "The current configuration cannot produce an Echo Reply."
      : "The destination was reached, but no Echo Reply returned.",
    suggestion: "Inspect addressing, links, gateways, VLANs, and routes.",
  };
}

export function sourceIdOrEmpty(device: SandboxDevice | undefined) {
  return device ? device.id : "";
}

export function clearSandboxLearnedState(state: SandboxWorkspace) {
  const next = cloneWorkspace(state);
  next.devices.forEach((device) => {
    device.arpTable = [];
    device.macTable = [];
  });
  return next;
}
