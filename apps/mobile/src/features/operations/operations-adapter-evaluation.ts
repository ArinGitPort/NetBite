import {
  advanceDnsTime,
  allocateDhcpLease,
  type DhcpState,
  inspectDhcpPool,
  type IPv6Neighbor,
  parseIPv6Address,
  relayDhcpMessage,
  releaseDhcpLease,
  resolveDnsQuery,
  resolveIPv6Neighbor,
  selectRouteSource,
  simulateTransportExchange,
  traceIPv6Path,
} from "@/core/network/operations-simulation";
import type { OperationsSimulationSession } from "@/features/operations/operations-simulator";

import { capstoneObjective } from "./operations-adapter-capstone";
import {
  aclEvaluation,
  dhcpState,
  dnsState,
  lacpEvaluation,
  natEvaluation,
  natState,
  ospfEvaluation,
  result,
  routeCandidates,
  stpEvaluation,
  text,
} from "./operations-adapter-helpers";
import { type OperationsObjectiveResult } from "./operations-adapter-types";

export function evaluate(
  labId: string,
  stageId: string,
  session: OperationsSimulationSession,
): OperationsObjectiveResult {
  const c = session.configuration;
  if (labId === "transport-service-desk") {
    const protocol = text(c["transport.protocol"], "tcp") as "tcp" | "udp";
    const exchange = simulateTransportExchange({
      protocol,
      source: {
        address: "192.168.10.10",
        port: Number(c["transport.sourcePort"] ?? 0),
      },
      destination: {
        address: "192.168.10.20",
        port: Number(c["transport.destinationPort"] ?? 0),
      },
      listeningPorts: c["transport.listeningPort"] === undefined
        ? []
        : [Number(c["transport.listeningPort"])],
      dropDataUnit: c["transport.drop"] === true,
    });
    const passed = stageId === "endpoint"
      ? protocol === "tcp" && Number(c["transport.sourcePort"]) === 49152 &&
        Number(c["transport.destinationPort"]) === 443 &&
        Number(c["transport.listeningPort"]) === 443
      : stageId === "handshake"
      ? c["transport.event"] === "handshake"
      : stageId === "recovery"
      ? c["transport.drop"] === true && c["transport.recovery"] === "retransmit"
      : protocol === "udp" && Number(c["transport.destinationPort"]) === 53 &&
        Number(c["transport.listeningPort"]) === 53 &&
        c["transport.udpConclusion"] === "no-confirmation";
    return result(
      passed,
      passed
        ? "The transport state satisfies the current objective."
        : "The endpoint, event order, or recovery choice still needs attention.",
      exchange.events,
    );
  }
  if (labId === "dhcp-lease-desk") {
    const saved = dhcpState(session);
    const state: DhcpState = saved ?? {
      pool: {
        network: text(c["dhcp.network"]),
        prefix: Number(c["dhcp.prefix"] ?? -1),
        start: text(c["dhcp.start"]),
        end: text(c["dhcp.end"]),
        gateway: text(c["dhcp.gateway"]),
        excluded: c["dhcp.excluded"] ? [text(c["dhcp.excluded"])] : [],
      },
      leases: [],
    };
    const rows = () => {
      const pool = inspectDhcpPool(state);
      return [
        `POOL ${state.pool.network}/${state.pool.prefix}`,
        `AVAILABLE ${pool.available.join(", ") || "NONE"}`,
        ...state.leases.map((lease) =>
          `${lease.clientId} ${lease.address} ${lease.state.toUpperCase()}`
        ),
      ];
    };
    if (stageId === "pool") {
      const pool = inspectDhcpPool(state);
      const passed = c["dhcp.network"] === "192.168.20.0" &&
        Number(c["dhcp.prefix"]) === 24 &&
        c["dhcp.start"] === "192.168.20.100" &&
        c["dhcp.end"] === "192.168.20.102" &&
        c["dhcp.excluded"] === "192.168.20.100" &&
        c["dhcp.gateway"] === "192.168.20.1" &&
        Number(c["dhcp.leaseSteps"]) === 4 &&
        pool.firstAvailable === "192.168.20.101";
      return result(
        passed,
        passed
          ? "The pool belongs to the client subnet and has a valid first offer."
          : "The pool, exclusion, gateway, or lease setting does not match the client subnet.",
        rows(),
        undefined,
        { dhcp: state },
      );
    }
    if (stageId === "dora" || stageId === "renew") {
      const client = text(
        c[stageId === "dora" ? "dhcp.client" : "dhcp.renewClient"],
      );
      const allocation = allocateDhcpLease(state, client);
      const passed = client === "PC1" &&
        allocation.state.leases.some((lease) =>
          lease.clientId === "PC1" && lease.address === "192.168.20.101"
        );
      return result(
        passed,
        allocation.explanation.observation,
        allocation.events,
        allocation.explanation,
        { dhcp: allocation.state },
      );
    }
    if (stageId === "exhaust") {
      let next = state;
      const events: string[] = [];
      for (
        const client of ["PC2", "PC3"].slice(
          0,
          Number(c["dhcp.requestCount"] ?? 0),
        )
      ) {
        const allocation = allocateDhcpLease(next, client);
        next = allocation.state;
        events.push(
          ...allocation.events.map((entry) => `${client} / ${entry}`),
        );
      }
      const exhausted = inspectDhcpPool(next).exhausted;
      return result(
        exhausted,
        exhausted
          ? "All non-excluded addresses are now bound."
          : "At least one address remains available.",
        events,
        undefined,
        { dhcp: next },
      );
    }
    if (stageId === "release") {
      const released = releaseDhcpLease(state, text(c["dhcp.releaseClient"]));
      return result(
        released.mutated,
        released.explanation.observation,
        released.events,
        released.explanation,
        { dhcp: released.state },
      );
    }
    const relay = relayDhcpMessage({
      clientNetwork: "192.168.20.0/24",
      relayAddress: text(c["dhcp.relay"]),
      serverReachable: c["dhcp.serverReachable"] === true,
    });
    return result(
      relay.forwarded,
      relay.reason,
      [
        `RELAY ${text(c["dhcp.relay"])}`,
        `SERVER PATH ${relay.forwarded ? "FORWARDED" : "STOPPED"}`,
        relay.reason,
      ],
      undefined,
      { dhcp: state },
    );
  }
  if (labId === "dns-resolution-desk") {
    const state = dnsState(c, session);
    const query = resolveDnsQuery(
      state,
      text(c["dns.name"], "server.netbite.test"),
      "A",
    );
    if (stageId === "stub") {
      return result(
        state.resolverReachable && c["dns.resolver"] === "192.168.10.53",
        state.resolverReachable
          ? "The stub resolver has a usable configured destination."
          : "The configured resolver cannot currently be reached.",
        [
          `RESOLVER ${text(c["dns.resolver"])}`,
          `PATH ${state.resolverReachable ? "REACHABLE" : "UNREACHABLE"}`,
        ],
      );
    }
    if (stageId === "hierarchy") {
      return result(
        query.accepted && query.state.cache.length === 1,
        query.explanation.observation,
        query.events,
        undefined,
        { dns: query.state },
      );
    }
    if (stageId === "cache") {
      const cacheHit = state.cache.some((entry) =>
        entry.name === text(c["dns.name"]).toLowerCase() &&
        entry.type === "A" && entry.remaining > 0
      );
      return result(
        c["dns.queryMode"] === "reuse" && cacheHit,
        "Only an identical current name-and-type query can reuse this entry.",
        [
          `CACHE KEY ${text(c["dns.name"])} / A`,
          `CACHE ${cacheHit ? "HIT" : "MISS"}`,
        ],
        undefined,
        { dns: state },
      );
    }
    const advanced = advanceDnsTime(state, Number(c["dns.advance"] ?? 0));
    const expired = advanced.cache.length > 0 &&
      advanced.cache.every((entry) => entry.remaining === 0);
    return result(
      expired,
      "Logical time must reach the saved TTL before the cached record expires.",
      [
        `TTL ${text(c["dns.ttl"])}`,
        `ADVANCED ${text(c["dns.advance"])}`,
        expired ? "CACHE EXPIRED" : "CACHE CURRENT",
      ],
      undefined,
      { dns: advanced },
    );
  }
  if (labId === "acl-policy-desk") {
    const acl = aclEvaluation(c);
    if (stageId === "tuple") {
      return result(
        c["acl.protocol"] === "tcp" && c["acl.source"] === "192.168.10.10" &&
          c["acl.destination"] === "192.168.20.20" &&
          Number(c["acl.port"]) === 443,
        "The test tuple must describe the supplied HTTPS flow.",
        [`${text(c["acl.protocol"]).toUpperCase()} ${
          text(c["acl.source"])
        } -> ${text(c["acl.destination"])}:${text(c["acl.port"])}`],
      );
    }
    if (stageId === "wildcard") {
      return result(
        c["acl.network"] === "192.168.10.0" &&
          c["acl.wildcard"] === "0.0.0.255",
        "The wildcard must select the complete supplied source subnet.",
        [`SOURCE MATCH ${text(c["acl.network"])} ${text(c["acl.wildcard"])}`],
      );
    }
    if (stageId === "match") {
      return result(
        acl.action === "permit" && acl.matchedRuleId !== "implicit-deny",
        acl.reason,
        [`MATCH ${acl.matchedRuleId}`, `ACTION ${acl.action.toUpperCase()}`],
      );
    }
    return result(
      c["acl.interface"] === "G0/0" && c["acl.direction"] === "in" &&
        acl.action === "permit",
      "The ACL must be applied where the supplied flow enters R1.",
      [
        `INTERFACE ${text(c["acl.interface"])}`,
        `DIRECTION ${text(c["acl.direction"]).toUpperCase()}`,
        `TEST ${acl.action.toUpperCase()}`,
      ],
    );
  }
  if (labId === "nat-translation-desk") {
    const initial = natState(c, session);
    const first = natEvaluation(c, session, 0, initial);
    const second = natEvaluation(c, session, 1, first.state);
    if (stageId === "roles") {
      return result(
        c["nat.insideUp"] === true && c["nat.outsideUp"] === true,
        first.explanation.observation,
        first.events,
        undefined,
        { nat: initial },
      );
    }
    if (stageId === "selection") {
      const selected = c["nat.network"] === "192.168.10.0" &&
        Number(c["nat.prefix"]) === 24;
      return result(
        first.mutated && selected,
        selected
          ? first.explanation.observation
          : "The inside selection does not match the supplied private network.",
        first.events,
        undefined,
        { nat: initial },
      );
    }
    if (stageId === "pat") {
      return result(
        first.mutated && second.mutated && Number(c["nat.flowCount"]) >= 2 &&
          c["nat.global"] === "203.0.113.10",
        "Eligible flows create distinct PAT tuples.",
        [...first.events, ...second.events],
        undefined,
        { nat: second.state },
      );
    }
    const savedNat = natState(c, session);
    return result(
      c["nat.returnCheck"] === "table" && savedNat.entries.length >= 2,
      "Return traffic must match the current global tuple.",
      [
        ...savedNat.entries.map((entry) =>
          `MATCH ${entry.globalAddress}:${entry.globalPort} -> ${entry.insideAddress}:${entry.insidePort}`
        ),
        c["nat.returnCheck"] === "table"
          ? "REVERSE MATCH CHECKED"
          : "REVERSE MATCH NOT CHECKED",
      ],
      undefined,
      { nat: savedNat },
    );
  }
  if (labId === "ipv6-address-desk") {
    const parsed = parseIPv6Address(text(c["ipv6.address"], ""));
    if (stageId === "parse") {
      return result(
        Boolean(parsed),
        parsed
          ? "The address expands to eight hexadecimal groups."
          : "The address is not valid IPv6 notation.",
        parsed ? [`EXPANDED ${parsed.expanded}`] : ["PARSE FAILED"],
      );
    }
    if (stageId === "compress") {
      const candidate = parseIPv6Address(text(c["ipv6.compressed"], ""));
      return result(
        Boolean(parsed && candidate && parsed.expanded === candidate.expanded),
        "Compressed and expanded forms must represent the same 128 bits.",
        candidate
          ? [
            `EXPANDED ${candidate.expanded}`,
            `CANONICAL ${candidate.compressed}`,
          ]
          : ["PARSE FAILED"],
      );
    }
    if (stageId === "scope") {
      return result(
        c["ipv6.scope"] === "link-local",
        "FE80::/10 identifies link-local unicast scope.",
        [`FE80::1 / ${text(c["ipv6.scope"]).toUpperCase()}`],
      );
    }
    const a = parseIPv6Address(text(c["ipv6.hostA"], ""));
    const b = parseIPv6Address(text(c["ipv6.hostB"], ""));
    return result(
      Boolean(
        a && b && a.expanded !== b.expanded &&
          Number(c["ipv6.prefix"]) === 64 &&
          a.hextets.slice(0, 4).join(":") === b.hextets.slice(0, 4).join(":"),
      ),
      "Both unique interfaces must share the supplied /64 prefix.",
      [
        `PC1 ${a?.compressed ?? "INVALID"}/64`,
        `PC2 ${b?.compressed ?? "INVALID"}/64`,
      ],
    );
  }
  if (labId === "ipv6-neighbor-desk") {
    const savedNeighbors =
      (session.protocolState?.ipv6Neighbors as IPv6Neighbor[] | undefined) ??
        [];
    const neighbor = resolveIPv6Neighbor(
      savedNeighbors,
      text(c["nd.target"], ""),
      text(c["nd.ownerMac"], "") || undefined,
    );
    const path = traceIPv6Path("2001:db8:20::20", [{
      prefix: text(c["nd.routePrefix"], "::"),
      prefixLength: Number(c["nd.routeLength"] ?? 0),
      nextHop: text(c["nd.nextHop"], ""),
      exitInterface: "G0/1",
    }]);
    if (stageId === "ns") {
      return result(
        neighbor.action === "neighbor-advertisement" ||
          neighbor.action === "cache-hit",
        neighbor.reason,
        [
          `NEIGHBOR ${neighbor.action.toUpperCase()}`,
          neighbor.mac ? `MAC ${neighbor.mac}` : "NO CACHE ENTRY",
        ],
        undefined,
        { ...session.protocolState, ipv6Neighbors: neighbor.cache },
      );
    }
    if (stageId === "ra") {
      return result(
        c["nd.ra"] === true && c["nd.router"] === "fe80::1",
        "Router information must name the local link-local next hop.",
        [
          `ROUTER ${text(c["nd.router"])}`,
          `ADVERTISEMENT ${c["nd.ra"] === true ? "RECEIVED" : "MISSING"}`,
        ],
      );
    }
    if (stageId === "route") {
      return result(
        path.reachable && c["nd.nextHop"] === "fe80::2",
        path.reason,
        [path.reason],
      );
    }
    return result(
      c["nd.forwardRoute"] === true && c["nd.returnRoute"] === true &&
        path.reachable,
      "Both the forward and return IPv6 routes must exist.",
      [
        `FORWARD ${c["nd.forwardRoute"] === true ? "READY" : "MISSING"}`,
        `RETURN ${c["nd.returnRoute"] === true ? "READY" : "MISSING"}`,
      ],
    );
  }
  if (labId === "spanning-tree-desk") {
    const tree = stpEvaluation(c);
    const rows = [
      `ROOT ${tree.rootId ?? "NONE"}`,
      ...tree.roles.map((role) =>
        `${role.switchId} ${role.linkId} / ${role.role.toUpperCase()} / ${
          role.forwarding ? "FORWARDING" : "DISCARDING"
        }`
      ),
    ];
    if (stageId === "root") {
      return result(
        c["stp.priorityA"] !== undefined && c["stp.priorityB"] !== undefined &&
          c["stp.priorityC"] !== undefined && tree.rootId === "SW2",
        "The lowest bridge ID becomes root.",
        rows,
      );
    }
    if (stageId === "ports") {
      const costsConfigured = ["stp.costAB", "stp.costBC", "stp.costAC"].every((
        key,
      ) => c[key] !== undefined);
      return result(
        costsConfigured && tree.roles.length === 6 &&
          tree.roles.some((role) => role.role === "alternate"),
        "Every non-root switch selects its lowest-cost root path from the configured link costs.",
        rows,
      );
    }
    if (stageId === "block") {
      return result(
        c["stp.redundantRole"] === "alternate" &&
          tree.roles.some((role) =>
            role.role === "alternate" && !role.forwarding
          ),
        "One inferior redundant port must discard ordinary frames.",
        rows,
      );
    }
    return result(
      c["stp.failedLink"] === "AB" &&
        tree.roles.every((role) => role.linkId !== "AB"),
      "The tree must be recalculated without the failed link.",
      rows,
    );
  }
  if (labId === "etherchannel-desk") {
    const bundle = lacpEvaluation(c);
    const rows = [
      `PORT-CHANNEL ${bundle.formed ? "FORMED" : "DOWN"}`,
      `ACTIVE ${bundle.activeMemberIds.join(", ") || "NONE"}`,
      `SUSPENDED ${bundle.suspendedMemberIds.join(", ") || "NONE"}`,
      bundle.reason,
    ];
    if (stageId === "mode") {
      return result(
        c["lacp.modeA"] === "active" || c["lacp.modeB"] === "active",
        bundle.reason,
        rows,
      );
    }
    if (stageId === "members") {
      return result(
        Number(c["lacp.speedA"]) === Number(c["lacp.speedB"]) &&
          c["lacp.switchportMode"] === "trunk",
        bundle.reason,
        rows,
      );
    }
    if (stageId === "bundle") {
      return result(
        bundle.formed && c["lacp.channel"] === "Port-channel1",
        bundle.reason,
        rows,
      );
    }
    return result(
      bundle.formed &&
        text(c["lacp.vlans"]).split(",").map(Number).includes(10) &&
        text(c["lacp.vlans"]).split(",").map(Number).includes(20),
      "The formed logical trunk must carry both required VLANs.",
      rows,
    );
  }
  if (labId === "route-source-desk") {
    const routes = routeCandidates(c);
    const selection = selectRouteSource(
      text(c["route.destination"], "0.0.0.0"),
      routes,
    );
    const rows = [
      ...selection.candidates.map((route) =>
        `MATCH ${route.source.toUpperCase()} ${route.prefix}/${route.prefixLength} AD ${route.administrativeDistance} METRIC ${route.metric}`
      ),
      selection.selected
        ? `INSTALLED ${selection.selected.source.toUpperCase()} ${selection.selected.prefix}/${selection.selected.prefixLength}`
        : "NO ROUTE INSTALLED",
    ];
    if (stageId === "sources") {
      return result(
        routes.some((route) => route.source === "connected") &&
          routes.some((route) => route.source === "static") &&
          routes.some((route) => route.source === "ospf"),
        "Load each supplied source before comparing candidates.",
        rows,
      );
    }
    if (stageId === "prefix") {
      return result(
        selection.selected?.prefixLength === 24,
        selection.reason,
        rows,
      );
    }
    if (stageId === "ad") {
      return result(
        selection.selected?.source === "static" &&
          selection.selected.administrativeDistance < Number(c["route.ospfAd"]),
        selection.reason,
        rows,
      );
    }
    return result(
      c["route.staticAvailable"] === false &&
        selection.selected?.source === "ospf",
      selection.reason,
      rows,
    );
  }
  if (labId === "ospf-area-desk") {
    const { topology, routes } = ospfEvaluation(c);
    const rows = [
      ...topology.errors,
      ...topology.adjacencies.map((link) =>
        `NEIGHBOR ${link.a} <-> ${link.b} / AREA ${link.area}`
      ),
      ...routes.map((route) =>
        `ROUTE ${route.prefix} COST ${route.cost} VIA ${route.nextHopRouterId}`
      ),
    ];
    if (stageId === "identity") {
      const routerIds = [c["ospf.r1"], c["ospf.r2"], c["ospf.r3"]];
      return result(
        topology.errors.length === 0 && new Set(routerIds).size === 3 &&
          routerIds.every((value) => value !== undefined),
        topology.errors[0] ?? "Router IDs are unique.",
        rows,
      );
    }
    if (stageId === "neighbor") {
      return result(
        topology.adjacencies.length === 2,
        "Both links must be active and compatible in area 0.",
        rows,
      );
    }
    if (stageId === "spf") {
      return result(
        routes.some((route) =>
          route.prefix === "192.168.30.0/24" && route.cost === 20
        ),
        "SPF must install the advertised R3 LAN through the two-link path.",
        rows,
      );
    }
    return result(
      c["ospf.failedLink"] === "r2-r3-down" &&
        c["ospf.response"] === "recalculate" && !routes.some((route) =>
          route.prefix === "192.168.30.0/24"
        ),
      "The failed adjacency must be removed before SPF is recalculated.",
      rows,
    );
  }
  if (labId === "network-operations-capstone") {
    return capstoneObjective(stageId, c);
  }
  return result(
    false,
    "No specialized simulation adapter is registered for this lab.",
    ["SIMULATOR ADAPTER MISSING"],
  );
}
