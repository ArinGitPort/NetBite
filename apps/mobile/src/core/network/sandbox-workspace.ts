import { findDevice, findInterface } from "./sandbox-device-lookup";
import {
  type SandboxDevice,
  type SandboxDeviceType,
  type SandboxInterface,
  type SandboxPosition,
  type SandboxValidationIssue,
  type SandboxWorkspace,
} from "./sandbox-types";

export const SANDBOX_MAX_DEVICES = 12;
export const BROADCAST_MAC = "FF:FF:FF:FF:FF:FF";

export function cloneWorkspace(state: SandboxWorkspace): SandboxWorkspace {
  return {
    ...state,
    nextDeviceNumber: { ...state.nextDeviceNumber },
    links: state.links.map((link) => ({
      ...link,
      a: { ...link.a },
      b: { ...link.b },
    })),
    devices: state.devices.map((device) => ({
      ...device,
      position: { ...device.position },
      routes: device.routes.map((route) => ({ ...route })),
      vlans: [...device.vlans],
      arpTable: device.arpTable.map((entry) => ({ ...entry })),
      macTable: device.macTable.map((entry) => ({ ...entry })),
      interfaces: device.interfaces.map((item) => ({
        ...item,
        allowedVlans: item.allowedVlans ? [...item.allowedVlans] : undefined,
      })),
    })),
  };
}

export function macFor(deviceNumber: number, interfaceNumber: number) {
  return `02:4E:42:${deviceNumber.toString(16).padStart(2, "0")}:00:${
    interfaceNumber.toString(16).padStart(2, "0")
  }`.toUpperCase();
}

export function interfaceNames(type: SandboxDeviceType) {
  if (type === "pc") return ["E0"];
  if (type === "switch") {
    return [
      ...Array.from({ length: 7 }, (_, index) => `F0/${index + 1}`),
      "F0/24",
    ];
  }
  return Array.from({ length: 4 }, (_, index) => `G0/${index}`);
}

export function createSandboxDevice(
  type: SandboxDeviceType,
  number: number,
  position: SandboxPosition,
): SandboxDevice {
  const label = type === "pc" ? "PC" : type === "switch" ? "SW" : "R";
  return {
    id: `${type}-${number}`,
    name: `${label}${number}`,
    type,
    position,
    interfaces: interfaceNames(type).map((name, index) => ({
      id: name,
      name,
      macAddress: macFor(
        number + (type === "switch" ? 40 : type === "router" ? 80 : 0),
        index + 1,
      ),
      adminUp: true,
      ...(type === "switch"
        ? { switchportMode: "access" as const, accessVlan: 1 }
        : {}),
    })),
    routes: [],
    vlans: type === "switch" ? [1] : [],
    arpTable: [],
    macTable: [],
  };
}

export function createRouterSubinterface(
  state: SandboxWorkspace,
  routerId: string,
  parentInterfaceId: string,
  subinterfaceNumber: number,
): { ok: true; state: SandboxWorkspace; interface: SandboxInterface } | {
  ok: false;
  state: SandboxWorkspace;
  message: string;
} {
  const next = cloneWorkspace(state);
  const router = findDevice(next, routerId);
  const parent = findInterface(router, parentInterfaceId);
  if (!router || router.type !== "router") {
    return { ok: false, state, message: "Choose a router." };
  }
  if (!parent || parent.parentInterfaceId) {
    return { ok: false, state, message: "Choose a physical router interface." };
  }
  if (
    !Number.isInteger(subinterfaceNumber) || subinterfaceNumber < 1 ||
    subinterfaceNumber > 4094
  ) {
    return {
      ok: false,
      state,
      message: "Subinterface number must be from 1 through 4094.",
    };
  }
  const id = `${parent.id}.${subinterfaceNumber}`;
  if (findInterface(router, id)) {
    return { ok: false, state, message: `${id} already exists.` };
  }
  const item: SandboxInterface = {
    id,
    name: id,
    macAddress: parent.macAddress,
    parentInterfaceId: parent.id,
    adminUp: true,
  };
  router.interfaces.push(item);
  next.schemaVersion = 2;
  return { ok: true, state: next, interface: item };
}

export function removeRouterSubinterface(
  state: SandboxWorkspace,
  routerId: string,
  interfaceId: string,
) {
  const next = cloneWorkspace(state);
  const router = findDevice(next, routerId);
  const item = findInterface(router, interfaceId);
  if (!router || router.type !== "router" || !item?.parentInterfaceId) {
    return state;
  }
  router.interfaces = router.interfaces.filter((candidate) =>
    candidate.id !== interfaceId
  );
  router.arpTable = router.arpTable.filter((entry) =>
    entry.interfaceId !== interfaceId
  );
  return next;
}

export function validateRouterSubinterfaces(
  device: SandboxDevice,
): SandboxValidationIssue[] {
  if (device.type !== "router") return [];
  const issues: SandboxValidationIssue[] = [];
  const vlanKeys = new Set<string>();
  device.interfaces.filter((item) => item.parentInterfaceId).forEach((item) => {
    const parent = findInterface(device, item.parentInterfaceId!);
    if (!parent || parent.parentInterfaceId) {
      issues.push({
        level: "error",
        code: "subinterface-parent-missing",
        message: `${item.name} has no valid physical parent.`,
        deviceIds: [device.id],
      });
      return;
    }
    if (parent.ipv4) {
      issues.push({
        level: "error",
        code: "parent-address-conflict",
        message:
          `${parent.name} cannot keep a physical IPv4 address while router-on-a-stick subinterfaces use it.`,
        deviceIds: [device.id],
      });
    }
    if (item.encapsulationVlan === undefined) {
      issues.push({
        level: "warning",
        code: "subinterface-tag-missing",
        message: `${item.name} needs an 802.1Q VLAN ID.`,
        deviceIds: [device.id],
      });
    } else {
      const key = `${parent.id}:${item.encapsulationVlan}`;
      if (vlanKeys.has(key)) {
        issues.push({
          level: "error",
          code: "duplicate-subinterface-vlan",
          message:
            `VLAN ${item.encapsulationVlan} is duplicated on ${parent.name}.`,
          deviceIds: [device.id],
        });
      }
      vlanKeys.add(key);
    }
  });
  return issues;
}

export function createEmptySandboxWorkspace(): SandboxWorkspace {
  return {
    schemaVersion: 2,
    devices: [],
    links: [],
    nextDeviceNumber: { pc: 1, switch: 1, router: 1 },
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isSandboxWorkspace(value: unknown): value is SandboxWorkspace {
  if (
    !isRecord(value) || ![1, 2].includes(Number(value.schemaVersion)) ||
    !Array.isArray(value.devices) || !Array.isArray(value.links) ||
    !isRecord(value.nextDeviceNumber)
  ) return false;
  const counters = value.nextDeviceNumber;
  if (
    !(["pc", "switch", "router"] as const).every((type) =>
      Number.isInteger(counters[type]) && Number(counters[type]) > 0
    )
  ) return false;
  const deviceIds = new Set<string>();
  const interfaceIds = new Map<string, Set<string>>();
  const logicalEndpointKeys = new Set<string>();
  for (const candidate of value.devices) {
    if (
      !isRecord(candidate) || typeof candidate.id !== "string" ||
      typeof candidate.name !== "string" ||
      !["pc", "switch", "router"].includes(String(candidate.type)) ||
      !isRecord(candidate.position) || !Number.isFinite(candidate.position.x) ||
      !Number.isFinite(candidate.position.y) ||
      !Array.isArray(candidate.interfaces) || !candidate.interfaces.length ||
      !Array.isArray(candidate.routes) || !Array.isArray(candidate.vlans) ||
      !Array.isArray(candidate.arpTable) ||
      !Array.isArray(candidate.macTable) || deviceIds.has(candidate.id)
    ) return false;
    const ids = new Set<string>();
    for (const item of candidate.interfaces) {
      if (
        !isRecord(item) || typeof item.id !== "string" ||
        typeof item.name !== "string" || typeof item.macAddress !== "string" ||
        typeof item.adminUp !== "boolean" || ids.has(item.id)
      ) return false;
      if (
        item.parentInterfaceId !== undefined &&
        typeof item.parentInterfaceId !== "string"
      ) return false;
      if (
        item.encapsulationVlan !== undefined &&
        (!Number.isInteger(item.encapsulationVlan) ||
          Number(item.encapsulationVlan) < 1 ||
          Number(item.encapsulationVlan) > 4094)
      ) return false;
      ids.add(item.id);
      if (typeof item.parentInterfaceId === "string") {
        logicalEndpointKeys.add(`${candidate.id}:${item.id}`);
      }
    }
    for (const item of candidate.interfaces) {
      if (
        isRecord(item) && typeof item.parentInterfaceId === "string" &&
        (!ids.has(item.parentInterfaceId) || item.parentInterfaceId === item.id)
      ) return false;
    }
    if (
      candidate.type === "pc" &&
      (candidate.interfaces.length !== 1 || candidate.interfaces[0].id !== "E0")
    ) return false;
    deviceIds.add(candidate.id);
    interfaceIds.set(candidate.id, ids);
  }
  const linkIds = new Set<string>();
  const occupiedEndpoints = new Set<string>();
  return value.links.every((candidate) => {
    if (
      !isRecord(candidate) || typeof candidate.id !== "string" ||
      !isRecord(candidate.a) || !isRecord(candidate.b)
    ) return false;
    const endpointIsValid = (endpoint: Record<string, unknown>) =>
      typeof endpoint.deviceId === "string" &&
      typeof endpoint.interfaceId === "string" &&
      Boolean(interfaceIds.get(endpoint.deviceId)?.has(endpoint.interfaceId));
    if (
      !endpointIsValid(candidate.a) || !endpointIsValid(candidate.b) ||
      linkIds.has(candidate.id)
    ) return false;
    const aKey = `${candidate.a.deviceId}:${candidate.a.interfaceId}`;
    const bKey = `${candidate.b.deviceId}:${candidate.b.interfaceId}`;
    if (
      aKey === bKey || logicalEndpointKeys.has(aKey) ||
      logicalEndpointKeys.has(bKey) || occupiedEndpoints.has(aKey) ||
      occupiedEndpoints.has(bKey)
    ) return false;
    linkIds.add(candidate.id);
    occupiedEndpoints.add(aKey);
    occupiedEndpoints.add(bKey);
    return true;
  });
}
