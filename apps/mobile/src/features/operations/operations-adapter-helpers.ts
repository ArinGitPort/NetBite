import {
  buildOspfTopology,
  calculateOspfRoutes,
  calculateSpanningTree,
  type DhcpState,
  type DnsState,
  type DynamicRoute,
  evaluateIpv4Acl,
  type NatState,
  negotiateEtherChannel,
  type SimulationExplanation,
  translateNatFlow,
} from "@/core/network/operations-simulation";
import type {
  OperationsSimulationSession,
  SimulationValue,
} from "@/features/operations/operations-simulator";

import {
  type OperationsDerivedTable,
  type OperationsObjectiveResult,
  type OperationsProtocolEvent,
} from "./operations-adapter-types";

export type Configuration = Record<string, SimulationValue>;

export const text = (
  value: SimulationValue | undefined,
  fallback = "NOT CONFIGURED",
) => value === undefined || value === "" ? fallback : String(value);
export const enabled = (value: SimulationValue | undefined) =>
  value === true
    ? "UP / ENABLED"
    : value === false
    ? "DOWN / DISABLED"
    : "NOT CONFIGURED";
export const event = (
  id: string,
  detail: string,
  tone: OperationsProtocolEvent["tone"] = "neutral",
  deviceIds: string[] = [],
): OperationsProtocolEvent => ({
  id,
  title: id.replaceAll("-", " ").toUpperCase(),
  detail,
  tone,
  deviceIds,
});
export const table = (
  id: string,
  title: string,
  rows: string[],
): OperationsDerivedTable => ({ id, title, rows });
export const result = (
  passed: boolean,
  message: string,
  rows: string[],
  explanation?: Partial<SimulationExplanation>,
  protocolState?: Record<string, unknown>,
): OperationsObjectiveResult => ({
  passed,
  message,
  events: rows.map((detail, index) =>
    event(`step-${index + 1}`, detail, passed ? "success" : "warning")
  ),
  tables: [table("current-state", "CURRENT DEVICE STATUS", rows)],
  explanation,
  protocolState,
});

export function dhcpState(
  session: OperationsSimulationSession,
): DhcpState | undefined {
  const value = session.protocolState?.dhcp;
  return value && typeof value === "object" &&
      Array.isArray((value as DhcpState).leases)
    ? value as DhcpState
    : undefined;
}

export function dnsState(
  configuration: Configuration,
  session: OperationsSimulationSession,
): DnsState {
  const saved = session.protocolState?.dns as DnsState | undefined;
  return {
    records: configuration["dns.name"] && configuration["dns.value"]
      ? [{
        name: text(configuration["dns.name"]),
        type: "A" as const,
        value: text(configuration["dns.value"]),
        ttl: Number(configuration["dns.ttl"] ?? 0),
        authoritativeServer: "ns.netbite.test",
      }]
      : [],
    cache: saved?.cache ?? [],
    resolverReachable: configuration["dns.reachable"] === true,
  };
}

export function aclEvaluation(configuration: Configuration) {
  return evaluateIpv4Acl(
    {
      protocol: text(configuration["acl.protocol"], "tcp") as
        | "tcp"
        | "udp"
        | "icmp",
      source: text(configuration["acl.source"], "0.0.0.0"),
      destination: text(configuration["acl.destination"], "0.0.0.0"),
      destinationPort: Number(configuration["acl.port"] ?? 0),
    },
    configuration["acl.action"]
      ? [{
        id: `NETBITE-IN-${Number(configuration["acl.sequence"] ?? 10)}`,
        action: text(configuration["acl.action"]) as "permit" | "deny",
        protocol: "tcp",
        source: text(configuration["acl.network"], "0.0.0.0"),
        sourceWildcard: text(configuration["acl.wildcard"], "0.0.0.0"),
        destination: "192.168.20.20",
        destinationWildcard: "0.0.0.0",
        destinationPort: 443,
      }]
      : [],
  );
}

export function natState(
  configuration: Configuration,
  session: OperationsSimulationSession,
): NatState {
  const saved = session.protocolState?.nat as NatState | undefined;
  return {
    insideNetworks: [{
      network: text(configuration["nat.network"], "0.0.0.0"),
      prefix: Number(configuration["nat.prefix"] ?? 0),
    }],
    globalAddress: text(configuration["nat.global"], "0.0.0.0"),
    nextPort: saved?.nextPort ?? 40000,
    entries: saved?.entries ?? [],
    insideUp: configuration["nat.insideUp"] === true,
    outsideUp: configuration["nat.outsideUp"] === true,
  };
}

export function natEvaluation(
  configuration: Configuration,
  session: OperationsSimulationSession,
  flowIndex = 0,
  state = natState(configuration, session),
) {
  return translateNatFlow(state, {
    protocol: "tcp",
    source: `192.168.10.${10 + flowIndex}`,
    sourcePort: 49152 + flowIndex,
    destination: "198.51.100.20",
    destinationPort: 443,
  });
}

export function stpEvaluation(configuration: Configuration) {
  return calculateSpanningTree([
    {
      id: "SW1",
      priority: Number(configuration["stp.priorityA"] ?? 32768),
      mac: "00:00:00:00:00:0A",
    },
    {
      id: "SW2",
      priority: Number(configuration["stp.priorityB"] ?? 32768),
      mac: "00:00:00:00:00:0B",
    },
    {
      id: "SW3",
      priority: Number(configuration["stp.priorityC"] ?? 32768),
      mac: "00:00:00:00:00:0C",
    },
  ], [
    {
      id: "AB",
      a: "SW1",
      b: "SW2",
      cost: Number(configuration["stp.costAB"] ?? 4),
      up: configuration["stp.failedLink"] !== "AB",
    },
    {
      id: "BC",
      a: "SW2",
      b: "SW3",
      cost: Number(configuration["stp.costBC"] ?? 4),
      up: true,
    },
    {
      id: "AC",
      a: "SW1",
      b: "SW3",
      cost: Number(configuration["stp.costAC"] ?? 8),
      up: true,
    },
  ]);
}

export function lacpEvaluation(configuration: Configuration) {
  const vlans = text(configuration["lacp.vlans"], "").split(",").filter(Boolean)
    .map(Number);
  return negotiateEtherChannel([
    {
      id: "SW1 F0/1",
      side: "a",
      mode: text(configuration["lacp.modeA"], "passive") as
        | "active"
        | "passive",
      up: configuration["lacp.membersUp"] === true,
      speed: Number(configuration["lacp.speedA"] ?? 0),
      switchportMode: text(configuration["lacp.switchportMode"], "access") as
        | "access"
        | "trunk",
      allowedVlans: vlans,
    },
    {
      id: "SW2 F0/1",
      side: "b",
      mode: text(configuration["lacp.modeB"], "passive") as
        | "active"
        | "passive",
      up: configuration["lacp.membersUp"] === true,
      speed: Number(configuration["lacp.speedB"] ?? 0),
      switchportMode: text(configuration["lacp.switchportMode"], "access") as
        | "access"
        | "trunk",
      allowedVlans: vlans,
    },
  ]);
}

export function routeCandidates(configuration: Configuration): DynamicRoute[] {
  const routes: DynamicRoute[] = [];
  if (configuration["route.connected"] === true) {
    routes.push({
      prefix: "192.168.10.0",
      prefixLength: 24,
      source: "connected",
      administrativeDistance: 0,
      metric: 0,
    });
  }
  if (
    configuration["route.static"] === true &&
    configuration["route.staticAvailable"] !== false
  ) {
    routes.push({
      prefix: "192.168.20.0",
      prefixLength: 24,
      source: "static",
      administrativeDistance: Number(configuration["route.staticAd"] ?? 1),
      metric: 0,
      nextHop: "10.0.0.2",
    });
  }
  if (configuration["route.ospf"] === true) {
    routes.push({
      prefix: "192.168.20.0",
      prefixLength: Number(configuration["route.prefix"] ?? 24),
      source: "ospf",
      administrativeDistance: Number(configuration["route.ospfAd"] ?? 110),
      metric: 20,
      nextHop: "10.0.0.2",
    });
  }
  routes.push({
    prefix: "0.0.0.0",
    prefixLength: 0,
    source: "static",
    administrativeDistance: 254,
    metric: 0,
    nextHop: "10.0.0.2",
  });
  return routes;
}

export function ospfEvaluation(configuration: Configuration) {
  const topology = buildOspfTopology([
    {
      id: "R1",
      routerId: text(configuration["ospf.r1"], "0.0.0.0"),
      advertisedPrefixes: ["192.168.10.0/24"],
    },
    {
      id: "R2",
      routerId: text(configuration["ospf.r2"], "0.0.0.0"),
      advertisedPrefixes: ["10.0.12.0/30"],
    },
    {
      id: "R3",
      routerId: text(configuration["ospf.r3"], "0.0.0.0"),
      advertisedPrefixes: configuration["ospf.advertise"] === true
        ? ["192.168.30.0/24"]
        : [],
    },
  ], [
    {
      a: "R1",
      b: "R2",
      cost: Number(configuration["ospf.cost12"] ?? 10),
      area: Number(configuration["ospf.area12"] ?? -1),
      up: configuration["ospf.linksUp"] === true,
      compatible: Number(configuration["ospf.area12"]) === 0,
    },
    {
      a: "R2",
      b: "R3",
      cost: Number(configuration["ospf.cost23"] ?? 10),
      area: Number(configuration["ospf.area23"] ?? -1),
      up: configuration["ospf.linksUp"] === true &&
        configuration["ospf.failedLink"] !== "r2-r3-down",
      compatible: Number(configuration["ospf.area23"]) === 0,
    },
  ]);
  return { topology, routes: calculateOspfRoutes(topology, "R1") };
}
