import { parseIPv4Address } from "@/core/network/advanced-networking";

import { findDevice, findInterface } from "./sandbox-device-lookup";
import { validateSandboxTopology } from "./sandbox-topology";
import {
  type SandboxBeginnerLanSetup,
  type SandboxDevice,
  type SandboxInterface,
  type SandboxLink,
  type SandboxWorkspace,
} from "./sandbox-types";
import { cloneWorkspace } from "./sandbox-workspace";

export function endpointForDevice(link: SandboxLink, deviceId: string) {
  if (link.a.deviceId === deviceId) return link.a;
  if (link.b.deviceId === deviceId) return link.b;
  return undefined;
}

export function previewBeginnerLanSetup(
  state: SandboxWorkspace,
): SandboxBeginnerLanSetup | undefined {
  const pcs = state.devices.filter((device) => device.type === "pc").sort((
    a,
    b,
  ) => a.id.localeCompare(b.id));
  const switches = state.devices.filter((device) => device.type === "switch");
  if (state.devices.length !== 3 || pcs.length !== 2 || switches.length !== 1) {
    return undefined;
  }
  const networkSwitch = switches[0];
  const pcLinks = pcs.map((pc) =>
    state.links.find((link) => {
      const deviceIds = [link.a.deviceId, link.b.deviceId];
      return deviceIds.includes(pc.id) && deviceIds.includes(networkSwitch.id);
    })
  );
  const pcInterfaces = pcs.map((pc) => findInterface(pc, "E0"));
  if (pcLinks.some((link) => !link) || pcInterfaces.some((item) => !item)) {
    return undefined;
  }

  const addresses = ["192.168.10.10", "192.168.10.20"] as const;
  const changes = pcs.map((pc, index) => {
    const item = pcInterfaces[index]!;
    const beforeAddress = item.ipv4 && item.prefix !== undefined
      ? `${item.ipv4}/${item.prefix}`
      : "NOT CONFIGURED";
    const before = `${beforeAddress}${
      pc.defaultGateway ? ` / GATEWAY ${pc.defaultGateway}` : ""
    }${item.adminUp ? "" : " / DOWN"}`;
    return {
      deviceId: pc.id,
      deviceName: pc.name,
      before,
      after: `${addresses[index]}/24 / NO GATEWAY`,
    };
  });
  const switchNeedsChanges = pcLinks.some((link) => {
    const endpoint = endpointForDevice(link!, networkSwitch.id)!;
    const item = findInterface(networkSwitch, endpoint.interfaceId);
    return !item?.adminUp || item.switchportMode !== "access" ||
      (item.accessVlan ?? 1) !== 1;
  }) || !networkSwitch.vlans.includes(1);
  const pcNeedsChanges = pcs.some((pc, index) => {
    const item = pcInterfaces[index]!;
    return item.ipv4 !== addresses[index] || item.prefix !== 24 ||
      !item.adminUp || Boolean(pc.defaultGateway);
  });
  const overwritesExistingConfiguration = pcs.some((pc, index) => {
    const item = pcInterfaces[index]!;
    return Boolean(
      (item.ipv4 && item.ipv4 !== addresses[index]) ||
        (item.prefix !== undefined && item.prefix !== 24) || pc.defaultGateway,
    );
  }) || pcLinks.some((link) => {
    const endpoint = endpointForDevice(link!, networkSwitch.id)!;
    const item = findInterface(networkSwitch, endpoint.interfaceId);
    return item?.switchportMode === "trunk" ||
      (item?.accessVlan !== undefined && item.accessVlan !== 1);
  });

  return {
    pcIds: [pcs[0].id, pcs[1].id],
    switchId: networkSwitch.id,
    changes,
    overwritesExistingConfiguration,
    requiresChanges: pcNeedsChanges || switchNeedsChanges,
  };
}

export function applyBeginnerLanSetup(state: SandboxWorkspace) {
  const preview = previewBeginnerLanSetup(state);
  if (!preview) {
    return {
      ok: false as const,
      state,
      message:
        "Connect exactly two PCs to one switch before using the beginner setup.",
    };
  }
  let next = state;
  const addresses = ["192.168.10.10", "192.168.10.20"] as const;
  preview.pcIds.forEach((deviceId, index) => {
    next = configureSandboxDevice(next, deviceId, {
      defaultGateway: "",
      interfaceId: "E0",
      interface: { adminUp: true, ipv4: addresses[index], prefix: 24 },
    }).state;
  });
  next = configureSandboxDevice(next, preview.switchId, { vlans: [1] }).state;
  state.links.filter((link) =>
    [link.a.deviceId, link.b.deviceId].includes(preview.switchId)
  ).forEach((link) => {
    const endpoint = endpointForDevice(link, preview.switchId);
    if (!endpoint) return;
    next = configureSandboxDevice(next, preview.switchId, {
      interfaceId: endpoint.interfaceId,
      interface: {
        adminUp: true,
        switchportMode: "access",
        accessVlan: 1,
        allowedVlans: undefined,
      },
    }).state;
  });
  return { ok: true as const, state: next, preview };
}

export function validateSandboxDeviceName(
  state: SandboxWorkspace,
  deviceId: string,
  value: string,
) {
  const name = value.trim();
  if (!name) return { ok: false as const, message: "Device name is required." };
  if (name.length > 24) {
    return {
      ok: false as const,
      message: "Device name must contain 24 characters or fewer.",
    };
  }
  if (!/^[A-Za-z0-9 _-]+$/.test(name)) {
    return {
      ok: false as const,
      message: "Use letters, numbers, spaces, hyphens, or underscores only.",
    };
  }
  if (
    state.devices.some((device) =>
      device.id !== deviceId &&
      device.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    )
  ) {
    return { ok: false as const, message: "Each device name must be unique." };
  }
  return { ok: true as const, name };
}

export type SandboxDevicePatch =
  & Partial<Pick<SandboxDevice, "name" | "defaultGateway" | "vlans" | "routes">>
  & {
    interfaceId?: string;
    interface?: Partial<Omit<SandboxInterface, "id" | "name" | "macAddress">>;
  };

export function configureSandboxDevice(
  state: SandboxWorkspace,
  deviceId: string,
  patch: SandboxDevicePatch,
) {
  const next = cloneWorkspace(state);
  const device = findDevice(next, deviceId);
  if (!device) {
    return { ok: false as const, state, message: "Device not found." };
  }
  if (patch.name !== undefined) {
    const result = validateSandboxDeviceName(state, deviceId, patch.name);
    if (!result.ok) {
      return { ok: false as const, state, message: result.message };
    }
    device.name = result.name;
  }
  const normalizedGateway = patch.defaultGateway?.trim();
  if (
    patch.defaultGateway !== undefined && normalizedGateway !== "" &&
    !parseIPv4Address(normalizedGateway!)
  ) {
    return {
      ok: false as const,
      state,
      message: "Enter a valid IPv4 default gateway.",
    };
  }
  if (patch.routes) device.routes = patch.routes.map((route) => ({ ...route }));
  if (patch.vlans) {
    if (
      !patch.vlans.every((vlan) =>
        Number.isInteger(vlan) && vlan >= 1 && vlan <= 4094
      )
    ) {
      return {
        ok: false as const,
        state,
        message: "VLAN IDs must be from 1 through 4094.",
      };
    }
    device.vlans = [...new Set([1, ...patch.vlans])].sort((a, b) => a - b);
  }
  if (patch.defaultGateway !== undefined) {
    device.defaultGateway = normalizedGateway || undefined;
  }
  if (patch.interfaceId && patch.interface) {
    const item = findInterface(device, patch.interfaceId);
    if (!item) {
      return { ok: false as const, state, message: "Interface not found." };
    }
    const normalizedAddress = patch.interface.ipv4?.trim();
    if (
      patch.interface.ipv4 !== undefined && normalizedAddress !== "" &&
      !parseIPv4Address(normalizedAddress!)
    ) {
      return {
        ok: false as const,
        state,
        message: "Enter a valid IPv4 address.",
      };
    }
    if (
      patch.interface.prefix !== undefined &&
      (!Number.isInteger(patch.interface.prefix) ||
        patch.interface.prefix < 0 || patch.interface.prefix > 32)
    ) {
      return {
        ok: false as const,
        state,
        message: "Prefix length must be from 0 through 32.",
      };
    }
    if (
      patch.interface.accessVlan !== undefined &&
      (patch.interface.accessVlan < 1 || patch.interface.accessVlan > 4094)
    ) {
      return {
        ok: false as const,
        state,
        message: "Access VLAN must be from 1 through 4094.",
      };
    }
    if (
      patch.interface.allowedVlans &&
      !patch.interface.allowedVlans.every((vlan) => vlan >= 1 && vlan <= 4094)
    ) {
      return {
        ok: false as const,
        state,
        message: "Allowed VLANs must be from 1 through 4094.",
      };
    }
    if (
      patch.interface.encapsulationVlan !== undefined &&
      (!Number.isInteger(patch.interface.encapsulationVlan) ||
        patch.interface.encapsulationVlan < 1 ||
        patch.interface.encapsulationVlan > 4094)
    ) {
      return {
        ok: false as const,
        state,
        message: "802.1Q VLAN ID must be from 1 through 4094.",
      };
    }
    if (
      item.parentInterfaceId &&
      patch.interface.encapsulationVlan !== undefined &&
      device.interfaces.some((candidate) =>
        candidate.id !== item.id &&
        candidate.parentInterfaceId === item.parentInterfaceId &&
        candidate.encapsulationVlan === patch.interface!.encapsulationVlan
      )
    ) {
      return {
        ok: false as const,
        state,
        message:
          `VLAN ${patch.interface.encapsulationVlan} is already assigned on ${item.parentInterfaceId}.`,
      };
    }
    if (
      normalizedAddress && !item.parentInterfaceId &&
      device.interfaces.some((candidate) =>
        candidate.parentInterfaceId === item.id
      )
    ) {
      return {
        ok: false as const,
        state,
        message:
          "Remove router subinterfaces before addressing their physical parent.",
      };
    }
    if (
      normalizedAddress && item.parentInterfaceId &&
      findInterface(device, item.parentInterfaceId)?.ipv4
    ) {
      return {
        ok: false as const,
        state,
        message:
          `Remove the IPv4 address from ${item.parentInterfaceId} before addressing a subinterface.`,
      };
    }
    const normalizedInterface = { ...patch.interface };
    if (patch.interface.ipv4 !== undefined) {
      normalizedInterface.ipv4 = normalizedAddress || undefined;
    }
    Object.assign(item, normalizedInterface);
  }
  return {
    ok: true as const,
    state: next,
    issues: validateSandboxTopology(next),
  };
}
