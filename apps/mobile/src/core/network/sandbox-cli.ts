import {
  type CliCommandResult,
  type CliDeviceState,
  type CliNetworkState,
  cloneCliNetwork,
  executeCliCommand,
  parseCliCommand,
} from "@/core/network/cli-simulator";

import { simulateSandboxPing } from "./sandbox-routing";
import { failure } from "./sandbox-trace";
import { endpointKey, findDevice } from "./sandbox-device-lookup";
import {
  type SandboxCliExecutionResult,
  type SandboxTraceResult,
  type SandboxWorkspace,
} from "./sandbox-types";
import { cloneWorkspace } from "./sandbox-workspace";

export function createSandboxCliState(
  state: SandboxWorkspace,
): CliNetworkState {
  return {
    devices: state.devices.map((device): CliDeviceState => ({
      id: device.id,
      name: device.name,
      type: device.type === "pc" ? "host" : device.type,
      mode: "user-exec",
      interfaces: device.interfaces.map((item) => {
        const physicalId = item.parentInterfaceId ?? item.id;
        return {
          ...item,
          name: item.id,
          parentInterface: item.parentInterfaceId,
          linkUp: state.links.some((link) =>
            [endpointKey(link.a), endpointKey(link.b)].includes(
              `${device.id}:${physicalId}`,
            )
          ),
        };
      }),
      routes: device.routes.map((route) => ({ ...route })),
      vlans: [...device.vlans],
      arpEntries: device.arpTable.map((entry) => ({
        ip: entry.ip,
        macAddress: entry.macAddress,
        interfaceName: entry.interfaceId,
      })),
      macEntries: device.macTable.map((entry) => ({
        macAddress: entry.macAddress,
        interfaceName: entry.interfaceId,
        vlan: entry.vlan,
      })),
    })),
    links: state.links.map((link) => ({
      aDeviceId: link.a.deviceId,
      aInterface: link.a.interfaceId,
      bDeviceId: link.b.deviceId,
      bInterface: link.b.interfaceId,
    })),
  };
}

export function syncCliSessionFromWorkspace(
  session: CliNetworkState,
  workspace: SandboxWorkspace,
) {
  const synced = createSandboxCliState(workspace);
  synced.devices.forEach((device) => {
    const previous = session.devices.find((candidate) =>
      candidate.id === device.id
    );
    if (!previous) return;
    device.mode = previous.mode;
    device.selectedInterface = previous.selectedInterface;
    device.selectedVlan = previous.selectedVlan;
  });
  return synced;
}

export function learnedStateChanged(
  before: SandboxWorkspace,
  after: SandboxWorkspace,
) {
  return before.devices.some((device) => {
    const next = after.devices.find((candidate) => candidate.id === device.id);
    return !next ||
      JSON.stringify(device.arpTable) !== JSON.stringify(next.arpTable) ||
      JSON.stringify(device.macTable) !== JSON.stringify(next.macTable);
  });
}

export function sandboxPingOutput(
  trace: SandboxTraceResult,
  destination: string,
): CliCommandResult["output"] {
  const output: CliCommandResult["output"] = [{
    text: `PING TARGET ${destination}`,
    tone: "normal",
  }];
  output.push({
    text: trace.success
      ? "ECHO REPLY RECEIVED / THIS ROUND TRIP SUCCEEDED"
      : `NO ECHO REPLY / ${trace.reason.toUpperCase()}`,
    tone: trace.success ? "success" : "warning",
  });
  output.push({ text: trace.conclusion.toUpperCase(), tone: "muted" });
  if (trace.suggestion) {
    output.push({
      text: `NEXT CHECK / ${trace.suggestion.toUpperCase()}`,
      tone: "muted",
    });
  }
  return output;
}

export function mergeCliState(state: SandboxWorkspace, cli: CliNetworkState) {
  const next = cloneWorkspace(state);
  next.devices.forEach((device) => {
    const cliDevice = cli.devices.find((item) => item.id === device.id);
    if (!cliDevice) return;
    device.routes = cliDevice.routes.map((route) => ({ ...route }));
    device.vlans = [...cliDevice.vlans];
    if (cliDevice.arpEntries) {
      device.arpTable = cliDevice.arpEntries.map((entry) => ({
        ip: entry.ip,
        macAddress: entry.macAddress,
        interfaceId: entry.interfaceName,
      }));
    }
    if (cliDevice.macEntries) {
      device.macTable = cliDevice.macEntries.map((entry) => ({
        macAddress: entry.macAddress,
        interfaceId: entry.interfaceName,
        vlan: entry.vlan,
      }));
    }
    const cliNames = new Set(cliDevice.interfaces.map((item) => item.name));
    device.interfaces = device.interfaces.filter((item) =>
      !item.parentInterfaceId || cliNames.has(item.id)
    );
    cliDevice.interfaces.filter((item) =>
      item.parentInterface &&
      !device.interfaces.some((candidate) => candidate.id === item.name)
    ).forEach((item) => {
      const parent = device.interfaces.find((candidate) =>
        candidate.id === item.parentInterface
      );
      if (!parent) return;
      device.interfaces.push({
        id: item.name,
        name: item.name,
        macAddress: parent.macAddress,
        parentInterfaceId: item.parentInterface,
        encapsulationVlan: item.encapsulationVlan,
        adminUp: item.adminUp,
        ipv4: item.ipv4,
        prefix: item.prefix,
      });
    });
    device.interfaces.forEach((item) => {
      const cliInterface = cliDevice.interfaces.find((candidate) =>
        candidate.name === item.id
      );
      if (!cliInterface) return;
      Object.assign(item, {
        adminUp: cliInterface.adminUp,
        ipv4: cliInterface.ipv4,
        prefix: cliInterface.prefix,
        parentInterfaceId: cliInterface.parentInterface,
        encapsulationVlan: cliInterface.encapsulationVlan,
        switchportMode: cliInterface.switchportMode,
        accessVlan: cliInterface.accessVlan,
        allowedVlans: cliInterface.allowedVlans
          ? [...cliInterface.allowedVlans]
          : undefined,
      });
    });
  });
  next.schemaVersion = 2;
  return next;
}

export function executeSandboxCliCommand(
  state: SandboxWorkspace,
  deviceId: string,
  input: string,
  sessionState: CliNetworkState = createSandboxCliState(state),
): SandboxCliExecutionResult {
  const parsed = parseCliCommand(input);
  if (!parsed.ok) return { state, sessionState, error: parsed.error };
  const cli = cloneCliNetwork(sessionState);
  if (parsed.command.kind === "ping") {
    const effectiveWorkspace = mergeCliState(state, cli);
    const source = findDevice(effectiveWorkspace, deviceId);
    const trace = source?.interfaces.some((item) =>
        item.adminUp && item.ipv4 && item.prefix !== undefined
      )
      ? simulateSandboxPing(
        effectiveWorkspace,
        deviceId,
        parsed.command.destination,
      )
      : failure(
        effectiveWorkspace,
        "The selected device has no active IPv4 interface.",
        "It cannot originate an IPv4 Echo Request.",
        "Choose R1 or configure and enable an IPv4 interface.",
      );
    const workspaceMutated = learnedStateChanged(
      effectiveWorkspace,
      trace.state,
    );
    const nextSession = syncCliSessionFromWorkspace(cli, trace.state);
    const result: CliCommandResult = {
      accepted: true,
      mutated: workspaceMutated,
      state: nextSession,
      output: sandboxPingOutput(trace, parsed.command.destination),
      events: [
        trace.success
          ? `ping-success:${parsed.command.destination}`
          : `ping-failure:${parsed.command.destination}`,
      ],
    };
    return {
      state: trace.state,
      sessionState: nextSession,
      result,
      trace,
      workspaceMutated,
    };
  }
  const result = executeCliCommand(cli, deviceId, parsed.command);
  const workspaceMutated = result.events.some((item) =>
    item === "config-change" || item === "clear-arp" || item === "clear-mac"
  );
  return {
    state: workspaceMutated ? mergeCliState(state, result.state) : state,
    sessionState: result.state,
    result,
    workspaceMutated,
  };
}
