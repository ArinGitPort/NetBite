import {
  type DnsState,
  inspectDhcpPool,
  type IPv6Neighbor,
  type NatState,
  parseIPv6Address,
  selectRouteSource,
  traceIPv6Path,
} from "@/core/network/operations-simulation";
import type { OperationsSimulationSession } from "@/features/operations/operations-simulator";

import { capstoneReadiness } from "./operations-adapter-capstone";
import {
  aclEvaluation,
  dhcpState,
  enabled,
  lacpEvaluation,
  ospfEvaluation,
  routeCandidates,
  stpEvaluation,
  text,
} from "./operations-adapter-helpers";
import { type OperationsDeviceRecord } from "./operations-adapter-types";

export function deviceRecord(
  labId: string,
  deviceId: string,
  label: string,
  session: OperationsSimulationSession,
): OperationsDeviceRecord {
  const c = session.configuration;
  const upper = label.toUpperCase();
  let lines: string[] = [];
  if (labId === "transport-service-desk") {
    if (upper === "PC1") {
      lines = [
        `SOURCE 192.168.10.10:${text(c["transport.sourcePort"])}`,
        `PROTOCOL ${text(c["transport.protocol"]).toUpperCase()}`,
        `STATE ${
          c["transport.event"] === "handshake" ? "ESTABLISHED" : "CLOSED"
        }`,
      ];
    } else if (upper === "WEB1") {
      lines = [
        `SERVER 192.168.10.20`,
        `LISTENER ${text(c["transport.protocol"]).toUpperCase()} ${
          text(c["transport.listeningPort"])
        }`,
        `DESTINATION PORT ${text(c["transport.destinationPort"])}`,
      ];
    } else {lines = [
        "FORWARDS USING IP INFORMATION",
        "DOES NOT SELECT APPLICATION PORTS",
      ];}
  } else if (labId === "dhcp-lease-desk") {
    const state = dhcpState(session);
    const lease = state?.leases.find((item) => item.clientId === label);
    const availability = state ? inspectDhcpPool(state) : undefined;
    if (upper.includes("DHCP")) {
      lines = [
        `POOL / ${
          state
            ? `${state.pool.network}/${state.pool.prefix}`
            : "POOL NOT CONFIGURED"
        }`,
        `GATEWAY / ${state?.pool.gateway ?? text(c["dhcp.gateway"])}`,
        `LEASE STEPS / ${text(c["dhcp.leaseSteps"])}`,
        `AVAILABLE / ${availability?.available.join(", ") || "NONE"}`,
        `BINDINGS / ${state?.leases.length ?? 0}`,
      ];
    } else if (upper.includes("R1")) {
      lines = [
        `RELAY ${text(c["dhcp.relay"])}`,
        `SERVER PATH ${enabled(c["dhcp.serverReachable"])}`,
      ];
    } else if (/^PC\d+$/.test(upper)) {
      lines = [
        `CLIENT ${label}`,
        `LEASE ${lease?.address ?? "NONE"}`,
        `STATE ${lease?.state?.toUpperCase() ?? "INIT"}`,
      ];
    } else lines = ["VLAN 20", "CLIENT BROADCAST BOUNDARY"];
  } else if (labId === "dns-resolution-desk") {
    if (upper === "PC1") {
      lines = [`RESOLVER ${text(c["dns.resolver"])}`, "STUB CACHE / LOCAL"];
    } else if (upper === "DNS1") {
      const cache =
        (session.protocolState?.dns as DnsState | undefined)?.cache ?? [];
      lines = [
        `ROLE RECURSIVE RESOLVER`,
        `PATH ${enabled(c["dns.reachable"])}`,
        `CACHE ${
          cache.length
            ? cache.map((entry) =>
              `${entry.name} ${entry.type} / TTL ${entry.remaining}`
            ).join(" | ")
            : "EMPTY"
        }`,
      ];
    } else if (upper === "DNS3") {
      lines = [
        `ROLE AUTHORITATIVE SERVER`,
        "ZONE netbite.test",
        `A ${text(c["dns.name"])} -> ${text(c["dns.value"])}`,
      ];
    } else if (upper === "DNS2") {
      lines = [
        "ROLE ROOT / TLD REFERRAL",
        "POINTS DNS1 TOWARD DNS3",
        "NO HOST RECORD STORED HERE",
      ];
    } else lines = ["REFERRAL SOURCE", "NO HOST RECORD CONFIGURED HERE"];
  } else if (labId === "acl-policy-desk") {
    const acl = aclEvaluation(c);
    if (upper.includes("R1")) {
      lines = [
        `ACL NETBITE-IN / ${text(c["acl.interface"])} ${
          text(c["acl.direction"]).toUpperCase()
        }`,
        `MATCH ${acl.matchedRuleId}`,
        `ACTION ${acl.action.toUpperCase()}`,
      ];
    } else if (/^PC\d+$/.test(upper)) {
      lines = [
        `SOURCE ${text(c["acl.source"])}`,
        `${text(c["acl.protocol"]).toUpperCase()} -> ${
          text(c["acl.destination"])
        }:${text(c["acl.port"])}`,
      ];
    } else {lines = [
        "LISTENER TCP/443",
        `POLICY RESULT ${acl.action.toUpperCase()}`,
      ];}
  } else if (labId === "nat-translation-desk") {
    const translations =
      (session.protocolState?.nat as NatState | undefined)?.entries ?? [];
    if (upper.includes("R1")) {
      lines = [
        `INSIDE ${enabled(c["nat.insideUp"])}`,
        `OUTSIDE ${enabled(c["nat.outsideUp"])}`,
        `GLOBAL ${text(c["nat.global"])}`,
        `TRANSLATIONS ${translations.length}`,
        ...translations.map((entry) =>
          `${entry.insideAddress}:${entry.insidePort} -> ${entry.globalAddress}:${entry.globalPort}`
        ),
      ];
    } else if (/^PC\d+$/.test(upper)) {
      lines = [
        "INSIDE LOCAL 192.168.10.10:49152",
        `ELIGIBLE NETWORK ${text(c["nat.network"])}/${text(c["nat.prefix"])}`,
      ];
    } else {lines = [
        "OUTSIDE SERVICE 198.51.100.20:443",
        `REPLY TARGET ${text(c["nat.global"])}:40000`,
      ];}
  } else if (labId === "ipv6-address-desk") {
    const address = upper.includes("PC1")
      ? c["ipv6.hostA"] ?? c["ipv6.address"]
      : c["ipv6.hostB"];
    const parsed = parseIPv6Address(text(address, ""));
    lines = upper === "SW1"
      ? ["LOCAL ETHERNET LINK", "NO IPV6 ADDRESS REQUIRED"]
      : [
        `ADDRESS ${parsed?.compressed ?? text(address)}`,
        `PREFIX /${text(c["ipv6.prefix"])}`,
        `EXPANDED ${parsed?.expanded ?? "NOT AVAILABLE"}`,
      ];
  } else if (labId === "ipv6-neighbor-desk") {
    const path = traceIPv6Path("2001:db8:20::20", [{
      prefix: text(c["nd.routePrefix"], "::"),
      prefixLength: Number(c["nd.routeLength"] ?? 0),
      nextHop: text(c["nd.nextHop"], ""),
      exitInterface: "G0/1",
    }]);
    if (upper.includes("PC1")) {
      const neighbors =
        (session.protocolState?.ipv6Neighbors as IPv6Neighbor[] | undefined) ??
          [];
      lines = [
        `DEFAULT ROUTER ${text(c["nd.router"])}`,
        `NEIGHBOR CACHE ${
          neighbors.length
            ? neighbors.map((entry) => `${entry.address} -> ${entry.mac}`).join(
              " | ",
            )
            : "EMPTY"
        }`,
      ];
    } else if (upper.includes("R1")) {
      lines = [
        `RA ${c["nd.ra"] === true ? "SENT" : "NOT SENT"}`,
        `ROUTE ${text(c["nd.routePrefix"])}/${text(c["nd.routeLength"])}`,
      ];
    } else {lines = [
        path.reason,
        `RETURN ${c["nd.returnRoute"] === true ? "READY" : "MISSING"}`,
      ];}
  } else if (labId === "spanning-tree-desk") {
    const tree = stpEvaluation(c);
    lines = [
      `ROOT ${tree.rootId ?? "UNKNOWN"}`,
      `PRIORITY ${text(c[`stp.priority${upper.at(-1)}`])}`,
      ...tree.roles.filter((role) => role.switchId === upper).map((role) =>
        `${role.linkId} ${role.role.toUpperCase()} / ${
          role.forwarding ? "FORWARDING" : "DISCARDING"
        }`
      ),
    ];
  } else if (labId === "etherchannel-desk") {
    const bundle = lacpEvaluation(c);
    lines = [
      `MODE ${
        upper.includes("SW1") ? text(c["lacp.modeA"]) : text(c["lacp.modeB"])
      }`,
      `PORT-CHANNEL ${bundle.formed ? "UP" : "DOWN"}`,
      `MEMBERS ${bundle.activeMemberIds.join(", ") || "NONE"}`,
      `VLANS ${text(c["lacp.vlans"])}`,
    ];
  } else if (labId === "route-source-desk") {
    const selected = selectRouteSource(
      text(c["route.destination"], "0.0.0.0"),
      routeCandidates(c),
    );
    lines = upper.includes("R1")
      ? [
        ...selected.candidates.map((route) =>
          `${route.source.toUpperCase()} ${route.prefix}/${route.prefixLength} AD ${route.administrativeDistance}`
        ),
        `INSTALLED ${
          selected.selected
            ? `${selected.selected.source.toUpperCase()} ${selected.selected.prefix}/${selected.selected.prefixLength}`
            : "NONE"
        }`,
      ]
      : [`DESTINATION ${text(c["route.destination"])}`, selected.reason];
  } else if (labId === "ospf-area-desk") {
    const ospf = ospfEvaluation(c);
    const routerKey = upper.replace("-", "").toLowerCase();
    lines = [
      `ROUTER ID ${text(c[`ospf.${routerKey}`])}`,
      ...ospf.topology.adjacencies.filter((link) =>
        link.a === label || link.b === label
      ).map((link) =>
        `NEIGHBOR ${link.a === label ? link.b : link.a} / AREA ${link.area}`
      ),
      ...ospf.routes.filter((route) => upper === "R1").map((route) =>
        `${route.prefix} COST ${route.cost} VIA ${route.nextHopRouterId}`
      ),
    ];
  } else if (labId === "network-operations-capstone") {
    const ready = capstoneReadiness(c);
    if (upper === "PC1") {
      lines = [
        `LEASE ${text(c["cap.dhcp"])}`,
        `DNS RESULT ${text(c["cap.dns"])}`,
        `IPV4 TEST ${
          ready.servicesReady && ready.routesReady && ready.edgeReady
            ? "READY"
            : "BLOCKED"
        }`,
      ];
    } else if (upper === "SW1" || upper === "SW2") {
      lines = [
        `VLANS ${text(c["cap.vlans"])}`,
        `LACP ${ready.lacpReady ? "FORMED" : "INCOMPLETE"}`,
        `SPANNING TREE ROOT ${text(c["cap.stp"])}`,
      ];
    } else if (upper === "R1") {
      lines = [
        `OSPF FORWARD ${text(c["cap.ospfForward"])}`,
        `OSPF RETURN ${text(c["cap.ospfReturn"])}`,
        `ACL ${text(c["cap.acl"])}`,
        `PAT ${text(c["cap.pat"])}`,
      ];
    } else if (upper === "DHCP1") {
      lines = [
        `FIRST LEASE ${text(c["cap.dhcp"])}`,
        `SERVICE ${ready.servicesReady ? "READY" : "INCOMPLETE"}`,
      ];
    } else if (upper === "DNS1") {
      lines = ["A RECORD server.netbite.test", `VALUE ${text(c["cap.dns"])}`];
    } else if (upper === "WEB1") {
      lines = [
        "LISTENER TCP 443",
        `REQUIRED FLOW ${
          ready.edgeReady && ready.routesReady ? "PERMITTED" : "BLOCKED"
        }`,
      ];
    } else if (upper === "R2") {
      lines = [
        `FORWARD PREFIX ${text(c["cap.ipv6Forward"])}/64`,
        `RETURN PREFIX ${text(c["cap.ipv6Return"])}/64`,
        `PARENT ${ready.parentReady ? "UP" : "DOWN"}`,
      ];
    } else {lines = [
        `ADDRESS ${text(c["cap.ipv6Address"])}/64`,
        `ROUTER ${text(c["cap.ndp"])}`,
        `IPV6 TEST ${
          ready.ipv6Address && ready.neighborReady && ready.ipv6RoutesReady &&
            ready.parentReady
            ? "READY"
            : "BLOCKED"
        }`,
      ];}
  }
  if (!lines.length) lines = ["NO CURRENT INFORMATION FOR THIS DEVICE"];
  return {
    id: `${labId}:${deviceId}`,
    title: label,
    lines,
    status:
      lines.some((line) =>
          /NOT |NONE|MISSING|INCOMPLETE|DOWN|FAILED/.test(line)
        )
        ? "attention"
        : "ready",
  };
}
