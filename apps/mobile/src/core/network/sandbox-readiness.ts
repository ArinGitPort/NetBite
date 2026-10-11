import {
  calculateSubnetRange,
  parseIPv4Address,
} from "@/core/network/advanced-networking";
import type {
  SandboxInterface,
  SandboxPingReadiness,
  SandboxPingReadinessIssue,
  SandboxWorkspace,
} from "./sandbox-types";
import { findDevice } from "./sandbox-device-lookup";
import { sourceInterfaceForPing } from "./sandbox-routing";

export function getSandboxPingReadiness(
  state: SandboxWorkspace,
  sourceDeviceId?: string,
  destinationIp = "",
): SandboxPingReadiness {
  const issues: SandboxPingReadinessIssue[] = [];
  const source = sourceDeviceId ? findDevice(state, sourceDeviceId) : undefined;
  const normalizedDestination = destinationIp.trim();
  let selectedSourceInterface: SandboxInterface | undefined;
  if (!sourceDeviceId) {
    issues.push({
      code: "source-required",
      message: "Choose a source device.",
    });
  } else if (!source) {
    issues.push({
      code: "source-missing",
      message: "The selected source device is no longer available.",
    });
  } else {
    const configured = source.interfaces.filter((item) =>
      item.ipv4 && item.prefix !== undefined &&
      calculateSubnetRange(item.ipv4, item.prefix)
    );
    if (!configured.length) {
      issues.push({
        code: "source-unconfigured",
        message:
          `${source.name} does not have a saved IPv4 address and prefix.`,
        deviceId: source.id,
      });
    } else if (!configured.some((item) => item.adminUp)) {
      issues.push({
        code: "source-interface-down",
        message: `${source.name}'s addressed interface is down.`,
        deviceId: source.id,
      });
    } else {
      selectedSourceInterface = sourceInterfaceForPing(
        source,
        normalizedDestination,
      );
    }
  }

  if (!normalizedDestination) {
    issues.push({
      code: "destination-required",
      message: "Enter or choose a destination IPv4 address.",
    });
  } else if (!parseIPv4Address(normalizedDestination)) {
    issues.push({
      code: "destination-invalid",
      message: "Enter a valid destination such as 192.168.10.20.",
    });
  }

  return {
    ready: issues.length === 0,
    sourceDeviceId: source?.id,
    sourceInterfaceId: selectedSourceInterface?.id,
    sourceAddress: selectedSourceInterface?.ipv4,
    destinationIp: normalizedDestination || undefined,
    issues,
  };
}
