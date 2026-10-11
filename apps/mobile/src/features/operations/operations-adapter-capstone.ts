import {
  allocateDhcpLease,
  calculateSpanningTree,
  evaluateIpv4Acl,
  negotiateEtherChannel,
  parseIPv6Address,
  resolveDnsQuery,
  resolveIPv6Neighbor,
  selectRouteSource,
  traceIPv6Path,
  translateNatFlow,
  validateOperationsCapstone,
} from "@/core/network/operations-simulation";

import { type Configuration, result, text } from "./operations-adapter-helpers";

export function capstoneReadiness(c: Configuration) {
  const spanningTree = calculateSpanningTree([
    { id: "SW1", priority: 32768, mac: "00:00:00:00:00:0A" },
    {
      id: "SW2",
      priority: c["cap.stp"] === "SW2" ? 24576 : 32768,
      mac: "00:00:00:00:00:0B",
    },
    { id: "SW3", priority: 32768, mac: "00:00:00:00:00:0C" },
  ], [{ id: "AB", a: "SW1", b: "SW2", cost: 4, up: true }, {
    id: "BC",
    a: "SW2",
    b: "SW3",
    cost: 4,
    up: true,
  }, { id: "AC", a: "SW1", b: "SW3", cost: 8, up: true }]);
  const vlans = text(c["cap.vlans"], "").split(",").filter(Boolean).map(Number);
  const lacpModes = c["cap.lacp"] === "active-passive"
    ? ["active", "passive"] as const
    : ["passive", "passive"] as const;
  const channel = negotiateEtherChannel([
    {
      id: "A1",
      side: "a",
      mode: lacpModes[0],
      up: true,
      speed: 1000,
      switchportMode: "trunk",
      allowedVlans: vlans,
    },
    {
      id: "B1",
      side: "b",
      mode: lacpModes[1],
      up: true,
      speed: 1000,
      switchportMode: "trunk",
      allowedVlans: vlans,
    },
  ]);
  const stpReady = spanningTree.rootId === "SW2" &&
    spanningTree.roles.some((role) => role.role === "alternate");
  const lacpReady = channel.formed && vlans.includes(10) && vlans.includes(20);

  const lease = allocateDhcpLease({
    pool: {
      network: "192.168.10.0",
      prefix: 24,
      start: "192.168.10.100",
      end: "192.168.10.110",
      excluded: ["192.168.10.100"],
      gateway: "192.168.10.1",
    },
    leases: [],
  }, "OFFICE-PC");
  const dns = resolveDnsQuery(
    {
      records: [{
        name: "server.netbite.test",
        type: "A",
        value: text(c["cap.dns"], ""),
        ttl: 60,
        authoritativeServer: "DNS1",
      }],
      cache: [],
      resolverReachable: true,
    },
    "server.netbite.test",
    "A",
  );
  const servicesReady = lease.state.leases[0]?.address === c["cap.dhcp"] &&
    dns.state.cache[0]?.value === "192.168.20.20";

  const forwardSelection = selectRouteSource("192.168.20.20", [{
    prefix: text(c["cap.ospfForward"], "0.0.0.0").replace(/\/\d+$/, ""),
    prefixLength: Number(text(c["cap.ospfForward"], "").split("/")[1] ?? 0),
    source: "ospf",
    administrativeDistance: 110,
    metric: 20,
    nextHop: "10.0.12.2",
  }]);
  const returnSelection = selectRouteSource("192.168.10.10", [{
    prefix: text(c["cap.ospfReturn"], "0.0.0.0").replace(/\/\d+$/, ""),
    prefixLength: Number(text(c["cap.ospfReturn"], "").split("/")[1] ?? 0),
    source: "ospf",
    administrativeDistance: 110,
    metric: 20,
    nextHop: "10.0.12.1",
  }]);
  const routesReady = forwardSelection.selected?.prefixLength === 24 &&
    returnSelection.selected?.prefixLength === 24;

  const acl = evaluateIpv4Acl(
    {
      protocol: "tcp",
      source: "192.168.10.101",
      destination: "192.168.20.20",
      destinationPort: 443,
    },
    c["cap.acl"] === "permit-https-deny-other"
      ? [{
        id: "PERMIT-HTTPS",
        action: "permit",
        protocol: "tcp",
        source: "192.168.10.0",
        sourceWildcard: "0.0.0.255",
        destination: "192.168.20.20",
        destinationWildcard: "0.0.0.0",
        destinationPort: 443,
      }]
      : [],
  );
  const translated = translateNatFlow({
    insideNetworks: [{ network: "192.168.10.0", prefix: 24 }],
    globalAddress: text(c["cap.pat"], "0.0.0.0"),
    nextPort: 40000,
    entries: [],
    insideUp: true,
    outsideUp: true,
  }, {
    protocol: "tcp",
    source: "192.168.10.101",
    sourcePort: 49152,
    destination: "198.51.100.20",
    destinationPort: 443,
  });
  const edgeReady = acl.action === "permit" && translated.mutated &&
    translated.state.entries[0]?.globalAddress === "203.0.113.10";
  const ipv6Address = parseIPv6Address(text(c["cap.ipv6Address"], ""));
  const neighbor = resolveIPv6Neighbor(
    [],
    text(c["cap.ndp"], ""),
    c["cap.ndp"] === "fe80::1" ? "02:00:00:00:00:01" : undefined,
  );
  const forwardV6 = traceIPv6Path("2001:db8:20::20", [{
    prefix: text(c["cap.ipv6Forward"], "::"),
    prefixLength: 64,
    nextHop: "fe80::2",
    exitInterface: "G0/1",
  }]);
  const returnV6 = traceIPv6Path("2001:db8:10::10", [{
    prefix: text(c["cap.ipv6Return"], "::"),
    prefixLength: 64,
    nextHop: "fe80::1",
    exitInterface: "G0/0",
  }]);
  const neighborReady = neighbor.action === "neighbor-advertisement";
  const ipv6RoutesReady = forwardV6.reachable && returnV6.reachable;
  const parentReady = c["cap.parentUp"] === "up";
  return {
    stpReady,
    lacpReady,
    servicesReady,
    routesReady,
    edgeReady,
    ipv6Address: Boolean(ipv6Address),
    neighborReady,
    ipv6RoutesReady,
    parentReady,
  };
}

export function capstoneObjective(stageId: string, c: Configuration) {
  const ready = capstoneReadiness(c);
  const ipv4Forward = ready.stpReady && ready.lacpReady &&
    ready.servicesReady && ready.routesReady && ready.edgeReady;
  const ipv6Forward = ready.ipv6Address && ready.neighborReady &&
    ready.ipv6RoutesReady && ready.parentReady;
  const validation = validateOperationsCapstone({
    ipv4: {
      vlans: ready.lacpReady,
      etherChannel: ready.lacpReady,
      spanningTree: ready.stpReady,
      dhcp: ready.servicesReady,
      dns: ready.servicesReady,
      ospf: ready.routesReady,
      pat: ready.edgeReady,
      acl: ready.edgeReady,
      forward: ipv4Forward,
      returnPath: ipv4Forward,
    },
    ipv6: {
      addressing: ready.ipv6Address,
      routerDiscovery: ready.neighborReady,
      neighborDiscovery: ready.neighborReady,
      staticRoutes: ready.ipv6RoutesReady,
      injectedFaultCorrected: ready.parentReady,
      forward: ipv6Forward,
      returnPath: ipv6Forward,
    },
  });
  const stageReady: Record<string, boolean> = {
    "office-l2": ready.stpReady && ready.lacpReady,
    "office-services": ready.servicesReady,
    "office-routing": ready.routesReady,
    "office-edge": ready.edgeReady,
    "office-verify": ipv4Forward,
    "branch-local": ready.ipv6Address && ready.neighborReady,
    "branch-route": ready.ipv6RoutesReady,
    "branch-fault": validation.complete,
  };
  const rows = [
    `L2 ${ready.stpReady && ready.lacpReady ? "READY" : "INCOMPLETE"}`,
    `SERVICES ${ready.servicesReady ? "READY" : "INCOMPLETE"}`,
    `IPV4 ROUTING ${ready.routesReady ? "READY" : "INCOMPLETE"}`,
    `EDGE POLICY / PAT ${ready.edgeReady ? "READY" : "INCOMPLETE"}`,
    `IPV6 LOCAL ${
      ready.ipv6Address && ready.neighborReady ? "READY" : "INCOMPLETE"
    }`,
    `IPV6 ROUTES ${ready.ipv6RoutesReady ? "READY" : "INCOMPLETE"}`,
    `INTEGRATED LAB ${validation.complete ? "COMPLETE" : "INCOMPLETE"}`,
    ...validation.failures,
  ];
  return result(
    Boolean(stageReady[stageId]),
    stageReady[stageId]
      ? "The current combined network state satisfies this phase."
      : "A required dependency in the combined network is still incomplete.",
    rows,
  );
}
