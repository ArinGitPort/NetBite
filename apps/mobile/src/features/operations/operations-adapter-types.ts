import {
  type SimulationExplanation,
} from "@/core/network/operations-simulation";
import type {
  OperationsSimulationSession,
  SimulationValue,
} from "@/features/operations/operations-simulator";

export interface OperationsDeviceRecord {
  id: string;
  title: string;
  lines: string[];
  status: "ready" | "attention" | "inactive";
}

export interface OperationsProtocolEvent {
  id: string;
  title: string;
  detail: string;
  deviceIds: string[];
  tone: "neutral" | "success" | "warning";
}

export interface OperationsDerivedTable {
  id: string;
  title: string;
  rows: string[];
}

export interface OperationsObjectiveResult {
  passed: boolean;
  message: string;
  events: OperationsProtocolEvent[];
  tables: OperationsDerivedTable[];
  explanation?: Partial<SimulationExplanation>;
  protocolState?: Record<string, unknown>;
}

export interface OperationsVisualTrace {
  activeDeviceIds: string[];
  activeLinkIds: string[];
  failedDeviceId?: string;
  failedLinkId?: string;
  text: string;
}

export interface OperationsCliCommandResult {
  accepted: boolean;
  updates: Record<string, SimulationValue>;
  output: string;
}

export interface OperationsSimulationAdapter<
  TState = Record<string, unknown>,
  TAction = Record<string, SimulationValue>,
> {
  id: string;
  createInitialState: () => TState;
  validateAction: (
    state: TState,
    action: TAction,
  ) => { accepted: boolean; message?: string };
  applyAction: (
    state: TState,
    action: TAction,
  ) => { accepted: boolean; state: TState; message?: string };
  inspectDevice: (
    deviceId: string,
    deviceLabel: string,
    session: OperationsSimulationSession,
  ) => OperationsDeviceRecord;
  deriveTables: (
    session: OperationsSimulationSession,
  ) => OperationsDerivedTable[];
  deriveTrace: (
    stageId: string,
    session: OperationsSimulationSession,
    nodes: readonly { id: string; label: string }[],
    links: readonly { id: string; a: string; b: string }[],
  ) => OperationsVisualTrace | undefined;
  evaluateObjective: (
    stageId: string,
    session: OperationsSimulationSession,
  ) => OperationsObjectiveResult;
  evaluateObjectives: (
    session: OperationsSimulationSession,
    stageIds: readonly string[],
  ) => OperationsObjectiveResult[];
}
