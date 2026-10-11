import { parseIPv6Address } from "@/core/network/operations-simulation";

import {
  type GuidedSimulationStage,
  type OperationsSimulationSession,
  type SimulationFieldDefinition,
  type SimulationValue,
} from "./operations-simulator-types";

export function emptyOperationsSimulationSession(): OperationsSimulationSession {
  return {
    version: 4,
    stageIndex: 0,
    completedObjectiveIds: [],
    configuration: {},
    evidence: [],
    tables: {},
    traceIndex: 0,
    hints: [],
    updatedAt: new Date().toISOString(),
  };
}

export function isOperationsSimulationSession(
  value: unknown,
): value is OperationsSimulationSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<OperationsSimulationSession>;
  return session.version === 4 &&
    Number.isInteger(session.stageIndex) &&
    Number(session.stageIndex) >= 0 &&
    Array.isArray(session.completedObjectiveIds) &&
    session.completedObjectiveIds.every((id) => typeof id === "string") &&
    Boolean(
      session.configuration && typeof session.configuration === "object" &&
        !Array.isArray(session.configuration),
    ) &&
    Array.isArray(session.evidence) &&
    Boolean(
      session.tables && typeof session.tables === "object" &&
        !Array.isArray(session.tables),
    ) &&
    Number.isInteger(session.traceIndex) &&
    Number(session.traceIndex) >= 0 &&
    Array.isArray(session.hints) &&
    session.hints.every((hint) => typeof hint === "string") &&
    typeof session.updatedAt === "string";
}

export function validateSimulationField(
  field: SimulationFieldDefinition,
  value: SimulationValue,
): string | undefined {
  if (field.kind === "toggle") {
    return typeof value === "boolean"
      ? undefined
      : `${field.label} must be enabled or disabled.`;
  }
  const raw = String(value).trim();
  if (!raw) return `${field.label} is required.`;
  if (
    field.kind === "select" &&
    !field.options?.some((entry) => entry.value === value)
  ) return `Choose one available ${field.label.toLowerCase()} option.`;
  if (field.format === "port") {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      return `${field.label} must be a port from 1 to 65535.`;
    }
  }
  if (field.format === "prefix4") {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 32) {
      return `${field.label} must be an IPv4 prefix from 0 to 32.`;
    }
  }
  if (field.format === "prefix6") {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 128) {
      return `${field.label} must be an IPv6 prefix from 0 to 128.`;
    }
  }
  if (
    field.format === "positive" &&
    (!Number.isFinite(Number(raw)) || Number(raw) < 0)
  ) return `${field.label} must be a non-negative number.`;
  if (field.format === "ipv4" && !/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(raw)) {
    return `${field.label} must use dotted-decimal IPv4 notation.`;
  }
  if (
    field.format === "ipv4" && raw.split(".").some((part) => Number(part) > 255)
  ) return `${field.label} contains an octet outside 0–255.`;
  if (field.format === "ipv6" && !parseIPv6Address(raw)) {
    return `${field.label} is not a valid IPv6 address.`;
  }
  if (
    field.format === "csv-vlan" &&
    (!/^\d+(,\d+)*$/.test(raw) ||
      raw.split(",").some((item) => Number(item) < 1 || Number(item) > 4094))
  ) return `${field.label} must be comma-separated VLAN IDs from 1 to 4094.`;
  return undefined;
}

export function applySimulationConfiguration(
  session: OperationsSimulationSession,
  stageDefinition: GuidedSimulationStage,
  draft: Record<string, SimulationValue>,
) {
  for (const field of stageDefinition.fields) {
    const error = validateSimulationField(field, draft[field.id]);
    if (error) return { accepted: false, session, error };
  }
  return {
    accepted: true,
    session: {
      ...session,
      configuration: { ...session.configuration, ...draft },
      lastResult: undefined,
      evidence: [],
      traceIndex: 0,
    },
    error: undefined,
  };
}
