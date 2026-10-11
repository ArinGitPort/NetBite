import { deriveIpv4Network } from "@netbite/networking";
import type {
  WorkshopDeviceInterface,
  WorkshopDeviceType,
  WorkshopLinkPurpose,
  WorkshopTopology,
  WorkshopTopologyDevice,
  WorkshopTopologyLink,
  WorkshopTopologyStarterId,
} from "./workshop-contract";

export interface WorkshopLinkContext {
  label: string;
  tone: "network" | "vlan" | "warning" | "neutral";
}

export interface WorkshopConnectionCandidate {
  deviceId: string;
  interfaceId: string;
  deviceName: string;
  interfaceName: string;
}

export interface WorkshopTopologyViewport {
  width: number;
  height: number;
  fontScale: number;
}

export interface WorkshopTopologyNodeBounds {
  deviceId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkshopTopologyPoint {
  x: number;
  y: number;
}

export interface WorkshopTopologyLabelGeometry extends WorkshopTopologyPoint {
  id: string;
  linkId: string;
  kind: "endpoint" | "context";
  text: string;
  width: number;
  height: number;
  tone: WorkshopLinkContext["tone"];
}

export interface WorkshopCableGeometry {
  linkId: string;
  start: WorkshopTopologyPoint;
  end: WorkshopTopologyPoint;
  endpointLabels: WorkshopTopologyLabelGeometry[];
  contextLabel: WorkshopTopologyLabelGeometry;
}
