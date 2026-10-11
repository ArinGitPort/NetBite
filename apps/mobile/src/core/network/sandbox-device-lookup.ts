import type {
  SandboxDevice,
  SandboxLinkEndpoint,
  SandboxWorkspace,
} from "./sandbox-types";

export function findDevice(state: SandboxWorkspace, id: string) {
  return state.devices.find((device) => device.id === id);
}
export function findInterface(device: SandboxDevice | undefined, id: string) {
  return device?.interfaces.find((item) => item.id === id);
}
export function endpointKey(endpoint: SandboxLinkEndpoint) {
  return `${endpoint.deviceId}:${endpoint.interfaceId}`;
}
