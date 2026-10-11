import type { OperationsSimulationSession } from "@/features/operations/operations-simulator";

import { type OperationsVisualTrace } from "./operations-adapter-types";

export const traceLabels: Record<string, Record<string, string[]>> = {
  "dhcp-lease-desk": {
    pool: ["DHCP1"],
    dora: ["PC1", "SW1", "R1", "DHCP1"],
    renew: ["PC1", "SW1", "R1", "DHCP1"],
    exhaust: ["PC1", "PC2", "SW1", "R1", "DHCP1"],
    release: ["PC2", "SW1", "R1", "DHCP1"],
    relay: ["PC1", "SW1", "R1", "DHCP1"],
  },
  "dns-resolution-desk": {
    stub: ["PC1", "DNS1"],
    hierarchy: ["PC1", "DNS1", "DNS2", "DNS3"],
    cache: ["PC1", "DNS1"],
    expiry: ["DNS1", "DNS3"],
  },
  "acl-policy-desk": {
    tuple: ["PC1"],
    wildcard: ["R1"],
    match: ["PC1", "R1", "WEB1"],
    direction: ["PC1", "R1", "WEB1"],
  },
  "nat-translation-desk": {
    roles: ["R1"],
    selection: ["PC1", "R1"],
    pat: ["PC1", "R1", "WEB1"],
    return: ["WEB1", "R1", "PC1"],
  },
  "ipv6-address-desk": {
    parse: ["PC1"],
    compress: ["PC1"],
    scope: ["PC1"],
    prefix: ["PC1", "SW1", "PC2"],
  },
  "ipv6-neighbor-desk": {
    ns: ["PC1", "R1"],
    ra: ["R1", "PC1"],
    route: ["R1", "R2"],
    return: ["PC1", "R1", "R2", "PC2"],
  },
  "spanning-tree-desk": {
    root: ["SW1", "SW2", "SW3"],
    ports: ["SW1", "SW2", "SW3"],
    block: ["SW1", "SW2", "SW3"],
    change: ["SW1", "SW2", "SW3"],
  },
  "etherchannel-desk": {
    mode: ["SW1", "SW2"],
    members: ["SW1", "SW2"],
    bundle: ["SW1", "SW2"],
    reach: ["SW1", "SW2"],
  },
  "route-source-desk": {
    sources: ["R1"],
    prefix: ["PC1", "R1"],
    ad: ["R1"],
    withdraw: ["PC1", "R1", "PC2"],
  },
  "ospf-area-desk": {
    identity: ["R1", "R2", "R3"],
    neighbor: ["R1", "R2", "R3"],
    spf: ["R1", "R2", "R3"],
    failure: ["R1", "R2", "R3"],
  },
  "network-operations-capstone": {
    "office-l2": ["PC1", "SW1", "SW2"],
    "office-services": ["PC1", "SW1", "SW2", "R1", "DHCP1", "DNS1"],
    "office-routing": ["PC1", "SW1", "SW2", "R1", "WEB1"],
    "office-edge": ["PC1", "SW1", "SW2", "R1", "WEB1"],
    "office-verify": ["PC1", "SW1", "SW2", "R1", "DNS1", "WEB1"],
    "branch-local": ["PC2", "R2"],
    "branch-route": ["PC2", "R2", "R1"],
    "branch-fault": ["PC2", "R2", "R1"],
  },
};

export function visualTrace(
  labId: string,
  stageId: string,
  session: OperationsSimulationSession,
  nodes: readonly { id: string; label: string }[],
  links: readonly { id: string; a: string; b: string }[],
): OperationsVisualTrace | undefined {
  const currentEvidence = session.evidence[session.traceIndex];
  if (!currentEvidence) return undefined;
  const labels = traceLabels[labId]?.[stageId] ?? [];
  const activeDeviceIds = nodes.filter((node) => labels.includes(node.label))
    .map((node) => node.id);
  const activeSet = new Set(activeDeviceIds);
  const activeLinkIds = links.filter((link) =>
    activeSet.has(link.a) && activeSet.has(link.b)
  ).map((link) => link.id);
  const failed = currentEvidence.tone === "warning";
  return {
    activeDeviceIds,
    activeLinkIds,
    failedDeviceId: failed ? activeDeviceIds.at(-1) : undefined,
    failedLinkId: failed ? activeLinkIds.at(-1) : undefined,
    text: currentEvidence.text,
  };
}
