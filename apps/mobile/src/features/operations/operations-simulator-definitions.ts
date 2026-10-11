import type { ModuleReleaseState } from "@/content/types";

import {
  type GuidedSimulationDefinition,
  type GuidedSimulationStage,
  type SimulationFieldDefinition,
  type SimulationFieldOption,
  type SimulationValue,
} from "./operations-simulator-types";

export const select = (
  id: string,
  label: string,
  expected: SimulationValue,
  values: SimulationFieldOption[],
  incorrectFeedback: string,
): SimulationFieldDefinition => ({
  id,
  label,
  kind: "select",
  expected,
  options: values,
  incorrectFeedback,
});
export const text = (
  id: string,
  label: string,
  expected: string,
  format: SimulationFieldDefinition["format"],
  incorrectFeedback: string,
  placeholder?: string,
): SimulationFieldDefinition => ({
  id,
  label,
  kind: "text",
  expected,
  format,
  incorrectFeedback,
  placeholder,
});
export const number = (
  id: string,
  label: string,
  expected: number,
  format: SimulationFieldDefinition["format"],
  incorrectFeedback: string,
): SimulationFieldDefinition => ({
  id,
  label,
  kind: "number",
  expected,
  format,
  incorrectFeedback,
});
export const toggle = (
  id: string,
  expected: boolean,
  incorrectFeedback: string,
  command?: string,
): SimulationFieldDefinition => ({
  id,
  label: id.split(".").at(-1)?.replace(/([A-Z])/g, " $1").toUpperCase() ?? id,
  kind: "toggle",
  expected,
  incorrectFeedback,
  options: command
    ? [{ label: expected ? "ENABLE" : "DISABLE", value: expected, command }]
    : undefined,
});
export const option = (
  label: string,
  value: SimulationValue,
  command?: string,
): SimulationFieldOption => ({ label, value, command });
export const stage = (
  id: string,
  actionLabel: string,
  fields: SimulationFieldDefinition[],
  hints: string[],
  providedFacts?: string[],
): GuidedSimulationStage => ({
  id,
  actionLabel,
  fields,
  hints,
  providedFacts: providedFacts ?? [],
});

export const definitions: GuidedSimulationDefinition[] = [
  {
    labId: "transport-service-desk",
    releaseState: "released",
    cliEnabled: false,
    stages: [
      stage("endpoint", "Save endpoint configuration", [
        select("transport.protocol", "Transport protocol", "tcp", [
          option("TCP", "tcp"),
          option("UDP", "udp"),
        ], "HTTPS in this exercise listens with TCP."),
        number(
          "transport.sourcePort",
          "Client source port",
          49152,
          "port",
          "Use a valid ephemeral client port.",
        ),
        number(
          "transport.destinationPort",
          "Server destination port",
          443,
          "port",
          "The destination port must identify the HTTPS service.",
        ),
        number(
          "transport.listeningPort",
          "Server listening port",
          443,
          "port",
          "The server must listen on the same destination port.",
        ),
      ], [
        "A socket endpoint combines an IP address, transport protocol, and port.",
        "In this practice, HTTPS uses TCP destination port 443; the client may use ephemeral port 49152.",
      ]),
      stage("handshake", "Initiate TCP handshake", [
        select(
          "transport.event",
          "Next transport event",
          "handshake",
          [
            option("Send SYN / SYN-ACK / ACK", "handshake"),
            option("Send application data immediately", "data-first"),
          ],
          "TCP must establish connection state before sending application data.",
        ),
      ], [
        "The client begins by synchronizing sequence state.",
        "The guided exchange is SYN, SYN-ACK, then ACK.",
      ]),
      stage("recovery", "Recover missing data", [
        toggle(
          "transport.drop",
          true,
          "Inject the missing segment before testing TCP recovery.",
        ),
        select(
          "transport.recovery",
          "Recovery action",
          "retransmit",
          [
            option("Retransmit unacknowledged data", "retransmit"),
            option("Open another server port", "new-port"),
          ],
          "A missing TCP segment is recovered from acknowledgment state, not by changing the service port.",
        ),
      ], [
        "Inspect which data remains unacknowledged.",
        "Retransmit the unacknowledged segment and then observe its ACK.",
      ]),
      stage("udp", "Send UDP datagram", [
        select("transport.protocol", "Transport protocol", "udp", [
          option("UDP", "udp"),
          option("TCP", "tcp"),
        ], "The final comparison must use UDP."),
        number(
          "transport.destinationPort",
          "DNS-style destination port",
          53,
          "port",
          "This comparison uses destination port 53.",
        ),
        number(
          "transport.listeningPort",
          "Server listening port",
          53,
          "port",
          "The UDP service must listen on the selected destination port.",
        ),
        select(
          "transport.udpConclusion",
          "No-reply conclusion",
          "no-confirmation",
          [
            option("No transport delivery confirmation", "no-confirmation"),
            option("The server is definitely offline", "offline"),
          ],
          "No UDP reply does not prove one universal failure cause.",
        ),
      ], [
        "UDP has no TCP handshake or acknowledgment state.",
        "Conclude only that this datagram has no transport-layer delivery confirmation.",
      ]),
    ],
  },
  {
    labId: "dhcp-lease-desk",
    releaseState: "released",
    cliEnabled: false,
    stages: [
      stage("pool", "Save DHCP pool", [
        {
          ...text(
            "dhcp.network",
            "Pool network",
            "192.168.20.0",
            "ipv4",
            "Use the client network ID shown in the task.",
            "EXAMPLE / 10.10.10.0",
          ),
          helpText:
            "The pool must match the client subnet, not the DHCP server subnet.",
        },
        {
          ...number(
            "dhcp.prefix",
            "Prefix length",
            24,
            "prefix4",
            "Use the client subnet prefix.",
          ),
          placeholder: "EXAMPLE / /26",
          helpText:
            "Enter the prefix supplied for the client subnet. The slash is optional.",
        },
        {
          ...text(
            "dhcp.start",
            "First pool address",
            "192.168.20.100",
            "ipv4",
            "Use the first address in the supplied pool range.",
            "EXAMPLE / 10.10.10.100",
          ),
          helpText: "This is the first address DHCP1 is allowed to manage.",
        },
        {
          ...text(
            "dhcp.end",
            "Last pool address",
            "192.168.20.102",
            "ipv4",
            "Use the last address in the supplied pool range.",
            "EXAMPLE / 10.10.10.120",
          ),
          helpText: "This is the final address DHCP1 is allowed to manage.",
        },
        {
          ...text(
            "dhcp.excluded",
            "Reserved address to exclude",
            "192.168.20.100",
            "ipv4",
            "Exclude the address identified as reserved.",
            "EXAMPLE / 10.10.10.100",
          ),
          helpText:
            "An exclusion remains inside the pool but cannot be leased.",
        },
        {
          ...text(
            "dhcp.gateway",
            "Default gateway option",
            "192.168.20.1",
            "ipv4",
            "Supply the client VLAN gateway.",
            "EXAMPLE / 10.10.10.1",
          ),
          helpText:
            "DHCP gives clients the gateway inside their own subnet. Use the gateway supplied above.",
        },
        {
          ...number(
            "dhcp.leaseSteps",
            "Practice lease duration",
            4,
            "positive",
            "Use four learner-controlled steps for this exercise.",
          ),
          placeholder: "EXAMPLE / 8",
          helpText:
            "NetBite uses learner-controlled steps instead of real clock time. Use the duration supplied above.",
        },
      ], [
        "The pool network must match the subnet where the clients live.",
        "With 192.168.20.100 excluded, the first offer is 192.168.20.101.",
      ], [
        "PC1 and PC2 are clients in subnet 192.168.20.0/24.",
        "The /24 means the prefix length is 24. In the Prefix field, enter 24 (with or without the slash).",
        "DHCP1 may lease only 192.168.20.100 through 192.168.20.102 for this task.",
        "192.168.20.100 is reserved, so add it as the excluded address.",
        "Clients use 192.168.20.1 as their default gateway.",
        "The exercise represents the lease duration as four learner-controlled steps.",
      ]),
      stage("dora", "Request client lease", [
        text(
          "dhcp.client",
          "Client identifier",
          "PC1",
          "text",
          "Use the fixed client PC1 so its binding can be inspected.",
        ),
      ], [
        "The client starts without an IPv4 lease.",
        "Run Discover, Offer, Request, and ACK for PC1.",
      ]),
      stage("renew", "Renew client lease", [
        text(
          "dhcp.renewClient",
          "Client to renew",
          "PC1",
          "text",
          "Renew the existing PC1 binding.",
        ),
      ], [
        "A known client can request its current address again.",
        "Renew PC1 and inspect the refreshed binding rather than allocating another address.",
      ]),
      stage("exhaust", "Request until exhausted", [
        number(
          "dhcp.requestCount",
          "Additional client requests",
          2,
          "positive",
          "Two more requests demonstrate one final binding followed by exhaustion.",
        ),
      ], [
        "Only two usable pool addresses remain after the exclusion.",
        "PC1 uses one; another client uses the second; the following request receives no offer.",
      ]),
      stage("release", "Release one binding", [
        text(
          "dhcp.releaseClient",
          "Client to release",
          "PC2",
          "text",
          "Release PC2 so its address returns to the pool.",
        ),
      ], [
        "A released binding no longer reserves its address.",
        "Release PC2 and verify that 192.168.20.102 becomes available again.",
      ]),
      stage("relay", "Verify DHCP relay", [
        text(
          "dhcp.relay",
          "Relay interface address",
          "192.168.20.1",
          "ipv4",
          "The relay must identify the remote client subnet gateway.",
        ),
        toggle(
          "dhcp.serverReachable",
          true,
          "A relay cannot reach an unavailable DHCP server.",
        ),
      ], [
        "A router does not forward the original client broadcast unchanged.",
        "Configure 192.168.20.1 as relay context and verify a routed server path.",
      ]),
    ],
  },
  {
    labId: "dns-resolution-desk",
    releaseState: "released",
    cliEnabled: false,
    stages: [
      stage("stub", "Save resolver settings", [
        text(
          "dns.resolver",
          "Configured resolver",
          "192.168.10.53",
          "ipv4",
          "The client must send its stub query to the configured resolver.",
        ),
        toggle(
          "dns.reachable",
          true,
          "The resolver path must be reachable before DNS records can be checked.",
        ),
      ], [
        "The application asks its local stub resolver.",
        "The stub sends the query to 192.168.10.53 rather than walking the hierarchy itself.",
      ]),
      stage("hierarchy", "Resolve authoritative answer", [
        text(
          "dns.name",
          "Record name",
          "server.netbite.test",
          "text",
          "The query name must match the authoritative record.",
        ),
        text(
          "dns.value",
          "A record value",
          "192.168.10.20",
          "ipv4",
          "The A record must contain the server IPv4 address.",
        ),
        number(
          "dns.ttl",
          "TTL steps",
          60,
          "positive",
          "Use a positive TTL so the answer can enter cache.",
        ),
      ], [
        "A cache miss moves from recursive resolver toward authority.",
        "Create server.netbite.test A 192.168.10.20 with TTL 60, then query it.",
      ]),
      stage("cache", "Query cached record", [
        select("dns.queryMode", "Query mode", "reuse", [
          option("Repeat same A query", "reuse"),
          option("Ask for unrelated name", "other"),
        ], "Only the same name and type can reuse this cache entry."),
      ], [
        "Cache keys include the name and record type.",
        "Repeat the same A query before the TTL reaches zero.",
      ]),
      stage("expiry", "Advance logical time", [
        number(
          "dns.advance",
          "Logical steps",
          60,
          "positive",
          "Advance through the record TTL to expire it.",
        ),
      ], [
        "TTL limits reuse; it is not a permanent record lifetime.",
        "Advance 60 learner-controlled steps, then resolve again from authority.",
      ]),
    ],
  },
  {
    labId: "acl-policy-desk",
    releaseState: "released",
    cliEnabled: true,
    stages: [
      stage("tuple", "Save test flow", [
        select("acl.protocol", "Protocol", "tcp", [
          option("TCP", "tcp", "test-flow tcp"),
          option("UDP", "udp", "test-flow udp"),
        ], "The required service uses TCP."),
        text(
          "acl.source",
          "Source IPv4",
          "192.168.10.10",
          "ipv4",
          "Use the authorized source host.",
        ),
        text(
          "acl.destination",
          "Destination IPv4",
          "192.168.20.20",
          "ipv4",
          "Use the protected server address.",
        ),
        number(
          "acl.port",
          "Destination port",
          443,
          "port",
          "The required HTTPS service uses port 443.",
        ),
      ], [
        "An extended rule can inspect protocol, source, destination, and service port.",
        "Build TCP 192.168.10.10 to 192.168.20.20 destination port 443.",
      ]),
      stage("wildcard", "Save source wildcard", [
        text(
          "acl.network",
          "Source network",
          "192.168.10.0",
          "ipv4",
          "Use the complete /24 network address.",
        ),
        text(
          "acl.wildcard",
          "Source wildcard",
          "0.0.0.255",
          "ipv4",
          "The final octet may vary for this /24 match.",
        ),
      ], [
        "Wildcard zero bits must match; one bits may vary.",
        "192.168.10.0 with 0.0.0.255 selects the full /24.",
      ]),
      stage("match", "Install and test ACL", [
        select("acl.action", "Rule action", "permit", [
          option(
            "Permit",
            "permit",
            "permit tcp 192.168.10.0 0.0.0.255 host 192.168.20.20 eq 443",
          ),
          option(
            "Deny",
            "deny",
            "deny tcp 192.168.10.0 0.0.0.255 host 192.168.20.20 eq 443",
          ),
        ], "The required HTTPS flow must be explicitly permitted."),
        number(
          "acl.sequence",
          "Rule sequence",
          10,
          "positive",
          "Place the specific permit before the implicit deny.",
        ),
      ], [
        "ACL evaluation stops at the first matching entry.",
        "Install the specific HTTPS permit as sequence 10, then test the flow.",
      ]),
      stage("direction", "Apply and verify ACL", [
        text(
          "acl.interface",
          "Interface",
          "G0/0",
          "text",
          "Apply the policy where the source traffic enters.",
        ),
        select("acl.direction", "Direction", "in", [
          option("Inbound", "in", "ip access-group NETBITE-IN in"),
          option("Outbound", "out", "ip access-group NETBITE-IN out"),
        ], "Direction is relative to the selected router interface."),
      ], [
        "The source traffic enters G0/0.",
        "Apply NETBITE-IN inbound on G0/0, then test permitted and denied flows.",
      ]),
    ],
  },
  {
    labId: "nat-translation-desk",
    releaseState: "released",
    cliEnabled: true,
    stages: [
      stage("roles", "Save NAT interface roles", [
        toggle(
          "nat.insideUp",
          true,
          "The inside interface must be active.",
          "ip nat inside",
        ),
        toggle(
          "nat.outsideUp",
          true,
          "The outside interface must be active.",
          "ip nat outside",
        ),
      ], [
        "Translation needs a defined inside-to-outside boundary.",
        "Mark and enable both boundary interfaces.",
      ]),
      stage("selection", "Save inside selection", [
        text(
          "nat.network",
          "Inside network",
          "192.168.10.0",
          "ipv4",
          "Select the intended inside /24.",
        ),
        number(
          "nat.prefix",
          "Prefix",
          24,
          "prefix4",
          "The exercise uses 192.168.10.0/24.",
        ),
      ], [
        "PAT applies only to traffic selected by its rule.",
        "Select the full 192.168.10.0/24 inside network.",
      ]),
      stage("pat", "Generate translated flows", [
        text(
          "nat.global",
          "Global IPv4 address",
          "203.0.113.10",
          "ipv4",
          "Use the documented public example address.",
        ),
        number(
          "nat.flowCount",
          "Simultaneous flows",
          2,
          "positive",
          "Generate two flows to see distinct translated source ports.",
        ),
      ], [
        "PAT shares one global IPv4 address by allocating distinct transport ports.",
        "Generate two eligible inside flows through 203.0.113.10.",
      ]),
      stage("return", "Verify reverse translation", [
        select(
          "nat.returnCheck",
          "Return tuple check",
          "table",
          [
            option(
              "Use translation table",
              "table",
              "show ip nat translations",
            ),
            option("Send directly to private address", "private"),
          ],
          "The outside reply targets the global tuple and must be reversed through current translation state.",
        ),
      ], [
        "The outside host does not address the private endpoint directly.",
        "Match the reply against the created global address and port entry.",
      ]),
    ],
  },
  {
    labId: "ipv6-address-desk",
    releaseState: "released",
    cliEnabled: false,
    stages: [
      stage("parse", "Parse IPv6 address", [
        text(
          "ipv6.address",
          "IPv6 address",
          "2001:db8:10::10",
          "ipv6",
          "Enter one valid address with at most one double colon.",
        ),
      ], [
        "IPv6 contains eight 16-bit hexadecimal groups.",
        "Expand 2001:db8:10::10 by inserting zero groups until there are eight.",
      ]),
      stage("compress", "Verify canonical form", [
        text(
          "ipv6.compressed",
          "Compressed form",
          "2001:db8:10::10",
          "ipv6",
          "Compress the longest zero run once and remove leading group zeroes.",
        ),
      ], [
        "Compression changes notation, not the 128-bit value.",
        "Use one :: for the longest run of consecutive zero groups.",
      ]),
      stage("scope", "Classify address scope", [
        select("ipv6.scope", "FE80::1 scope", "link-local", [
          option("Link-local", "link-local"),
          option("Global unicast", "global"),
          option("Multicast", "multicast"),
        ], "FE80::/10 is link-local unicast scope."),
      ], [
        "Scope determines where an address is meaningful.",
        "FE80::1 is valid only on its attached link.",
      ]),
      stage("prefix", "Save interface addresses", [
        text(
          "ipv6.hostA",
          "PC1 address",
          "2001:db8:10::10",
          "ipv6",
          "PC1 must use the shared prefix.",
        ),
        text(
          "ipv6.hostB",
          "PC2 address",
          "2001:db8:10::20",
          "ipv6",
          "PC2 must use the shared prefix.",
        ),
        number(
          "ipv6.prefix",
          "Prefix",
          64,
          "prefix6",
          "Use the standard /64 exercise boundary.",
        ),
      ], [
        "Both hosts must share the first 64 prefix bits.",
        "Configure 2001:db8:10::10/64 and 2001:db8:10::20/64.",
      ]),
    ],
  },
  {
    labId: "ipv6-neighbor-desk",
    releaseState: "released",
    cliEnabled: true,
    stages: [
      stage("ns", "Resolve local neighbor", [
        text(
          "nd.target",
          "Neighbor target",
          "2001:db8:10::20",
          "ipv6",
          "Solicit the local destination address.",
        ),
        text(
          "nd.ownerMac",
          "Owner MAC",
          "02:00:00:00:00:0B",
          "text",
          "The owner advertisement supplies its link-layer address.",
        ),
      ], [
        "IPv6 uses ICMPv6 Neighbor Discovery, not ARP.",
        "Send Neighbor Solicitation for 2001:db8:10::20 and accept the owner advertisement.",
      ]),
      stage("ra", "Learn default router", [
        text(
          "nd.router",
          "Router link-local address",
          "fe80::1",
          "ipv6",
          "A local IPv6 next hop normally uses a link-local address.",
        ),
        toggle(
          "nd.ra",
          true,
          "Router Advertisement must be available for this guided host.",
          "ipv6 enable",
        ),
      ], [
        "Router Advertisements supply router and prefix information.",
        "Select FE80::1 as the local router learned from RA.",
      ]),
      stage("route", "Install IPv6 static route", [
        text(
          "nd.routePrefix",
          "Destination prefix",
          "2001:db8:20::",
          "ipv6",
          "Install the remote branch prefix.",
        ),
        number(
          "nd.routeLength",
          "Prefix length",
          64,
          "prefix6",
          "The remote branch uses /64.",
        ),
        text(
          "nd.nextHop",
          "Next hop",
          "fe80::2",
          "ipv6",
          "Use the adjacent router link-local next hop.",
        ),
      ], [
        "IPv6 route lookup still uses longest-prefix match.",
        "Install 2001:db8:20::/64 via FE80::2.",
      ]),
      stage("return", "Verify IPv6 round trip", [
        toggle(
          "nd.forwardRoute",
          true,
          "The request requires a usable forward route.",
        ),
        toggle(
          "nd.returnRoute",
          true,
          "The reply requires its own return route.",
        ),
      ], [
        "A forward route does not imply a reverse route.",
        "Enable and verify both /64 directions before declaring ping success.",
      ]),
    ],
  },
  {
    labId: "spanning-tree-desk",
    releaseState: "released",
    cliEnabled: false,
    stages: [
      stage("root", "Calculate root bridge", [
        number(
          "stp.priorityA",
          "SW1 priority",
          32768,
          "positive",
          "Keep SW1 at the default exercise priority.",
        ),
        number(
          "stp.priorityB",
          "SW2 priority",
          24576,
          "positive",
          "Give SW2 the lowest bridge priority.",
        ),
        number(
          "stp.priorityC",
          "SW3 priority",
          32768,
          "positive",
          "Keep SW3 at the default exercise priority.",
        ),
      ], [
        "Bridge priority is compared before the MAC-derived identifier.",
        "Set SW2 to 24576 while SW1 and SW3 remain 32768.",
      ]),
      stage("ports", "Calculate port roles", [
        number(
          "stp.costAB",
          "SW1–SW2 cost",
          4,
          "positive",
          "Use cost 4 for the direct link.",
        ),
        number(
          "stp.costBC",
          "SW2–SW3 cost",
          4,
          "positive",
          "Use cost 4 for the direct link.",
        ),
        number(
          "stp.costAC",
          "SW1–SW3 cost",
          8,
          "positive",
          "Use cost 8 for the redundant link.",
        ),
      ], [
        "Each non-root switch selects its lowest-cost path to the root.",
        "Calculate using costs 4, 4, and 8 before reading every role.",
      ]),
      stage("block", "Verify loop-free tree", [
        select("stp.redundantRole", "Inferior redundant role", "alternate", [
          option("Alternate / discarding", "alternate"),
          option("Designated / forwarding", "designated"),
        ], "One inferior redundant port must discard ordinary frames."),
      ], [
        "All physical links remain present.",
        "Verify that the inferior redundant path becomes alternate/discarding.",
      ]),
      stage("change", "Fail link and recalculate", [
        select("stp.failedLink", "Failed active link", "AB", [
          option("SW1—SW2", "AB"),
          option("No failure", "none"),
        ], "Disable an active link to test the redundant topology."),
      ], [
        "STP recalculates from the current graph.",
        "Fail AB and verify that a surviving redundant link can enter the forwarding tree.",
      ]),
    ],
  },
  {
    labId: "etherchannel-desk",
    releaseState: "released",
    cliEnabled: true,
    stages: [
      stage("mode", "Save LACP modes", [
        select("lacp.modeA", "SW1 mode", "active", [
          option("Active", "active", "channel-group 1 mode active"),
          option("Passive", "passive", "channel-group 1 mode passive"),
        ], "At least one endpoint must actively initiate."),
        select("lacp.modeB", "SW2 mode", "passive", [
          option("Passive", "passive", "channel-group 1 mode passive"),
          option("Active", "active", "channel-group 1 mode active"),
        ], "Active/passive is the guided pairing."),
      ], [
        "Passive/passive does not initiate LACP in this model.",
        "Configure SW1 active and SW2 passive.",
      ]),
      stage("members", "Save member compatibility", [
        number(
          "lacp.speedA",
          "SW1 member speed",
          1000,
          "positive",
          "Use matching 1 Gbit/s members.",
        ),
        number(
          "lacp.speedB",
          "SW2 member speed",
          1000,
          "positive",
          "Both endpoints need the same member speed.",
        ),
        select("lacp.switchportMode", "Switchport mode", "trunk", [
          option("Trunk", "trunk", "switchport mode trunk"),
          option("Access", "access", "switchport mode access"),
        ], "The inter-switch bundle must be a trunk."),
      ], [
        "Bundle members must describe the same logical service.",
        "Match speed and trunk mode on both endpoints.",
      ]),
      stage("bundle", "Form port-channel", [
        text(
          "lacp.channel",
          "Logical interface",
          "Port-channel1",
          "text",
          "Use the fixed Port-channel1 interface.",
        ),
        toggle("lacp.membersUp", true, "Both physical members must be active."),
      ], [
        "A formed bundle becomes one logical switching interface.",
        "Assign compatible active members to Port-channel1.",
      ]),
      stage("reach", "Verify trunk VLANs", [
        text(
          "lacp.vlans",
          "Allowed VLANs",
          "10,20",
          "csv-vlan",
          "The logical trunk must carry both VLAN 10 and 20.",
        ),
      ], [
        "A formed bundle does not automatically permit every VLAN.",
        "Allow VLAN 10 and 20 on the logical trunk, then test both contexts.",
      ]),
    ],
  },
  {
    labId: "route-source-desk",
    releaseState: "released",
    cliEnabled: false,
    stages: [
      stage("sources", "Load route candidates", [
        toggle(
          "route.connected",
          true,
          "Include connected routes as one source.",
        ),
        toggle("route.static", true, "Include the static candidate."),
        toggle("route.ospf", true, "Include the OSPF candidate."),
      ], [
        "Route source describes how a candidate was learned.",
        "Load connected, static, and OSPF candidates before comparing them.",
      ]),
      stage("prefix", "Run prefix matching", [
        text(
          "route.destination",
          "Destination",
          "192.168.20.20",
          "ipv4",
          "Use the target host in the remote /24.",
        ),
        number(
          "route.prefix",
          "Specific route prefix",
          24,
          "prefix4",
          "The /24 is more specific than the default route.",
        ),
      ], [
        "Destination matching occurs before route-source preference.",
        "Compare 192.168.20.0/24 with 0.0.0.0/0 for 192.168.20.20.",
      ]),
      stage("ad", "Resolve equal-prefix sources", [
        number(
          "route.staticAd",
          "Static administrative distance",
          1,
          "positive",
          "The supplied static candidate uses AD 1.",
        ),
        number(
          "route.ospfAd",
          "OSPF administrative distance",
          110,
          "positive",
          "The supplied OSPF candidate uses AD 110.",
        ),
      ], [
        "Administrative distance compares different sources for the same prefix.",
        "For equal /24 candidates, AD 1 is preferred over AD 110.",
      ]),
      stage("withdraw", "Withdraw preferred route", [
        toggle(
          "route.staticAvailable",
          false,
          "Withdraw the preferred static candidate to expose the fallback.",
        ),
      ], [
        "The table is recalculated from currently eligible candidates.",
        "Remove the static /24 and verify that the OSPF /24 becomes installed.",
      ]),
    ],
  },
  {
    labId: "ospf-area-desk",
    releaseState: "released",
    cliEnabled: true,
    stages: [
      stage("identity", "Save router IDs", [
        text(
          "ospf.r1",
          "R1 router ID",
          "1.1.1.1",
          "ipv4",
          "Router IDs must be unique.",
          "EXAMPLE / 10.10.10.10",
        ),
        text(
          "ospf.r2",
          "R2 router ID",
          "2.2.2.2",
          "ipv4",
          "Router IDs must be unique.",
          "EXAMPLE / 20.20.20.20",
        ),
        text(
          "ospf.r3",
          "R3 router ID",
          "3.3.3.3",
          "ipv4",
          "Router IDs must be unique.",
          "EXAMPLE / 30.30.30.30",
        ),
      ], [
        "Router IDs identify routers in OSPF state.",
        "Configure three unique identifiers: 1.1.1.1, 2.2.2.2, and 3.3.3.3.",
      ]),
      stage("neighbor", "Form OSPF neighbors", [
        number(
          "ospf.area12",
          "R1–R2 area",
          0,
          "positive",
          "Both ends must use area 0.",
        ),
        number(
          "ospf.area23",
          "R2–R3 area",
          0,
          "positive",
          "Both links belong to the same single area.",
        ),
        toggle(
          "ospf.linksUp",
          true,
          "OSPF cannot form neighbors across disabled links.",
          "no shutdown",
        ),
      ], [
        "Hello compatibility is required before adjacency.",
        "Place both active links in area 0.",
      ]),
      stage("spf", "Calculate SPF routes", [
        number(
          "ospf.cost12",
          "R1–R2 cost",
          10,
          "positive",
          "Use the fixed link cost 10.",
        ),
        number(
          "ospf.cost23",
          "R2–R3 cost",
          10,
          "positive",
          "Use the fixed link cost 10.",
        ),
        toggle(
          "ospf.advertise",
          true,
          "R3 must advertise its destination prefix.",
          "network 192.168.30.0 0.0.0.255 area 0",
        ),
      ], [
        "SPF uses synchronized topology state and accumulated cost.",
        "Advertise the R3 LAN and calculate the two-link cost from R1.",
      ]),
      stage("failure", "Fail link and recover", [
        select("ospf.failedLink", "Link state", "r2-r3-down", [
          option("R2–R3 down", "r2-r3-down", "shutdown"),
          option("All links up", "up", "no shutdown"),
        ], "Inject the R2–R3 failure before recalculation."),
        select(
          "ospf.response",
          "Required response",
          "recalculate",
          [
            option(
              "Rebuild topology and run SPF",
              "recalculate",
              "show ip ospf database",
            ),
            option("Keep stale route installed", "stale"),
          ],
          "Unavailable adjacency state must be removed before SPF is recalculated.",
        ),
      ], [
        "A failed adjacency changes the current topology graph.",
        "Remove R2–R3, rebuild LSDB state, and rerun SPF without inventing a delay.",
      ]),
    ],
  },
  {
    labId: "network-operations-capstone",
    releaseState: "released",
    cliEnabled: true,
    stages: [
      stage("office-l2", "Verify resilient Layer 2", [
        text(
          "cap.vlans",
          "Trunk VLAN list",
          "10,20",
          "csv-vlan",
          "The office trunk must carry VLAN 10 and 20.",
        ),
        select("cap.lacp", "LACP endpoint modes", "active-passive", [
          option(
            "Active / passive",
            "active-passive",
            "channel-group 1 mode active",
          ),
          option("Passive / passive", "passive-passive"),
        ], "At least one LACP endpoint must initiate."),
        text(
          "cap.stp",
          "Expected root bridge",
          "SW2",
          "text",
          "The configured bridge priority makes SW2 the root.",
        ),
      ], [
        "Build VLAN context before testing services.",
        "Allow VLAN 10 and 20, form active/passive LACP, and verify SW2 as root.",
      ]),
      stage("office-services", "Verify office services", [
        text(
          "cap.dhcp",
          "DHCP first available lease",
          "192.168.10.101",
          "ipv4",
          "The excluded gateway leaves 192.168.10.101 as the first lease.",
        ),
        text(
          "cap.dns",
          "server.netbite.test A record",
          "192.168.20.20",
          "ipv4",
          "The service name must resolve to the server address.",
        ),
      ], [
        "Address assignment and name resolution are independent.",
        "Create lease 192.168.10.101 and map server.netbite.test to 192.168.20.20.",
      ]),
      stage("office-routing", "Verify OSPF paths", [
        text(
          "cap.ospfForward",
          "Installed server route",
          "192.168.20.0/24",
          "text",
          "Install the complete server prefix.",
        ),
        text(
          "cap.ospfReturn",
          "Installed client route",
          "192.168.10.0/24",
          "text",
          "Install the complete client return prefix.",
        ),
      ], [
        "OSPF adjacency alone does not prove the destination prefix is installed.",
        "Verify 192.168.20.0/24 forward and 192.168.10.0/24 return routes.",
      ]),
      stage("office-edge", "Verify policy and PAT", [
        select(
          "cap.acl",
          "HTTPS policy result",
          "permit-https-deny-other",
          [
            option(
              "Permit HTTPS / deny unauthorized",
              "permit-https-deny-other",
              "show access-lists",
            ),
            option("Permit all traffic", "permit-all"),
          ],
          "The policy must permit the required service without opening every flow.",
        ),
        text(
          "cap.pat",
          "PAT global address",
          "203.0.113.10",
          "ipv4",
          "Eligible inside traffic must translate through the configured global address.",
        ),
      ], [
        "Policy selection occurs before successful translated forwarding.",
        "Permit required HTTPS, deny the unauthorized tuple, and translate through 203.0.113.10.",
      ]),
      stage("office-verify", "Run IPv4 service tests", [], [
        "One-way reachability is incomplete evidence.",
        "NetBite derives forward and return results from the VLAN, LACP, STP, services, routes, ACL, and PAT state already configured.",
      ]),
      stage("branch-local", "Verify IPv6 local state", [
        text(
          "cap.ipv6Address",
          "Branch host address",
          "2001:db8:10::10",
          "ipv6",
          "The branch host needs a valid address in the guided /64.",
        ),
        text(
          "cap.ndp",
          "Learned router",
          "fe80::1",
          "ipv6",
          "Router Discovery and NDP must resolve the local link-local next hop.",
        ),
      ], [
        "IPv6 uses ICMPv6 Neighbor Discovery rather than ARP.",
        "Configure 2001:db8:10::10/64 and learn FE80::1 as the local router.",
      ]),
      stage("branch-route", "Verify IPv6 routes", [
        text(
          "cap.ipv6Forward",
          "Remote branch prefix",
          "2001:db8:20::",
          "ipv6",
          "Install the remote destination /64.",
        ),
        text(
          "cap.ipv6Return",
          "Return branch prefix",
          "2001:db8:10::",
          "ipv6",
          "Install the reverse /64 route.",
        ),
      ], [
        "One static route does not create its reverse.",
        "Install 2001:db8:20::/64 forward and 2001:db8:10::/64 return.",
      ]),
      stage("branch-fault", "Repair IPv6 branch", [
        select("cap.parentUp", "Parent interface state", "up", [
          option("Administratively up", "up", "no shutdown"),
          option("Shutdown", "down", "shutdown"),
        ], "Enable the physical parent interface before verification."),
      ], [
        "Logical forwarding cannot use a down physical parent.",
        "Enable the parent, rerun NDP, and verify both IPv6 directions.",
      ]),
    ],
  },
];

export const operationsSimulationDefinitions: Record<
  string,
  GuidedSimulationDefinition
> = Object.fromEntries(
  definitions.map((definition) => [definition.labId, definition]),
);

export const operationsModuleReleaseStates: Record<string, ModuleReleaseState> =
  {
    "ops-01": "released",
    "ops-02": "released",
    "ops-03": "released",
    "ops-04": "released",
    "ops-05": "released",
    "ops-06": "released",
    "ops-07": "released",
    "ops-08": "released",
    "ops-09": "released",
    "ops-10": "released",
    "ops-11": "released",
  };

export const boundedCliCommands: Record<
  string,
  {
    stageId: string;
    command: string;
    updates: Record<string, SimulationValue>;
  }[]
> = {
  "acl-policy-desk": [
    {
      stageId: "tuple",
      command: "test-flow tcp 192.168.10.10 192.168.20.20 eq 443",
      updates: {
        "acl.protocol": "tcp",
        "acl.source": "192.168.10.10",
        "acl.destination": "192.168.20.20",
        "acl.port": 443,
      },
    },
    {
      stageId: "wildcard",
      command: "source 192.168.10.0 0.0.0.255",
      updates: { "acl.network": "192.168.10.0", "acl.wildcard": "0.0.0.255" },
    },
    {
      stageId: "match",
      command: "10 permit tcp 192.168.10.0 0.0.0.255 host 192.168.20.20 eq 443",
      updates: { "acl.action": "permit", "acl.sequence": 10 },
    },
    {
      stageId: "direction",
      command: "interface g0/0 ip access-group netbite-in in",
      updates: { "acl.interface": "G0/0", "acl.direction": "in" },
    },
  ],
  "nat-translation-desk": [
    {
      stageId: "roles",
      command: "interface g0/0 ip nat inside",
      updates: { "nat.insideUp": true },
    },
    {
      stageId: "roles",
      command: "interface g0/1 ip nat outside",
      updates: { "nat.outsideUp": true },
    },
    {
      stageId: "selection",
      command: "ip nat select 192.168.10.0/24",
      updates: { "nat.network": "192.168.10.0", "nat.prefix": 24 },
    },
    {
      stageId: "pat",
      command: "ip nat pool netbite 203.0.113.10 overload",
      updates: { "nat.global": "203.0.113.10", "nat.flowCount": 2 },
    },
    {
      stageId: "return",
      command: "show ip nat translations",
      updates: { "nat.returnCheck": "table" },
    },
  ],
  "ipv6-neighbor-desk": [
    {
      stageId: "ns",
      command: "neighbor 2001:db8:10::20 02:00:00:00:00:0b",
      updates: {
        "nd.target": "2001:db8:10::20",
        "nd.ownerMac": "02:00:00:00:00:0B",
      },
    },
    {
      stageId: "ra",
      command: "ipv6 default-router fe80::1",
      updates: { "nd.router": "fe80::1", "nd.ra": true },
    },
    {
      stageId: "route",
      command: "ipv6 route 2001:db8:20::/64 fe80::2",
      updates: {
        "nd.routePrefix": "2001:db8:20::",
        "nd.routeLength": 64,
        "nd.nextHop": "fe80::2",
      },
    },
    {
      stageId: "return",
      command: "verify ipv6 bidirectional",
      updates: { "nd.forwardRoute": true, "nd.returnRoute": true },
    },
  ],
  "etherchannel-desk": [
    {
      stageId: "mode",
      command: "sw-a channel-group 1 mode active",
      updates: { "lacp.modeA": "active" },
    },
    {
      stageId: "mode",
      command: "sw-b channel-group 1 mode passive",
      updates: { "lacp.modeB": "passive" },
    },
    {
      stageId: "members",
      command: "members speed 1000 switchport mode trunk",
      updates: {
        "lacp.speedA": 1000,
        "lacp.speedB": 1000,
        "lacp.switchportMode": "trunk",
      },
    },
    {
      stageId: "bundle",
      command: "interface port-channel1 no shutdown",
      updates: { "lacp.channel": "Port-channel1", "lacp.membersUp": true },
    },
    {
      stageId: "reach",
      command: "switchport trunk allowed vlan 10,20",
      updates: { "lacp.vlans": "10,20" },
    },
  ],
  "ospf-area-desk": [
    {
      stageId: "identity",
      command: "r1 router-id 1.1.1.1",
      updates: { "ospf.r1": "1.1.1.1" },
    },
    {
      stageId: "identity",
      command: "r2 router-id 2.2.2.2",
      updates: { "ospf.r2": "2.2.2.2" },
    },
    {
      stageId: "identity",
      command: "r3 router-id 3.3.3.3",
      updates: { "ospf.r3": "3.3.3.3" },
    },
    {
      stageId: "neighbor",
      command: "links area 0 no shutdown",
      updates: { "ospf.area12": 0, "ospf.area23": 0, "ospf.linksUp": true },
    },
    {
      stageId: "spf",
      command: "links cost 10 advertise 192.168.30.0/24",
      updates: { "ospf.cost12": 10, "ospf.cost23": 10, "ospf.advertise": true },
    },
    {
      stageId: "failure",
      command: "link r2-r3 shutdown recalculate spf",
      updates: {
        "ospf.failedLink": "r2-r3-down",
        "ospf.response": "recalculate",
      },
    },
  ],
  "network-operations-capstone": [
    {
      stageId: "office-l2",
      command: "office l2 vlan 10,20 lacp active-passive root sw-b",
      updates: {
        "cap.vlans": "10,20",
        "cap.lacp": "active-passive",
        "cap.stp": "SW2",
      },
    },
    {
      stageId: "office-services",
      command: "office services lease 192.168.10.101 dns 192.168.20.20",
      updates: { "cap.dhcp": "192.168.10.101", "cap.dns": "192.168.20.20" },
    },
    {
      stageId: "office-routing",
      command: "office routes 192.168.20.0/24 return 192.168.10.0/24",
      updates: {
        "cap.ospfForward": "192.168.20.0/24",
        "cap.ospfReturn": "192.168.10.0/24",
      },
    },
    {
      stageId: "office-edge",
      command: "office edge permit-https-deny-other pat 203.0.113.10",
      updates: {
        "cap.acl": "permit-https-deny-other",
        "cap.pat": "203.0.113.10",
      },
    },
    {
      stageId: "office-verify",
      command: "verify office bidirectional",
      updates: { "cap.ipv4Forward": "pass", "cap.ipv4Return": "pass" },
    },
    {
      stageId: "branch-local",
      command: "branch host 2001:db8:10::10 router fe80::1",
      updates: { "cap.ipv6Address": "2001:db8:10::10", "cap.ndp": "fe80::1" },
    },
    {
      stageId: "branch-route",
      command: "branch routes 2001:db8:20::/64 return 2001:db8:10::/64",
      updates: {
        "cap.ipv6Forward": "2001:db8:20::",
        "cap.ipv6Return": "2001:db8:10::",
      },
    },
    {
      stageId: "branch-fault",
      command: "branch parent no shutdown",
      updates: { "cap.parentUp": "up" },
    },
  ],
};
