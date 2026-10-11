import {
  calculateSubnetRange,
  parseIPv4Address,
} from "@/core/network/advanced-networking";

import {
  type CliDeviceState,
  type CliNetworkState,
  type CliOutputLine,
  type CliParseResult,
} from "./cli-types";

export const normal = (text: string): CliOutputLine => ({
  text,
  tone: "normal",
});
export const muted = (text: string): CliOutputLine => ({ text, tone: "muted" });
export const warning = (text: string): CliOutputLine => ({
  text,
  tone: "warning",
});
export const success = (text: string): CliOutputLine => ({
  text,
  tone: "success",
});

export function cloneCliNetwork(state: CliNetworkState): CliNetworkState {
  return {
    links: state.links.map((link) => ({ ...link })),
    devices: state.devices.map((device) => ({
      ...device,
      routes: device.routes.map((route) => ({ ...route })),
      vlans: [...device.vlans],
      interfaces: device.interfaces.map((item) => ({
        ...item,
        allowedVlans: item.allowedVlans ? [...item.allowedVlans] : undefined,
      })),
      arpEntries: device.arpEntries?.map((entry) => ({ ...entry })),
      macEntries: device.macEntries?.map((entry) => ({ ...entry })),
    })),
  };
}

export function normalizeInterfaceName(value: string) {
  const compact = value.trim().toLowerCase().replace(/\s+/g, "");
  const match = compact.match(
    /^(?:gigabitethernet|gi|g|fastethernet|fa|f|ethernet|e)(\d+(?:\/\d+)+(?:\.\d+)?)$/,
  );
  if (!match) return value.trim().toUpperCase();
  const fast = /^(?:fastethernet|fa|f)/.test(compact);
  return `${fast ? "F" : "G"}${match[1]}`;
}

export function maskToPrefix(mask: string): number | null {
  const octets = parseIPv4Address(mask);
  if (!octets) return null;
  const bits = octets.map((octet) => octet.toString(2).padStart(8, "0")).join(
    "",
  );
  if (!/^1*0*$/.test(bits)) return null;
  return bits.indexOf("0") === -1 ? 32 : bits.indexOf("0");
}

export function parseVlanList(value: string): number[] | null {
  if (!/^\d+(?:,\d+)*$/.test(value)) return null;
  const vlans = [...new Set(value.split(",").map(Number))].sort((a, b) =>
    a - b
  );
  return vlans.every((vlan) => vlan >= 1 && vlan <= 4094) ? vlans : null;
}

export function parseCliCommand(input: string): CliParseResult {
  const value = input.trim().replace(/\s+/g, " ");
  const lower = value.toLowerCase();
  if (!value) {
    return { ok: false, error: "Enter a command or choose a suggestion." };
  }
  if (lower === "?" || lower === "help") {
    return { ok: true, command: { kind: "help" } };
  }
  if (lower === "enable" || lower === "en") {
    return { ok: true, command: { kind: "enable" } };
  }
  if (lower === "disable") return { ok: true, command: { kind: "disable" } };
  if (lower === "configure terminal" || lower === "conf t") {
    return { ok: true, command: { kind: "configure-terminal" } };
  }
  if (lower === "exit") return { ok: true, command: { kind: "exit" } };
  if (lower === "end") return { ok: true, command: { kind: "end" } };
  if (lower === "show running-config" || lower === "sh running-config") {
    return { ok: true, command: { kind: "show-running-config" } };
  }
  if (
    lower === "show ip interface brief" || lower === "sh ip interface brief"
  ) return { ok: true, command: { kind: "show-ip-interface-brief" } };
  if (lower === "show ip route" || lower === "sh ip route") {
    return { ok: true, command: { kind: "show-ip-route" } };
  }
  if (lower === "show vlan brief" || lower === "sh vlan brief") {
    return { ok: true, command: { kind: "show-vlan-brief" } };
  }
  if (lower === "show interfaces trunk" || lower === "sh interfaces trunk") {
    return { ok: true, command: { kind: "show-interfaces-trunk" } };
  }
  if (lower === "show mac address-table" || lower === "sh mac address-table") {
    return { ok: true, command: { kind: "show-mac-address-table" } };
  }
  if (lower === "show arp" || lower === "sh arp") {
    return { ok: true, command: { kind: "show-arp" } };
  }
  if (lower === "clear mac address-table") {
    return { ok: true, command: { kind: "clear-mac-address-table" } };
  }
  if (lower === "clear arp") {
    return { ok: true, command: { kind: "clear-arp" } };
  }
  if (lower.startsWith("ping ")) {
    const destination = value.slice(5).trim();
    return parseIPv4Address(destination)
      ? { ok: true, command: { kind: "ping", destination } }
      : { ok: false, error: "PING needs one valid IPv4 destination." };
  }
  const interfaceMatch = lower.match(/^(?:interface|int) (.+)$/);
  if (interfaceMatch) {
    return {
      ok: true,
      command: {
        kind: "interface",
        name: normalizeInterfaceName(interfaceMatch[1]),
      },
    };
  }
  const noInterfaceMatch = lower.match(/^no interface (.+)$/);
  if (noInterfaceMatch) {
    return {
      ok: true,
      command: {
        kind: "no-interface",
        name: normalizeInterfaceName(noInterfaceMatch[1]),
      },
    };
  }
  const vlanMatch = lower.match(/^vlan (\d+)$/);
  if (vlanMatch) {
    const vlan = Number(vlanMatch[1]);
    return vlan >= 1 && vlan <= 4094
      ? { ok: true, command: { kind: "vlan", vlan } }
      : { ok: false, error: "VLAN ID must be from 1 through 4094." };
  }
  if (lower === "no ip address") {
    return { ok: true, command: { kind: "ip-address", remove: true } };
  }
  if (lower === "no encapsulation dot1q") {
    return { ok: true, command: { kind: "encapsulation-dot1q", remove: true } };
  }
  const encapsulationMatch = lower.match(/^encapsulation dot1q (\d+)$/);
  if (encapsulationMatch) {
    const vlan = Number(encapsulationMatch[1]);
    return vlan >= 1 && vlan <= 4094
      ? {
        ok: true,
        command: { kind: "encapsulation-dot1q", vlan, remove: false },
      }
      : { ok: false, error: "802.1Q VLAN ID must be from 1 through 4094." };
  }
  const addressMatch = lower.match(/^ip address (\S+) (\S+)$/);
  if (addressMatch) {
    const prefixLength = maskToPrefix(addressMatch[2]);
    if (!parseIPv4Address(addressMatch[1]) || prefixLength === null) {
      return {
        ok: false,
        error: "IP ADDRESS needs a valid IPv4 address and contiguous mask.",
      };
    }
    return {
      ok: true,
      command: {
        kind: "ip-address",
        address: addressMatch[1],
        prefixLength,
        remove: false,
      },
    };
  }
  if (lower === "shutdown") {
    return { ok: true, command: { kind: "shutdown", shutdown: true } };
  }
  if (lower === "no shutdown") {
    return { ok: true, command: { kind: "shutdown", shutdown: false } };
  }
  const routeMatch = lower.match(/^(no )?ip route (\S+) (\S+) (\S+)$/);
  if (routeMatch) {
    const [, no, network, mask, nextHop] = routeMatch;
    const prefixLength = maskToPrefix(mask);
    const range = prefixLength === null
      ? null
      : calculateSubnetRange(network, prefixLength);
    if (prefixLength === null || !range || range.network !== network) {
      return {
        ok: false,
        error: "IP ROUTE needs a valid network address and contiguous mask.",
      };
    }
    if (!parseIPv4Address(nextHop)) {
      return {
        ok: false,
        error: "IP ROUTE needs a valid next-hop IPv4 address.",
      };
    }
    return {
      ok: true,
      command: {
        kind: "ip-route",
        network,
        mask,
        prefixLength,
        nextHop,
        remove: Boolean(no),
      },
    };
  }
  const switchportMode = lower.match(/^switchport mode (access|trunk)$/);
  if (switchportMode) {
    return {
      ok: true,
      command: {
        kind: "switchport-mode",
        mode: switchportMode[1] as "access" | "trunk",
      },
    };
  }
  const accessMatch = lower.match(/^(no )?switchport access vlan(?: (\d+))?$/);
  if (accessMatch) {
    const remove = Boolean(accessMatch[1]);
    const vlan = Number(accessMatch[2] ?? 1);
    if (!remove && (vlan < 1 || vlan > 4094)) {
      return { ok: false, error: "Access VLAN must be from 1 through 4094." };
    }
    return {
      ok: true,
      command: { kind: "switchport-access-vlan", vlan, remove },
    };
  }
  const trunkMatch = lower.match(
    /^(no )?switchport trunk allowed vlan(?: (\S+))?$/,
  );
  if (trunkMatch) {
    const remove = Boolean(trunkMatch[1]);
    const vlans = remove ? [] : parseVlanList(trunkMatch[2] ?? "");
    if (!vlans) {
      return {
        ok: false,
        error: "Use comma-separated VLAN IDs, for example 10,20.",
      };
    }
    return {
      ok: true,
      command: { kind: "switchport-trunk-allowed", vlans, remove },
    };
  }
  return {
    ok: false,
    error: "Unknown NetBite CLI command. Enter HELP or use a suggestion.",
  };
}

export function getCliPrompt(device: CliDeviceState) {
  if (device.mode === "user-exec") return `${device.name}>`;
  if (device.mode === "privileged-exec") return `${device.name}#`;
  if (device.mode === "global-config") return `${device.name}(config)#`;
  if (device.mode === "interface-config") return `${device.name}(config-if)#`;
  if (device.mode === "subinterface-config") {
    return `${device.name}(config-subif)#`;
  }
  return `${device.name}(config-vlan)#`;
}

export function getCliSuggestions(
  device: CliDeviceState,
  network?: CliNetworkState,
) {
  const pingSuggestions =
    device.interfaces.some((item) => item.adminUp && item.linkUp && item.ipv4)
      ? (network?.devices
        .filter((candidate) =>
          candidate.id !== device.id && candidate.type === "host"
        )
        .flatMap((candidate) =>
          candidate.interfaces.filter((item) =>
            item.adminUp && item.linkUp && item.ipv4
          ).map((item) => `ping ${item.ipv4}`)
        ) ?? [])
        .slice(0, 3)
      : [];
  if (device.mode === "user-exec") {
    return ["enable", ...pingSuggestions, "help"];
  }
  if (device.mode === "privileged-exec") {
    return device.type === "switch"
      ? [
        "configure terminal",
        "show running-config",
        "show vlan brief",
        "show interfaces trunk",
        "show mac address-table",
      ]
      : [
        "configure terminal",
        ...pingSuggestions,
        "show running-config",
        "show ip interface brief",
        "show ip route",
        "show arp",
      ];
  }
  if (device.mode === "global-config") {
    return device.type === "switch" ? ["interface F0/1", "vlan 10", "end"] : [
      "interface G0/0",
      "interface G0/0.10",
      "interface G0/0.20",
      "ip route ",
      "end",
    ];
  }
  if (device.mode === "interface-config") {
    return device.type === "switch"
      ? [
        "switchport mode access",
        "switchport access vlan ",
        "switchport mode trunk",
        "switchport trunk allowed vlan ",
        "exit",
      ]
      : ["ip address ", "no shutdown", "shutdown", "exit"];
  }
  if (device.mode === "subinterface-config") {
    return [
      "encapsulation dot1q ",
      "ip address ",
      "no shutdown",
      "shutdown",
      "exit",
    ];
  }
  return ["exit", "end"];
}
