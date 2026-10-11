import type { SandboxWorkspace } from "./sandbox-types";
import {
  createEmptySandboxWorkspace,
  createRouterSubinterface,
} from "./sandbox-workspace";
import { addSandboxDevice, connectSandboxInterfaces } from "./sandbox-topology";
import { configureSandboxDevice } from "./sandbox-configuration";

export function createGuidedSandboxWorkspace(): SandboxWorkspace {
  let state = createEmptySandboxWorkspace();
  state = addSandboxDevice(state, "pc", { x: 40, y: 80 }).state;
  state = addSandboxDevice(state, "switch", { x: 250, y: 170 }).state;
  state = addSandboxDevice(state, "pc", { x: 460, y: 80 }).state;
  return state;
}

export function createReadyRoutedSandboxWorkspace(): SandboxWorkspace {
  let state = createEmptySandboxWorkspace();
  state = addSandboxDevice(state, "pc", { x: 10, y: 150 }).state;
  state = addSandboxDevice(state, "switch", { x: 155, y: 150 }).state;
  state = addSandboxDevice(state, "router", { x: 310, y: 150 }).state;
  state = addSandboxDevice(state, "switch", { x: 465, y: 150 }).state;
  state = addSandboxDevice(state, "pc", { x: 610, y: 150 }).state;
  for (
    const [first, second] of [["pc-1", "switch-1"], ["switch-1", "router-1"], [
      "router-1",
      "switch-2",
    ], ["switch-2", "pc-2"]] as const
  ) {
    const result = connectSandboxInterfaces(state, first, second);
    if (result.ok) state = result.state;
  }
  state = configureSandboxDevice(state, "pc-1", {
    interfaceId: "E0",
    interface: { ipv4: "192.168.10.10", prefix: 24 },
    defaultGateway: "192.168.10.1",
  }).state;
  state = configureSandboxDevice(state, "router-1", {
    interfaceId: "G0/0",
    interface: { ipv4: "192.168.10.1", prefix: 24 },
  }).state;
  state = configureSandboxDevice(state, "router-1", {
    interfaceId: "G0/1",
    interface: { ipv4: "192.168.20.1", prefix: 24 },
  }).state;
  state = configureSandboxDevice(state, "pc-2", {
    interfaceId: "E0",
    interface: { ipv4: "192.168.20.20", prefix: 24 },
    defaultGateway: "192.168.20.1",
  }).state;
  return state;
}

export function createInterVlanSandboxWorkspace(): SandboxWorkspace {
  let state = createEmptySandboxWorkspace();
  state = addSandboxDevice(state, "pc", { x: 30, y: 70 }).state;
  state = addSandboxDevice(state, "switch", { x: 250, y: 150 }).state;
  state = addSandboxDevice(state, "pc", { x: 470, y: 70 }).state;
  state = addSandboxDevice(state, "router", { x: 250, y: 280 }).state;
  const links: [string, string, string, string][] = [
    ["pc-1", "switch-1", "E0", "F0/1"],
    ["pc-2", "switch-1", "E0", "F0/2"],
    ["switch-1", "router-1", "F0/24", "G0/0"],
  ];
  links.forEach(([first, second, firstInterface, secondInterface]) => {
    const result = connectSandboxInterfaces(
      state,
      first,
      second,
      firstInterface,
      secondInterface,
    );
    if (result.ok) state = result.state;
  });
  state = configureSandboxDevice(state, "pc-1", {
    interfaceId: "E0",
    interface: { ipv4: "192.168.10.10", prefix: 24 },
    defaultGateway: "192.168.10.1",
  }).state;
  state = configureSandboxDevice(state, "pc-2", {
    interfaceId: "E0",
    interface: { ipv4: "192.168.20.20", prefix: 24 },
    defaultGateway: "192.168.20.1",
  }).state;
  state = configureSandboxDevice(state, "switch-1", { vlans: [10, 20] }).state;
  state = configureSandboxDevice(state, "switch-1", {
    interfaceId: "F0/1",
    interface: { switchportMode: "access", accessVlan: 10 },
  }).state;
  state = configureSandboxDevice(state, "switch-1", {
    interfaceId: "F0/2",
    interface: { switchportMode: "access", accessVlan: 20 },
  }).state;
  state = configureSandboxDevice(state, "switch-1", {
    interfaceId: "F0/24",
    interface: { switchportMode: "trunk", allowedVlans: [10, 20] },
  }).state;
  const first = createRouterSubinterface(state, "router-1", "G0/0", 10);
  if (first.ok) {
    state = configureSandboxDevice(first.state, "router-1", {
      interfaceId: "G0/0.10",
      interface: { encapsulationVlan: 10, ipv4: "192.168.10.1", prefix: 24 },
    }).state;
  }
  const second = createRouterSubinterface(state, "router-1", "G0/0", 20);
  if (second.ok) {
    state = configureSandboxDevice(second.state, "router-1", {
      interfaceId: "G0/0.20",
      interface: { encapsulationVlan: 20, ipv4: "192.168.20.1", prefix: 24 },
    }).state;
  }
  return state;
}
