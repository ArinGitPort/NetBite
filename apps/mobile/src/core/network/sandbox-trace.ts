import type {
  SandboxTraceEvent,
  SandboxTraceResult,
  SandboxTraceTone,
  SandboxWorkspace,
} from "./sandbox-types";

export function event(
  id: string,
  title: string,
  detail: string,
  deviceIds: string[],
  linkIds: string[],
  tone: SandboxTraceTone,
): SandboxTraceEvent {
  return { id, title, detail, deviceIds, linkIds, tone };
}
export function failure(
  state: SandboxWorkspace,
  reason: string,
  conclusion: string,
  suggestion: string,
  events: SandboxTraceEvent[] = [],
): SandboxTraceResult {
  return {
    success: false,
    reason,
    conclusion,
    suggestion,
    events: [
      ...events,
      event("failure", "PATH STOPPED", reason, [], [], "warning"),
    ],
    state,
  };
}
