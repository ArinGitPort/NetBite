import { type RouteEntry } from "@/core/network/advanced-networking";
import {
  type CliCommandResult,
  type CliNetworkState,
} from "@/core/network/cli-simulator";

export type SandboxDeviceType = "pc" | "switch" | "router";
export type SandboxSwitchportMode = "access" | "trunk";

export interface SandboxPosition {
  x: number;
  y: number;
}
export interface SandboxInterface {
  id: string;
  name: string;
  macAddress: string;
  adminUp: boolean;
  parentInterfaceId?: string;
  encapsulationVlan?: number;
  ipv4?: string;
  prefix?: number;
  switchportMode?: SandboxSwitchportMode;
  accessVlan?: number;
  allowedVlans?: number[];
}
export interface SandboxArpEntry {
  ip: string;
  macAddress: string;
  interfaceId: string;
}
export interface SandboxMacEntry {
  macAddress: string;
  interfaceId: string;
  vlan: number;
}
export interface SandboxDevice {
  id: string;
  name: string;
  type: SandboxDeviceType;
  position: SandboxPosition;
  interfaces: SandboxInterface[];
  routes: RouteEntry[];
  vlans: number[];
  defaultGateway?: string;
  arpTable: SandboxArpEntry[];
  macTable: SandboxMacEntry[];
}
export interface SandboxLinkEndpoint {
  deviceId: string;
  interfaceId: string;
}
export interface SandboxLink {
  id: string;
  a: SandboxLinkEndpoint;
  b: SandboxLinkEndpoint;
}
export interface SandboxWorkspace {
  schemaVersion: 1 | 2;
  devices: SandboxDevice[];
  links: SandboxLink[];
  nextDeviceNumber: Record<SandboxDeviceType, number>;
}
export type SandboxTraceTone = "neutral" | "active" | "success" | "warning";
export interface SandboxTraceEvent {
  id: string;
  title: string;
  detail: string;
  deviceIds: string[];
  linkIds: string[];
  tone: SandboxTraceTone;
}
export interface SandboxTraceResult {
  success: boolean;
  reason: string;
  conclusion: string;
  suggestion?: string;
  events: SandboxTraceEvent[];
  state: SandboxWorkspace;
}
export interface SandboxCliExecutionResult {
  state: SandboxWorkspace;
  sessionState: CliNetworkState;
  result?: CliCommandResult;
  trace?: SandboxTraceResult;
  error?: string;
  workspaceMutated?: boolean;
}
export type SandboxConnectionResult =
  | { ok: true; state: SandboxWorkspace; link: SandboxLink }
  | {
    ok: false;
    reason:
      | "same-device"
      | "duplicate"
      | "no-free-interface"
      | "layer2-cycle"
      | "device-missing";
    message: string;
  };
export interface SandboxValidationIssue {
  level: "warning" | "error";
  code: string;
  message: string;
  deviceIds: string[];
}
export type SandboxPingReadinessIssueCode =
  | "source-required"
  | "source-missing"
  | "source-unconfigured"
  | "source-interface-down"
  | "destination-required"
  | "destination-invalid";
export interface SandboxPingReadinessIssue {
  code: SandboxPingReadinessIssueCode;
  message: string;
  deviceId?: string;
}
export interface SandboxPingReadiness {
  ready: boolean;
  sourceDeviceId?: string;
  sourceInterfaceId?: string;
  sourceAddress?: string;
  destinationIp?: string;
  issues: SandboxPingReadinessIssue[];
}
export interface SandboxBeginnerLanDeviceChange {
  deviceId: string;
  deviceName: string;
  before: string;
  after: string;
}
export interface SandboxBeginnerLanSetup {
  pcIds: [string, string];
  switchId: string;
  changes: SandboxBeginnerLanDeviceChange[];
  overwritesExistingConfiguration: boolean;
  requiresChanges: boolean;
}
