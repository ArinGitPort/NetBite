import {
  calculateSubnetRange,
  type RouteEntry,
} from "@/core/network/advanced-networking";

export type CliMode =
  | "user-exec"
  | "privileged-exec"
  | "global-config"
  | "interface-config"
  | "subinterface-config"
  | "vlan-config";
export type CliDeviceType = "host" | "router" | "switch";
export type CliOutputTone = "normal" | "muted" | "success" | "warning";

export interface CliOutputLine {
  text: string;
  tone: CliOutputTone;
}
export interface CliInterfaceState {
  name: string;
  adminUp: boolean;
  linkUp: boolean;
  parentInterface?: string;
  encapsulationVlan?: number;
  ipv4?: string;
  prefix?: number;
  switchportMode?: "access" | "trunk";
  accessVlan?: number;
  allowedVlans?: number[];
}
export interface CliDeviceState {
  id: string;
  name: string;
  type: CliDeviceType;
  mode: CliMode;
  selectedInterface?: string;
  selectedVlan?: number;
  interfaces: CliInterfaceState[];
  routes: RouteEntry[];
  vlans: number[];
  arpEntries?: { ip: string; macAddress: string; interfaceName: string }[];
  macEntries?: { macAddress: string; interfaceName: string; vlan: number }[];
}
export interface CliLink {
  aDeviceId: string;
  aInterface: string;
  bDeviceId: string;
  bInterface: string;
}
export interface CliNetworkState {
  devices: CliDeviceState[];
  links: CliLink[];
}
export type CliLinkContextKind =
  | "network"
  | "mismatch"
  | "vlan"
  | "trunk"
  | "operational"
  | "ethernet";
export interface CliLinkContext {
  kind: CliLinkContextKind;
  label: string;
  tone: "normal" | "success" | "warning";
  networkLabel?: string;
}
export interface CliLabDefinition {
  id: string;
  chapterId: string;
  title: string;
  createState: () => CliNetworkState;
}

export function linkedInterface(
  state: CliNetworkState,
  deviceId: string,
  interfaceName: string,
) {
  const device = state.devices.find((item) => item.id === deviceId);
  return {
    device,
    interfaceState: device?.interfaces.find((item) =>
      item.name === interfaceName
    ),
  };
}

export function deriveCliLinkContext(
  state: CliNetworkState,
  link: CliLink,
): CliLinkContext {
  const a = linkedInterface(state, link.aDeviceId, link.aInterface);
  const b = linkedInterface(state, link.bDeviceId, link.bInterface);
  if (!a.interfaceState || !b.interfaceState) {
    return {
      kind: "operational",
      label: "INTERFACE NOT FOUND",
      tone: "warning",
    };
  }

  let routedContext: CliLinkContext | undefined;
  if (
    a.interfaceState.ipv4 && a.interfaceState.prefix !== undefined &&
    b.interfaceState.ipv4 && b.interfaceState.prefix !== undefined
  ) {
    const aRange = calculateSubnetRange(
      a.interfaceState.ipv4,
      a.interfaceState.prefix,
    );
    const bRange = calculateSubnetRange(
      b.interfaceState.ipv4,
      b.interfaceState.prefix,
    );
    routedContext = aRange && bRange && aRange.network === bRange.network &&
        a.interfaceState.prefix === b.interfaceState.prefix
      ? {
        kind: "network",
        label: `${aRange.network}/${a.interfaceState.prefix}`,
        tone: "normal",
      }
      : { kind: "mismatch", label: "SUBNET MISMATCH", tone: "warning" };
  }

  if (
    ![a.interfaceState, b.interfaceState].every((item) =>
      item.adminUp && item.linkUp
    )
  ) {
    return {
      kind: "operational",
      label: "LINK DOWN",
      networkLabel: routedContext?.kind === "network"
        ? routedContext.label
        : undefined,
      tone: "warning",
    };
  }

  if (routedContext) return routedContext;

  const switchEndpoints = [a, b].filter((item) =>
    item.device?.type === "switch"
  );
  if (switchEndpoints.length === 2) {
    const [left, right] = switchEndpoints.map((item) => item.interfaceState!);
    if (left.switchportMode !== "trunk" || right.switchportMode !== "trunk") {
      return { kind: "trunk", label: "NOT TRUNKED", tone: "warning" };
    }
    const rightVlans = new Set(right.allowedVlans ?? []);
    const commonVlans = [...new Set(left.allowedVlans ?? [])].filter((vlan) =>
      rightVlans.has(vlan)
    ).sort((x, y) => x - y);
    return commonVlans.length
      ? {
        kind: "trunk",
        label: `TRUNK VLANs ${commonVlans.join(",")}`,
        tone: "success",
      }
      : { kind: "trunk", label: "NO COMMON VLANs", tone: "warning" };
  }

  const switchEndpoint = switchEndpoints[0];
  if (switchEndpoint) {
    const port = switchEndpoint.interfaceState!;
    const otherEndpoint = switchEndpoint === a ? b : a;
    if (otherEndpoint.device?.type === "router") {
      if (port.switchportMode !== "trunk") {
        return { kind: "trunk", label: "NOT TRUNKED", tone: "warning" };
      }
      const routerVlans = otherEndpoint.device.interfaces
        .filter((item) =>
          item.parentInterface === otherEndpoint.interfaceState?.name &&
          item.encapsulationVlan !== undefined
        )
        .map((item) => item.encapsulationVlan!);
      const routerVlanSet = new Set(routerVlans);
      const commonVlans = [...new Set(port.allowedVlans ?? [])].filter((vlan) =>
        routerVlanSet.has(vlan)
      ).sort((x, y) => x - y);
      return commonVlans.length
        ? {
          kind: "trunk",
          label: `TRUNK VLANs ${commonVlans.join(",")}`,
          tone: "success",
        }
        : { kind: "trunk", label: "NO COMMON VLANs", tone: "warning" };
    }
    if (port.switchportMode === "trunk") {
      return port.allowedVlans?.length
        ? {
          kind: "trunk",
          label: `TRUNK VLANs ${
            [...new Set(port.allowedVlans)].sort((x, y) => x - y).join(",")
          }`,
          tone: "success",
        }
        : {
          kind: "trunk",
          label: "TRUNK WITH NO ALLOWED VLANs",
          tone: "warning",
        };
    }
    return {
      kind: "vlan",
      label: `ACCESS VLAN ${port.accessVlan ?? 1}`,
      tone: "normal",
    };
  }

  return { kind: "ethernet", label: "ETHERNET LINK", tone: "normal" };
}

export type CliCommand =
  | { kind: "help" }
  | { kind: "enable" }
  | { kind: "disable" }
  | { kind: "configure-terminal" }
  | { kind: "exit" }
  | { kind: "end" }
  | { kind: "show-running-config" }
  | { kind: "show-ip-interface-brief" }
  | { kind: "show-ip-route" }
  | { kind: "show-vlan-brief" }
  | { kind: "show-interfaces-trunk" }
  | { kind: "show-mac-address-table" }
  | { kind: "show-arp" }
  | { kind: "clear-mac-address-table" }
  | { kind: "clear-arp" }
  | { kind: "ping"; destination: string }
  | { kind: "interface"; name: string }
  | { kind: "no-interface"; name: string }
  | { kind: "encapsulation-dot1q"; vlan?: number; remove: boolean }
  | {
    kind: "ip-address";
    address?: string;
    prefixLength?: number;
    remove: boolean;
  }
  | { kind: "shutdown"; shutdown: boolean }
  | { kind: "vlan"; vlan: number }
  | {
    kind: "ip-route";
    network: string;
    mask: string;
    prefixLength: number;
    nextHop: string;
    remove: boolean;
  }
  | { kind: "switchport-mode"; mode: "access" | "trunk" }
  | { kind: "switchport-access-vlan"; vlan: number; remove: boolean }
  | { kind: "switchport-trunk-allowed"; vlans: number[]; remove: boolean };

export type CliParseResult = { ok: true; command: CliCommand } | {
  ok: false;
  error: string;
};
export interface CliCommandResult {
  accepted: boolean;
  mutated: boolean;
  state: CliNetworkState;
  output: CliOutputLine[];
  events: string[];
}
export interface PathTraceResult {
  success: boolean;
  reason:
    | "delivered"
    | "no-route"
    | "next-hop-unreachable"
    | "loop"
    | "interface-down"
    | "invalid-destination";
  hops: string[];
}
export interface PingSimulation {
  success: boolean;
  forward: PathTraceResult;
  reverse?: PathTraceResult;
  output: CliOutputLine[];
}
