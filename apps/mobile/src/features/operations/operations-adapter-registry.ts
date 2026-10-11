import type { OperationsSimulationSession } from "@/features/operations/operations-simulator";

import { deviceRecord } from "./operations-adapter-devices";
import { evaluate } from "./operations-adapter-evaluation";
import { result } from "./operations-adapter-helpers";
import { visualTrace } from "./operations-adapter-traces";
import { type OperationsSimulationAdapter } from "./operations-adapter-types";

export function createAdapter(id: string): OperationsSimulationAdapter {
  return {
    id,
    createInitialState: () => ({}),
    validateAction: (_state, action) => ({
      accepted: Boolean(action && typeof action === "object"),
      message: action && typeof action === "object"
        ? undefined
        : "Enter a valid configuration change.",
    }),
    applyAction: (state, action) => ({
      accepted: true,
      state: { ...state, ...action },
    }),
    inspectDevice: (deviceId, label, session) =>
      deviceRecord(id, deviceId, label, session),
    deriveTables: (session) =>
      evaluate(id, session.completedObjectiveIds.at(-1) ?? "", session).tables,
    deriveTrace: (stageId, session, nodes, links) =>
      visualTrace(id, stageId, session, nodes, links),
    evaluateObjective: (stageId, session) => evaluate(id, stageId, session),
    evaluateObjectives: (session, stageIds) =>
      stageIds.map((stageId) => evaluate(id, stageId, session)),
  };
}

export const ids = [
  "transport-service-desk",
  "dhcp-lease-desk",
  "dns-resolution-desk",
  "acl-policy-desk",
  "nat-translation-desk",
  "ipv6-address-desk",
  "ipv6-neighbor-desk",
  "spanning-tree-desk",
  "etherchannel-desk",
  "route-source-desk",
  "ospf-area-desk",
  "network-operations-capstone",
];

export const operationsSimulationAdapters: Record<
  string,
  OperationsSimulationAdapter
> = Object.fromEntries(ids.map((id) => [id, createAdapter(id)]));

export function getOperationsDeviceRecord(
  labId: string,
  deviceId: string,
  label: string,
  session: OperationsSimulationSession,
) {
  return operationsSimulationAdapters[labId]?.inspectDevice(
    deviceId,
    label,
    session,
  ) ??
    {
      id: `${labId}:${deviceId}`,
      title: label,
      lines: ["SIMULATOR ADAPTER UNAVAILABLE"],
      status: "attention" as const,
    };
}

export function deriveOperationsVisualTrace(
  labId: string,
  stageId: string,
  session: OperationsSimulationSession,
  nodes: readonly { id: string; label: string }[],
  links: readonly { id: string; a: string; b: string }[],
) {
  return operationsSimulationAdapters[labId]?.deriveTrace(
    stageId,
    session,
    nodes,
    links,
  );
}

export function evaluateOperationsAdapterObjective(
  labId: string,
  stageId: string,
  session: OperationsSimulationSession,
) {
  return operationsSimulationAdapters[labId]?.evaluateObjective(
    stageId,
    session,
  ) ?? result(false, "Simulator adapter unavailable.", ["NO ADAPTER"]);
}
