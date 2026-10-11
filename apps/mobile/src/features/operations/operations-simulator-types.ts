import type { ModuleReleaseState } from "@/content/types";
import {
  type SimulationExplanation,
} from "@/core/network/operations-simulation";

export type SimulationValue = string | number | boolean;
export type SimulationFieldKind = "text" | "number" | "select" | "toggle";

export interface SimulationFieldOption {
  label: string;
  value: SimulationValue;
  command?: string;
}

export interface SimulationFieldDefinition {
  id: string;
  label: string;
  kind: SimulationFieldKind;
  expected: SimulationValue;
  placeholder?: string;
  options?: SimulationFieldOption[];
  format?:
    | "ipv4"
    | "ipv6"
    | "port"
    | "prefix4"
    | "prefix6"
    | "positive"
    | "csv-vlan"
    | "text";
  helpText?: string;
  incorrectFeedback: string;
}

export interface GuidedSimulationStage {
  id: string;
  actionLabel: string;
  fields: SimulationFieldDefinition[];
  hints: string[];
  providedFacts?: string[];
}

export interface GuidedSimulationDefinition {
  labId: string;
  releaseState: ModuleReleaseState;
  cliEnabled: boolean;
  stages: GuidedSimulationStage[];
}

export interface SimulationEvidence {
  id: string;
  text: string;
  tone: "neutral" | "success" | "warning";
}

export interface ObjectiveResult {
  accepted: boolean;
  passed: boolean;
  message: string;
  evidence: SimulationEvidence[];
  tableRows: string[];
  explanation: SimulationExplanation;
  protocolState?: Record<string, unknown>;
}

export interface OperationsSimulationSession {
  version: 4;
  stageIndex: number;
  completedObjectiveIds: string[];
  configuration: Record<string, SimulationValue>;
  evidence: SimulationEvidence[];
  tables: Record<string, string[]>;
  traceIndex: number;
  hints: string[];
  lastResult?: ObjectiveResult;
  protocolState?: Record<string, unknown>;
  updatedAt: string;
}
