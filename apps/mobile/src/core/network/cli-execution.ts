import { type RouteEntry } from "@/core/network/advanced-networking";

import {
  cloneCliNetwork,
  getCliSuggestions,
  muted,
  normal,
  success,
  warning,
} from "./cli-commands";
import {
  findDevice,
  findInterface,
  modeError,
  showIpRoute,
  showRunningConfig,
  simulatePing,
} from "./cli-paths";
import {
  type CliCommand,
  type CliCommandResult,
  type CliNetworkState,
  type CliOutputLine,
} from "./cli-types";

export function executeCliCommand(
  state: CliNetworkState,
  deviceId: string,
  command: CliCommand,
): CliCommandResult {
  const next = cloneCliNetwork(state);
  const device = findDevice(next, deviceId);
  if (!device) {
    return {
      accepted: false,
      mutated: false,
      state,
      output: [warning("NETBITE: Device not found.")],
      events: [],
    };
  }
  const finish = (
    output: CliOutputLine[],
    mutated = false,
    events: string[] = [],
  ): CliCommandResult => ({
    accepted: true,
    mutated,
    state: next,
    output,
    events,
  });
  const reject = (output: CliOutputLine[]) => ({
    accepted: false,
    mutated: false,
    state,
    output,
    events: [],
  });
  if (command.kind === "help") {
    return finish(
      getCliSuggestions(device).map((item) => normal(item.toUpperCase())),
    );
  }
  if (command.kind === "enable") {
    if (device.mode !== "user-exec") return reject(modeError("user EXEC mode"));
    device.mode = "privileged-exec";
    return finish([success("PRIVILEGED EXEC MODE")], true, ["mode-change"]);
  }
  if (command.kind === "disable") {
    if (device.mode !== "privileged-exec") {
      return reject(modeError("privileged EXEC mode"));
    }
    device.mode = "user-exec";
    return finish([muted("USER EXEC MODE")], true, ["mode-change"]);
  }
  if (command.kind === "configure-terminal") {
    if (device.mode !== "privileged-exec") {
      return reject(modeError("privileged EXEC mode"));
    }
    device.mode = "global-config";
    return finish([success("GLOBAL CONFIGURATION MODE")], true, [
      "mode-change",
    ]);
  }
  if (command.kind === "end") {
    device.mode = "privileged-exec";
    device.selectedInterface = undefined;
    device.selectedVlan = undefined;
    return finish([muted("PRIVILEGED EXEC MODE")], true, ["mode-change"]);
  }
  if (command.kind === "exit") {
    if (
      device.mode === "interface-config" ||
      device.mode === "subinterface-config" || device.mode === "vlan-config"
    ) device.mode = "global-config";
    else if (device.mode === "global-config") device.mode = "privileged-exec";
    else if (device.mode === "privileged-exec") device.mode = "user-exec";
    device.selectedInterface = undefined;
    device.selectedVlan = undefined;
    return finish(
      [muted(`MODE ${device.mode.replaceAll("-", " ").toUpperCase()}`)],
      true,
      ["mode-change"],
    );
  }
  const execMode = device.mode === "user-exec" ||
    device.mode === "privileged-exec";
  if (command.kind === "show-running-config") {
    return execMode
      ? finish(showRunningConfig(device), false, ["show-running-config"])
      : reject(modeError("EXEC mode"));
  }
  if (command.kind === "show-ip-interface-brief") {
    return execMode
      ? finish(
        device.interfaces.map((item) =>
          normal(
            `${item.name.padEnd(8)} ${item.ipv4 ?? "UNASSIGNED"}  ${
              item.adminUp ? "UP" : "ADMIN DOWN"
            } / ${item.linkUp ? "LINK UP" : "LINK DOWN"}`,
          )
        ),
        false,
        ["show-ip-interface-brief"],
      )
      : reject(modeError("EXEC mode"));
  }
  if (command.kind === "show-ip-route") {
    return execMode
      ? finish(showIpRoute(device), false, ["show-ip-route"])
      : reject(modeError("EXEC mode"));
  }
  if (command.kind === "show-vlan-brief") {
    if (!execMode || device.type !== "switch") {
      return reject(modeError("switch EXEC mode"));
    }
    const lines = device.vlans.sort((a, b) => a - b).map((vlan) =>
      normal(
        `VLAN ${vlan} / ${
          device.interfaces.filter((item) =>
            item.switchportMode === "access" && item.accessVlan === vlan
          ).map((item) => item.name).join(", ") || "NO ACCESS PORTS"
        }`,
      )
    );
    return finish(
      lines.length ? lines : [muted("NO USER VLANS CONFIGURED")],
      false,
      ["show-vlan-brief"],
    );
  }
  if (command.kind === "show-interfaces-trunk") {
    if (!execMode || device.type !== "switch") {
      return reject(modeError("switch EXEC mode"));
    }
    const trunks = device.interfaces.filter((item) =>
      item.switchportMode === "trunk"
    );
    return finish(
      trunks.length
        ? trunks.map((item) =>
          normal(
            `${item.name} / TRUNK / ALLOWED ${
              item.allowedVlans?.join(",") || "NONE"
            }`,
          )
        )
        : [muted("NO TRUNK PORTS CONFIGURED")],
      false,
      ["show-interfaces-trunk"],
    );
  }
  if (command.kind === "show-mac-address-table") {
    if (!execMode || device.type !== "switch") {
      return reject(modeError("switch EXEC mode"));
    }
    return finish(
      device.macEntries?.length
        ? device.macEntries.map((entry) =>
          normal(
            `VLAN ${entry.vlan} / ${entry.macAddress} / ${entry.interfaceName}`,
          )
        )
        : [muted("MAC ADDRESS TABLE EMPTY")],
      false,
      ["show-mac-address-table"],
    );
  }
  if (command.kind === "show-arp") {
    return execMode
      ? finish(
        device.arpEntries?.length
          ? device.arpEntries.map((entry) =>
            normal(`${entry.ip} / ${entry.macAddress} / ${entry.interfaceName}`)
          )
          : [muted("ARP TABLE EMPTY")],
        false,
        ["show-arp"],
      )
      : reject(modeError("EXEC mode"));
  }
  if (command.kind === "clear-mac-address-table") {
    if (!execMode || device.type !== "switch") {
      return reject(modeError("switch EXEC mode"));
    }
    device.macEntries = [];
    return finish([success("MAC ADDRESS TABLE CLEARED")], true, ["clear-mac"]);
  }
  if (command.kind === "clear-arp") {
    if (!execMode) return reject(modeError("EXEC mode"));
    device.arpEntries = [];
    return finish([success("ARP TABLE CLEARED")], true, ["clear-arp"]);
  }
  if (command.kind === "ping") {
    if (!execMode) return reject(modeError("EXEC mode"));
    const ping = simulatePing(next, deviceId, command.destination);
    return finish(ping.output, false, [
      ping.success
        ? `ping-success:${command.destination}`
        : `ping-failure:${command.destination}`,
    ]);
  }
  if (command.kind === "interface") {
    if (device.mode !== "global-config") {
      return reject(modeError("global configuration mode"));
    }
    let item = findInterface(device, command.name);
    const subinterfaceMatch = command.name.match(/^(.+)\.(\d+)$/);
    if (!item && device.type === "router" && subinterfaceMatch) {
      const parent = findInterface(device, subinterfaceMatch[1]);
      if (!parent || parent.parentInterface) {
        return reject([
          warning(
            `NETBITE: Physical parent ${
              subinterfaceMatch[1]
            } is not present on ${device.name}.`,
          ),
        ]);
      }
      item = {
        name: command.name,
        parentInterface: parent.name,
        adminUp: true,
        linkUp: parent.linkUp,
      };
      device.interfaces.push(item);
    }
    if (!item) {
      return reject([
        warning(
          `NETBITE: Interface ${command.name} is not present on ${device.name}.`,
        ),
      ]);
    }
    device.mode = item.parentInterface
      ? "subinterface-config"
      : "interface-config";
    device.selectedInterface = item.name;
    return finish([success(`INTERFACE ${item.name} SELECTED`)], true, [
      "mode-change",
    ]);
  }
  if (command.kind === "no-interface") {
    if (device.mode !== "global-config" || device.type !== "router") {
      return reject(modeError("router global configuration mode"));
    }
    const item = findInterface(device, command.name);
    if (!item?.parentInterface) {
      return reject([
        warning(
          `NETBITE: Logical subinterface ${command.name} is not present.`,
        ),
      ]);
    }
    device.interfaces = device.interfaces.filter((candidate) =>
      candidate.name !== command.name
    );
    return finish([success(`INTERFACE ${command.name} REMOVED`)], true, [
      "config-change",
    ]);
  }
  if (command.kind === "vlan") {
    if (device.mode !== "global-config" || device.type !== "switch") {
      return reject(modeError("switch global configuration mode"));
    }
    if (!device.vlans.includes(command.vlan)) device.vlans.push(command.vlan);
    device.mode = "vlan-config";
    device.selectedVlan = command.vlan;
    return finish([success(`VLAN ${command.vlan} AVAILABLE`)], true, [
      "config-change",
    ]);
  }
  if (command.kind === "ip-route") {
    if (device.mode !== "global-config" || device.type !== "router") {
      return reject(modeError("router global configuration mode"));
    }
    const matches = (route: RouteEntry) =>
      route.prefix === command.network &&
      route.prefixLength === command.prefixLength &&
      route.nextHop === command.nextHop;
    if (command.remove) {
      device.routes = device.routes.filter((route) => !matches(route));
    } else if (!device.routes.some(matches)) {
      device.routes.push({
        prefix: command.network,
        prefixLength: command.prefixLength,
        nextHop: command.nextHop,
        exitInterface: "NEXT-HOP",
        source: command.prefixLength === 0 ? "default" : "static",
      });
    }
    return finish(
      [success(
        `${
          command.remove ? "REMOVED" : "ADDED"
        } ${command.network}/${command.prefixLength} VIA ${command.nextHop}`,
      )],
      true,
      ["config-change"],
    );
  }
  const selected = findInterface(device, device.selectedInterface);
  if (
    selected &&
    (device.mode === "interface-config" ||
      device.mode === "subinterface-config") &&
    device.type === "router" && command.kind === "ip-address"
  ) {
    if (
      !command.remove && !selected.parentInterface &&
      device.interfaces.some((item) => item.parentInterface === selected.name)
    ) {
      return reject([
        warning(
          "NETBITE: Remove logical subinterfaces before assigning an address to their physical parent interface.",
        ),
      ]);
    }
    const parent = selected.parentInterface
      ? findInterface(device, selected.parentInterface)
      : undefined;
    if (!command.remove && parent?.ipv4) {
      return reject([
        warning(
          `NETBITE: Remove the IPv4 address from ${parent.name} before addressing its logical subinterfaces.`,
        ),
      ]);
    }
    selected.ipv4 = command.remove ? undefined : command.address;
    selected.prefix = command.remove ? undefined : command.prefixLength;
    return finish(
      [success(
        command.remove
          ? `${selected.name} IP ADDRESS REMOVED`
          : `${selected.name} IP ${selected.ipv4}/${selected.prefix}`,
      )],
      true,
      ["config-change"],
    );
  }
  if (
    selected &&
    (device.mode === "interface-config" ||
      device.mode === "subinterface-config") &&
    device.type !== "host" && command.kind === "shutdown"
  ) {
    selected.adminUp = !command.shutdown;
    return finish(
      [success(`${selected.name} ADMIN ${selected.adminUp ? "UP" : "DOWN"}`)],
      true,
      ["config-change"],
    );
  }
  if (
    selected && device.mode === "subinterface-config" &&
    device.type === "router" && command.kind === "encapsulation-dot1q"
  ) {
    if (
      !command.remove &&
      device.interfaces.some((item) =>
        item.name !== selected.name &&
        item.parentInterface === selected.parentInterface &&
        item.encapsulationVlan === command.vlan
      )
    ) {
      return reject([
        warning(
          `NETBITE: VLAN ${command.vlan} is already assigned to another subinterface on ${selected.parentInterface}.`,
        ),
      ]);
    }
    selected.encapsulationVlan = command.remove ? undefined : command.vlan;
    return finish(
      [success(
        command.remove
          ? `${selected.name} 802.1Q ENCAPSULATION REMOVED`
          : `${selected.name} ENCAPSULATION DOT1Q ${command.vlan}`,
      )],
      true,
      ["config-change"],
    );
  }
  if (
    !selected || device.mode !== "interface-config" || device.type !== "switch"
  ) return reject(modeError("switch interface configuration mode"));
  if (command.kind === "switchport-mode") {
    selected.switchportMode = command.mode;
    return finish(
      [success(`${selected.name} MODE ${command.mode.toUpperCase()}`)],
      true,
      ["config-change"],
    );
  }
  if (command.kind === "switchport-access-vlan") {
    selected.accessVlan = command.remove ? 1 : command.vlan;
    return finish(
      [success(`${selected.name} ACCESS VLAN ${selected.accessVlan}`)],
      true,
      ["config-change"],
    );
  }
  if (command.kind === "switchport-trunk-allowed") {
    selected.allowedVlans = command.remove ? [] : command.vlans;
    return finish(
      [success(
        `${selected.name} ALLOWED VLANS ${
          selected.allowedVlans.join(",") || "NONE"
        }`,
      )],
      true,
      ["config-change"],
    );
  }
  return reject([
    warning("NETBITE: Command is not available in this context."),
  ]);
}
