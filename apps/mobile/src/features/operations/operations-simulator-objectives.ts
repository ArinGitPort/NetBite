import {
  allocateDhcpLease,
  buildOspfTopology,
  calculateOspfRoutes,
  calculateSpanningTree,
  type DhcpState,
  evaluateIpv4Acl,
  inspectDhcpPool,
  negotiateEtherChannel,
  parseIPv6Address,
  relayDhcpMessage,
  releaseDhcpLease,
  resolveDnsQuery,
  resolveIPv6Neighbor,
  selectRouteSource,
  simulateTransportExchange,
  type SimulationExplanation,
  traceIPv6Path,
  translateNatFlow,
  validateOperationsCapstone,
} from "@/core/network/operations-simulation";
import { evaluateOperationsAdapterObjective } from "@/features/operations/operations-adapters";
import { normalizeDeviceReference } from "@/shared/device-display-names";

import {
  type GuidedSimulationStage,
  type ObjectiveResult,
  type OperationsSimulationSession,
  type SimulationValue,
} from "./operations-simulator-types";

export function savedDhcpState(
  session: OperationsSimulationSession,
): DhcpState {
  const saved = session.protocolState?.dhcp;
  if (
    saved && typeof saved === "object" &&
    Array.isArray((saved as DhcpState).leases)
  ) return saved as DhcpState;
  return {
    pool: {
      network: String(session.configuration["dhcp.network"] ?? "192.168.20.0"),
      prefix: Number(session.configuration["dhcp.prefix"] ?? 24),
      start: String(session.configuration["dhcp.start"] ?? "192.168.20.100"),
      end: String(session.configuration["dhcp.end"] ?? "192.168.20.102"),
      gateway: String(session.configuration["dhcp.gateway"] ?? ""),
      excluded: [String(session.configuration["dhcp.excluded"] ?? "")],
    },
    leases: [],
  };
}

export function dhcpRows(state: DhcpState) {
  const availability = inspectDhcpPool(state);
  return [
    ...state.leases.map((lease) =>
      `${lease.clientId} / ${lease.address} / ${lease.state.toUpperCase()}`
    ),
    `AVAILABLE / ${availability.available.join(", ") || "NONE"}`,
  ];
}

export function dhcpObjective(
  stageDefinition: GuidedSimulationStage,
  session: OperationsSimulationSession,
  explanation: SimulationExplanation,
): ObjectiveResult {
  let state = savedDhcpState(session);
  let events: string[] = [];
  let message = "Objective satisfied from the current DHCP state.";
  let derivedExplanation = explanation;
  if (stageDefinition.id === "pool") {
    state = {
      pool: {
        network: String(session.configuration["dhcp.network"]),
        prefix: Number(session.configuration["dhcp.prefix"]),
        start: String(session.configuration["dhcp.start"]),
        end: String(session.configuration["dhcp.end"]),
        gateway: String(session.configuration["dhcp.gateway"]),
        excluded: [String(session.configuration["dhcp.excluded"])],
      },
      leases: [],
    };
    const pool = inspectDhcpPool(state);
    events = [
      `NETWORK ${state.pool.network}/${state.pool.prefix}`,
      `POOL ${state.pool.start}–${state.pool.end}`,
      `EXCLUDED ${state.pool.excluded?.join(", ")}`,
      `GATEWAY ${state.pool.gateway ?? "NONE"}`,
      `LEASE STEPS ${session.configuration["dhcp.leaseSteps"]}`,
      `FIRST AVAILABLE ${pool.firstAvailable ?? "NONE"}`,
    ];
    if (
      pool.firstAvailable !== "192.168.20.101" ||
      state.pool.gateway !== "192.168.20.1" ||
      Number(session.configuration["dhcp.leaseSteps"]) !== 4
    ) {
      return {
        accepted: true,
        passed: false,
        message:
          "The saved pool options do not yet describe the supplied client network.",
        evidence: events.map((text, index) => ({
          id: `pool-${index}`,
          text,
          tone: "warning",
        })),
        tableRows: dhcpRows(state),
        explanation: {
          ...explanation,
          observation: `The first available address is ${
            pool.firstAvailable ?? "none"
          } and the gateway option is ${state.pool.gateway ?? "missing"}.`,
          nextCheck:
            "Check the client subnet, pool limits, exclusions, gateway, and lease duration in that order.",
        },
        protocolState: { dhcp: state },
      };
    }
  } else if (stageDefinition.id === "dora" || stageDefinition.id === "renew") {
    const client = String(
      session.configuration[
        stageDefinition.id === "dora" ? "dhcp.client" : "dhcp.renewClient"
      ],
    );
    const allocation = allocateDhcpLease(state, client);
    state = allocation.state;
    events = allocation.events;
    derivedExplanation = allocation.explanation;
    if (!allocation.mutated) message = allocation.explanation.observation;
    if (
      stageDefinition.id === "dora" &&
      !state.leases.some((lease) =>
        normalizeDeviceReference(lease.clientId) === "pc-a" &&
        lease.address === "192.168.20.101"
      )
    ) {
      return {
        accepted: true,
        passed: false,
        message:
          "PC1 must receive the first available address from the configured pool.",
        evidence: events.map((text, index) => ({
          id: `dora-${index}`,
          text,
          tone: "warning",
        })),
        tableRows: dhcpRows(state),
        explanation: allocation.explanation,
        protocolState: { dhcp: state },
      };
    }
    if (
      stageDefinition.id === "renew" &&
      normalizeDeviceReference(client) !== "pc-a"
    ) {
      return {
        accepted: true,
        passed: false,
        message:
          "Renew the existing PC1 binding rather than creating another client binding.",
        evidence: events.map((text, index) => ({
          id: `renew-${index}`,
          text,
          tone: "warning",
        })),
        tableRows: dhcpRows(state),
        explanation: allocation.explanation,
        protocolState: { dhcp: state },
      };
    }
  } else if (stageDefinition.id === "exhaust") {
    const clients = ["PC2", "PC3"].slice(
      0,
      Number(session.configuration["dhcp.requestCount"]),
    );
    for (const client of clients) {
      const allocation = allocateDhcpLease(state, client);
      state = allocation.state;
      events.push(...allocation.events.map((event) => `${client} / ${event}`));
    }
    const availability = inspectDhcpPool(state);
    if (!availability.exhausted) {
      return {
        accepted: true,
        passed: false,
        message: "The pool is not exhausted yet.",
        evidence: events.map((text, index) => ({
          id: `exhaust-${index}`,
          text,
          tone: "warning",
        })),
        tableRows: dhcpRows(state),
        explanation: {
          ...explanation,
          observation:
            `${availability.available.length} address remains available.`,
          nextCheck:
            "Request enough leases to use every non-excluded pool address.",
        },
        protocolState: { dhcp: state },
      };
    }
  } else if (stageDefinition.id === "release") {
    const released = releaseDhcpLease(
      state,
      String(session.configuration["dhcp.releaseClient"]),
    );
    state = released.state;
    events = released.events;
    derivedExplanation = released.explanation;
  } else if (stageDefinition.id === "relay") {
    const relay = relayDhcpMessage({
      clientNetwork: "192.168.20.0/24",
      relayAddress: String(session.configuration["dhcp.relay"]),
      serverReachable: Boolean(session.configuration["dhcp.serverReachable"]),
    });
    events = [
      `CLIENT BROADCAST / VLAN 20`,
      `R1 RELAY / ${session.configuration["dhcp.relay"]}`,
      `DHCP1 PATH / ${relay.forwarded ? "FORWARDED" : "STOPPED"}`,
      relay.reason,
    ];
    if (!relay.forwarded) {
      return {
        accepted: true,
        passed: false,
        message: relay.reason,
        evidence: events.map((text, index) => ({
          id: `relay-${index}`,
          text,
          tone: "warning",
        })),
        tableRows: dhcpRows(state),
        explanation: { ...explanation, observation: relay.reason },
        protocolState: { dhcp: state },
      };
    }
  }
  const evidence = events.map((text, index) => ({
    id: `${stageDefinition.id}-${index}`,
    text,
    tone: "success" as const,
  }));
  return {
    accepted: true,
    passed: true,
    message,
    evidence,
    tableRows: dhcpRows(state),
    explanation: derivedExplanation,
    protocolState: { dhcp: state },
  };
}

export function engineEvidence(
  labId: string,
  configuration: Record<string, SimulationValue>,
): string[] {
  if (labId === "transport-service-desk") {
    const result = simulateTransportExchange({
      protocol: String(configuration["transport.protocol"] ?? "tcp") as
        | "tcp"
        | "udp",
      source: {
        address: "192.168.10.10",
        port: Number(configuration["transport.sourcePort"] ?? 49152),
      },
      destination: {
        address: "192.168.10.20",
        port: Number(configuration["transport.destinationPort"] ?? 443),
      },
      listeningPorts: [Number(configuration["transport.listeningPort"] ?? 443)],
      dropDataUnit: Boolean(configuration["transport.drop"]),
    });
    return result.events;
  }
  if (labId === "dhcp-lease-desk") {
    const state = {
      pool: {
        network: String(configuration["dhcp.network"] ?? "192.168.20.0"),
        prefix: Number(configuration["dhcp.prefix"] ?? 24),
        start: String(configuration["dhcp.start"] ?? "192.168.20.100"),
        end: String(configuration["dhcp.end"] ?? "192.168.20.102"),
        excluded: [String(configuration["dhcp.excluded"] ?? "")],
      },
      leases: [],
    };
    const first = allocateDhcpLease(
      state,
      String(configuration["dhcp.client"] ?? "PC1"),
    );
    const relay = relayDhcpMessage({
      clientNetwork: "192.168.20.0/24",
      relayAddress: String(configuration["dhcp.relay"] ?? ""),
      serverReachable: Boolean(configuration["dhcp.serverReachable"]),
    });
    return [
      ...first.events,
      `RELAY ${relay.forwarded ? "FORWARDED" : "STOPPED"} / ${relay.reason}`,
    ];
  }
  if (labId === "dns-resolution-desk") {
    const state = {
      records: [{
        name: String(configuration["dns.name"] ?? "server.netbite.test"),
        type: "A" as const,
        value: String(configuration["dns.value"] ?? "192.168.10.20"),
        ttl: Number(configuration["dns.ttl"] ?? 60),
        authoritativeServer: "ns.netbite.test",
      }],
      cache: [],
      resolverReachable: Boolean(configuration["dns.reachable"]),
    };
    return resolveDnsQuery(
      state,
      String(configuration["dns.name"] ?? "server.netbite.test"),
      "A",
    ).events;
  }
  if (labId === "acl-policy-desk") {
    const result = evaluateIpv4Acl({
      protocol: String(configuration["acl.protocol"] ?? "tcp") as "tcp",
      source: String(configuration["acl.source"] ?? "192.168.10.10"),
      destination: String(configuration["acl.destination"] ?? "192.168.20.20"),
      destinationPort: Number(configuration["acl.port"] ?? 443),
    }, [{
      id: "NETBITE-IN-10",
      action: String(configuration["acl.action"] ?? "deny") as
        | "permit"
        | "deny",
      protocol: "tcp",
      source: String(configuration["acl.network"] ?? "192.168.10.0"),
      sourceWildcard: String(configuration["acl.wildcard"] ?? "0.0.0.255"),
      destination: "192.168.20.20",
      destinationWildcard: "0.0.0.0",
      destinationPort: 443,
    }]);
    return [
      `MATCH ${result.matchedRuleId}`,
      `ACTION ${result.action.toUpperCase()}`,
      result.reason,
    ];
  }
  if (labId === "nat-translation-desk") {
    const result = translateNatFlow({
      insideNetworks: [{
        network: String(configuration["nat.network"] ?? "192.168.10.0"),
        prefix: Number(configuration["nat.prefix"] ?? 24),
      }],
      globalAddress: String(configuration["nat.global"] ?? "203.0.113.10"),
      nextPort: 40000,
      entries: [],
      insideUp: Boolean(configuration["nat.insideUp"]),
      outsideUp: Boolean(configuration["nat.outsideUp"]),
    }, {
      protocol: "tcp",
      source: "192.168.10.10",
      sourcePort: 49152,
      destination: "198.51.100.20",
      destinationPort: 443,
    });
    return result.events;
  }
  if (labId === "ipv6-address-desk") {
    const parsed = parseIPv6Address(
      String(configuration["ipv6.address"] ?? ""),
    );
    return parsed
      ? [`EXPANDED ${parsed.expanded}`, `COMPRESSED ${parsed.compressed}`]
      : ["INVALID IPV6 ADDRESS"];
  }
  if (labId === "ipv6-neighbor-desk") {
    const neighbor = resolveIPv6Neighbor(
      [],
      String(configuration["nd.target"] ?? ""),
      String(configuration["nd.ownerMac"] ?? "") || undefined,
    );
    const route = traceIPv6Path("2001:db8:20::20", [{
      prefix: String(configuration["nd.routePrefix"] ?? "::"),
      prefixLength: Number(configuration["nd.routeLength"] ?? 0),
      nextHop: String(configuration["nd.nextHop"] ?? ""),
      exitInterface: "G0/1",
    }]);
    return [
      `NDP ${neighbor.action.toUpperCase()}`,
      neighbor.reason,
      route.reason,
    ];
  }
  if (labId === "spanning-tree-desk") {
    const tree = calculateSpanningTree([{
      id: "SW1",
      priority: Number(configuration["stp.priorityA"] ?? 32768),
      mac: "00:00:00:00:00:0A",
    }, {
      id: "SW2",
      priority: Number(configuration["stp.priorityB"] ?? 32768),
      mac: "00:00:00:00:00:0B",
    }, {
      id: "SW3",
      priority: Number(configuration["stp.priorityC"] ?? 32768),
      mac: "00:00:00:00:00:0C",
    }], [{
      id: "AB",
      a: "SW1",
      b: "SW2",
      cost: Number(configuration["stp.costAB"] ?? 4),
      up: configuration["stp.failedLink"] !== "AB",
    }, {
      id: "BC",
      a: "SW2",
      b: "SW3",
      cost: Number(configuration["stp.costBC"] ?? 4),
      up: true,
    }, {
      id: "AC",
      a: "SW1",
      b: "SW3",
      cost: Number(configuration["stp.costAC"] ?? 8),
      up: true,
    }]);
    return [
      `ROOT ${tree.rootId ?? "NONE"}`,
      ...tree.roles.map((role) =>
        `${role.switchId} ${role.linkId} / ${role.role.toUpperCase()} / ${
          role.forwarding ? "FORWARDING" : "DISCARDING"
        }`
      ),
    ];
  }
  if (labId === "etherchannel-desk") {
    const vlans = String(configuration["lacp.vlans"] ?? "10,20").split(",").map(
      Number,
    );
    const bundle = negotiateEtherChannel([{
      id: "A1",
      side: "a",
      mode: String(configuration["lacp.modeA"] ?? "passive") as
        | "active"
        | "passive",
      up: Boolean(configuration["lacp.membersUp"]),
      speed: Number(configuration["lacp.speedA"] ?? 1000),
      switchportMode: String(
        configuration["lacp.switchportMode"] ?? "access",
      ) as "access" | "trunk",
      allowedVlans: vlans,
    }, {
      id: "B1",
      side: "b",
      mode: String(configuration["lacp.modeB"] ?? "passive") as
        | "active"
        | "passive",
      up: Boolean(configuration["lacp.membersUp"]),
      speed: Number(configuration["lacp.speedB"] ?? 1000),
      switchportMode: String(
        configuration["lacp.switchportMode"] ?? "access",
      ) as "access" | "trunk",
      allowedVlans: vlans,
    }]);
    return [
      `PORT-CHANNEL ${bundle.formed ? "FORMED" : "DOWN"}`,
      `ACTIVE ${bundle.activeMemberIds.join(", ") || "NONE"}`,
      bundle.reason,
    ];
  }
  if (labId === "route-source-desk") {
    const routes = [
      configuration["route.staticAvailable"] === false ? undefined : {
        prefix: "192.168.20.0",
        prefixLength: 24,
        source: "static" as const,
        administrativeDistance: Number(configuration["route.staticAd"] ?? 1),
        metric: 0,
        nextHop: "10.0.0.2",
      },
      {
        prefix: "192.168.20.0",
        prefixLength: Number(configuration["route.prefix"] ?? 24),
        source: "ospf" as const,
        administrativeDistance: Number(configuration["route.ospfAd"] ?? 110),
        metric: 20,
        nextHop: "10.0.0.2",
      },
      {
        prefix: "0.0.0.0",
        prefixLength: 0,
        source: "static" as const,
        administrativeDistance: 1,
        metric: 0,
      },
    ].filter(Boolean) as Parameters<typeof selectRouteSource>[1];
    const selected = selectRouteSource(
      String(configuration["route.destination"] ?? "192.168.20.20"),
      routes,
    );
    return [
      selected.reason,
      selected.selected
        ? `INSTALLED ${selected.selected.source.toUpperCase()} ${selected.selected.prefix}/${selected.selected.prefixLength}`
        : "NO ROUTE INSTALLED",
    ];
  }
  if (labId === "ospf-area-desk") {
    const topology = buildOspfTopology([{
      id: "R1",
      routerId: String(configuration["ospf.r1"] ?? "1.1.1.1"),
      advertisedPrefixes: ["192.168.10.0/24"],
    }, {
      id: "R2",
      routerId: String(configuration["ospf.r2"] ?? "2.2.2.2"),
      advertisedPrefixes: ["10.0.12.0/30"],
    }, {
      id: "R3",
      routerId: String(configuration["ospf.r3"] ?? "3.3.3.3"),
      advertisedPrefixes: configuration["ospf.advertise"]
        ? ["192.168.30.0/24"]
        : [],
    }], [{
      a: "R1",
      b: "R2",
      cost: Number(configuration["ospf.cost12"] ?? 10),
      area: Number(configuration["ospf.area12"] ?? 0),
      up: Boolean(configuration["ospf.linksUp"]),
      compatible: Number(configuration["ospf.area12"] ?? 0) === 0,
    }, {
      a: "R2",
      b: "R3",
      cost: Number(configuration["ospf.cost23"] ?? 10),
      area: Number(configuration["ospf.area23"] ?? 0),
      up: Boolean(configuration["ospf.linksUp"]) &&
        configuration["ospf.failedLink"] !== "r2-r3-down",
      compatible: Number(configuration["ospf.area23"] ?? 0) === 0,
    }]);
    return [
      ...topology.adjacencies.map((link) => `NEIGHBOR ${link.a}<->${link.b}`),
      ...calculateOspfRoutes(topology, "R1").map((route) =>
        `ROUTE ${route.prefix} COST ${route.cost} VIA ${route.nextHopRouterId}`
      ),
    ];
  }
  if (labId === "network-operations-capstone") {
    const result = validateOperationsCapstone({
      ipv4: {
        vlans: configuration["cap.vlans"] === "10,20",
        etherChannel: configuration["cap.lacp"] === "active-passive",
        spanningTree:
          normalizeDeviceReference(String(configuration["cap.stp"])) === "sw-b",
        dhcp: configuration["cap.dhcp"] === "192.168.10.101",
        dns: configuration["cap.dns"] === "192.168.20.20",
        ospf: configuration["cap.ospfForward"] === "192.168.20.0/24" &&
          configuration["cap.ospfReturn"] === "192.168.10.0/24",
        pat: configuration["cap.pat"] === "203.0.113.10",
        acl: configuration["cap.acl"] === "permit-https-deny-other",
        forward: configuration["cap.ipv4Forward"] === "pass",
        returnPath: configuration["cap.ipv4Return"] === "pass",
      },
      ipv6: {
        addressing: configuration["cap.ipv6Address"] === "2001:db8:10::10",
        routerDiscovery: configuration["cap.ndp"] === "fe80::1",
        neighborDiscovery: configuration["cap.ndp"] === "fe80::1",
        staticRoutes: configuration["cap.ipv6Forward"] === "2001:db8:20::" &&
          configuration["cap.ipv6Return"] === "2001:db8:10::",
        injectedFaultCorrected: configuration["cap.parentUp"] === "up",
        forward: configuration["cap.ipv6Forward"] === "2001:db8:20::",
        returnPath: configuration["cap.ipv6Return"] === "2001:db8:10::",
      },
    });
    return [
      ...result.failures,
      `INTEGRATED LAB ${result.complete ? "READY" : "INCOMPLETE"}`,
    ];
  }
  return ["NO SIMULATION ADAPTER"];
}

export function evaluateSimulationObjective(
  labId: string,
  stageDefinition: GuidedSimulationStage,
  session: OperationsSimulationSession,
  explanation: SimulationExplanation,
): ObjectiveResult {
  const missing = stageDefinition.fields.find((field) =>
    session.configuration[field.id] === undefined
  );
  if (missing) {
    return {
      accepted: false,
      passed: false,
      message: `Save ${missing.label.toLowerCase()} before verification.`,
      evidence: [],
      tableRows: [],
      explanation,
    };
  }
  // Transport is registered through its dedicated step-driven simulator. Keep this
  // compatibility path for archived generic sessions and framework-level tests.
  if (labId === "transport-service-desk") {
    const incorrect = stageDefinition.fields.find((field) =>
      session.configuration[field.id] !== field.expected
    );
    const evidence = engineEvidence(labId, session.configuration).map((
      line,
      index,
    ) => ({
      id: `${stageDefinition.id}-${index}`,
      text: line,
      tone: incorrect ? "warning" as const : "success" as const,
    }));
    return incorrect
      ? {
        accepted: true,
        passed: false,
        message: incorrect.incorrectFeedback,
        evidence,
        tableRows: evidence.map(({ text }) => text),
        explanation,
      }
      : {
        accepted: true,
        passed: true,
        message: "The current configuration satisfies this objective.",
        evidence,
        tableRows: evidence.map(({ text }) => text),
        explanation,
      };
  }
  if (labId === "dhcp-lease-desk") {
    return dhcpObjective(stageDefinition, session, explanation);
  }
  const evaluated = evaluateOperationsAdapterObjective(
    labId,
    stageDefinition.id,
    session,
  );
  const evidence = evaluated.events.map(({ id, detail, tone }) => ({
    id: `${stageDefinition.id}-${id}`,
    text: detail,
    tone,
  }));
  const tableRows = evaluated.tables.flatMap((
    { title, rows },
  ) => [`${title}`, ...rows]);
  return {
    accepted: true,
    passed: evaluated.passed,
    message: evaluated.message,
    evidence,
    tableRows,
    explanation: {
      ...explanation,
      ...evaluated.explanation,
      observation: evaluated.explanation?.observation ?? evidence[0]?.text ??
        explanation.observation,
    },
    protocolState: evaluated.protocolState ?? session.protocolState,
  };
}
