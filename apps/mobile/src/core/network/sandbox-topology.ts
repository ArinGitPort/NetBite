import {
  calculateSubnetRange,
  parseIPv4Address,
} from "@/core/network/advanced-networking";

import {
  type SandboxConnectionResult,
  type SandboxDevice,
  type SandboxDeviceType,
  type SandboxLink,
  type SandboxPosition,
  type SandboxValidationIssue,
  type SandboxWorkspace,
} from "./sandbox-types";
import {
  cloneWorkspace,
  createSandboxDevice,
  SANDBOX_MAX_DEVICES,
  validateRouterSubinterfaces,
} from "./sandbox-workspace";
import { findDevice, findInterface } from "./sandbox-device-lookup";

export function addSandboxDevice(
  state: SandboxWorkspace,
  type: SandboxDeviceType,
  position: SandboxPosition,
) {
  if (state.devices.length >= SANDBOX_MAX_DEVICES) {
    return {
      ok: false as const,
      state,
      message: `The sandbox supports up to ${SANDBOX_MAX_DEVICES} devices.`,
    };
  }
  const next = cloneWorkspace(state);
  const number = next.nextDeviceNumber[type];
  const device = createSandboxDevice(type, number, position);
  next.nextDeviceNumber[type] = number + 1;
  next.devices.push(device);
  return { ok: true as const, state: next, device };
}

export function moveSandboxDevice(
  state: SandboxWorkspace,
  deviceId: string,
  position: SandboxPosition,
) {
  const next = cloneWorkspace(state);
  const device = findDevice(next, deviceId);
  if (!device) return state;
  device.position = {
    x: Math.max(0, Math.min(640, position.x)),
    y: Math.max(0, Math.min(340, position.y)),
  };
  return next;
}

export function removeSandboxDevice(state: SandboxWorkspace, deviceId: string) {
  const next = cloneWorkspace(state);
  next.devices = next.devices.filter((device) => device.id !== deviceId);
  next.links = next.links.filter((link) =>
    link.a.deviceId !== deviceId && link.b.deviceId !== deviceId
  );
  return next;
}

export function removeSandboxLink(state: SandboxWorkspace, linkId: string) {
  const next = cloneWorkspace(state);
  next.links = next.links.filter((link) => link.id !== linkId);
  return next;
}

export function connectedInterfaceIds(state: SandboxWorkspace) {
  return new Set(
    state.links.flatMap((
      link,
    ) => [
      `${link.a.deviceId}:${link.a.interfaceId}`,
      `${link.b.deviceId}:${link.b.interfaceId}`,
    ]),
  );
}

export function switchGraphHasPath(
  state: SandboxWorkspace,
  sourceId: string,
  destinationId: string,
) {
  const edges = state.links.flatMap((link) => {
    const a = findDevice(state, link.a.deviceId);
    const b = findDevice(state, link.b.deviceId);
    return a?.type === "switch" && b?.type === "switch"
      ? [[a.id, b.id] as const]
      : [];
  });
  const visited = new Set<string>();
  const queue = [sourceId];
  while (queue.length) {
    const current = queue.shift()!;
    if (current === destinationId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    edges.forEach(([a, b]) => {
      if (a === current && !visited.has(b)) queue.push(b);
      if (b === current && !visited.has(a)) queue.push(a);
    });
  }
  return false;
}

export function connectSandboxInterfaces(
  state: SandboxWorkspace,
  firstDeviceId: string,
  secondDeviceId: string,
  preferredFirstInterfaceId?: string,
  preferredSecondInterfaceId?: string,
): SandboxConnectionResult {
  if (firstDeviceId === secondDeviceId) {
    return {
      ok: false,
      reason: "same-device",
      message: "Choose two different devices.",
    };
  }
  const first = findDevice(state, firstDeviceId);
  const second = findDevice(state, secondDeviceId);
  if (!first || !second) {
    return {
      ok: false,
      reason: "device-missing",
      message: "One of the selected devices is no longer present.",
    };
  }
  if (
    state.links.some((link) =>
      [link.a.deviceId, link.b.deviceId].includes(firstDeviceId) &&
      [link.a.deviceId, link.b.deviceId].includes(secondDeviceId)
    )
  ) {
    return {
      ok: false,
      reason: "duplicate",
      message: "These devices already have an Ethernet link.",
    };
  }
  if (
    first.type === "switch" && second.type === "switch" &&
    switchGraphHasPath(state, first.id, second.id)
  ) {
    return {
      ok: false,
      reason: "layer2-cycle",
      message:
        "That link would create a Layer 2 loop. STP is outside this sandbox, so loop-forming links are blocked.",
    };
  }
  const occupied = connectedInterfaceIds(state);
  const choose = (device: SandboxDevice, preferred?: string) =>
    preferred
      ? device.interfaces.find((item) =>
        item.id === preferred && !item.parentInterfaceId &&
        !occupied.has(`${device.id}:${item.id}`)
      )
      : device.interfaces.find((item) =>
        !item.parentInterfaceId && !occupied.has(`${device.id}:${item.id}`)
      );
  const aInterface = choose(first, preferredFirstInterfaceId);
  const bInterface = choose(second, preferredSecondInterfaceId);
  if (!aInterface || !bInterface) {
    return {
      ok: false,
      reason: "no-free-interface",
      message: "A selected device has no free Ethernet interface.",
    };
  }
  const next = cloneWorkspace(state);
  const link: SandboxLink = {
    id: `link-${first.id}-${aInterface.id}-${second.id}-${bInterface.id}`,
    a: { deviceId: first.id, interfaceId: aInterface.id },
    b: { deviceId: second.id, interfaceId: bInterface.id },
  };
  next.links.push(link);
  return { ok: true, state: next, link };
}

export function validateSandboxTopology(
  state: SandboxWorkspace,
): SandboxValidationIssue[] {
  const issues: SandboxValidationIssue[] = [];
  const addresses = new Map<string, string[]>();
  state.devices.forEach((device) =>
    device.interfaces.forEach((item) => {
      if (!item.ipv4) return;
      addresses.set(item.ipv4, [
        ...(addresses.get(item.ipv4) ?? []),
        device.id,
      ]);
      if (
        !parseIPv4Address(item.ipv4) || item.prefix === undefined ||
        !calculateSubnetRange(item.ipv4, item.prefix)
      ) {
        issues.push({
          level: "error",
          code: "invalid-ipv4",
          message:
            `${device.name} ${item.name} has an invalid IPv4 configuration.`,
          deviceIds: [device.id],
        });
      } else if (item.prefix <= 30) {
        const range = calculateSubnetRange(item.ipv4, item.prefix)!;
        if (item.ipv4 === range.network || item.ipv4 === range.broadcast) {
          issues.push({
            level: "warning",
            code: "reserved-host-address",
            message:
              `${device.name} ${item.name} uses a network or broadcast address rather than an ordinary host address.`,
            deviceIds: [device.id],
          });
        }
      }
    })
  );
  addresses.forEach((deviceIds, address) => {
    if (deviceIds.length > 1) {
      issues.push({
        level: "warning",
        code: "duplicate-ipv4",
        message: `${address} is configured on more than one interface.`,
        deviceIds,
      });
    }
  });
  state.devices.filter((device) =>
    device.type === "pc" && device.defaultGateway
  ).forEach((device) => {
    const item = device.interfaces[0];
    if (
      !item.ipv4 || item.prefix === undefined ||
      !calculateSubnetRange(item.ipv4, item.prefix) ||
      !parseIPv4Address(device.defaultGateway!)
    ) return;
    const hostRange = calculateSubnetRange(item.ipv4, item.prefix)!;
    const gatewayRange = calculateSubnetRange(
      device.defaultGateway!,
      item.prefix,
    );
    if (!gatewayRange || gatewayRange.network !== hostRange.network) {
      issues.push({
        level: "warning",
        code: "gateway-off-subnet",
        message: `${device.name}'s gateway is outside its local subnet.`,
        deviceIds: [device.id],
      });
    }
  });
  state.devices.filter((device) => device.type === "router").forEach((device) =>
    issues.push(...validateRouterSubinterfaces(device))
  );
  state.links.forEach((link) => {
    const a = findInterface(
      findDevice(state, link.a.deviceId),
      link.a.interfaceId,
    );
    const b = findInterface(
      findDevice(state, link.b.deviceId),
      link.b.interfaceId,
    );
    if (a?.parentInterfaceId || b?.parentInterfaceId) {
      issues.push({
        level: "error",
        code: "logical-interface-linked",
        message: "Logical router subinterfaces cannot own physical cables.",
        deviceIds: [link.a.deviceId, link.b.deviceId],
      });
    }
  });
  return issues;
}
