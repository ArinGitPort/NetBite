# Network Operations Simulation Guide

## Purpose

Network Operations is Course 2. Its labs are fixed-topology, configuration-driven mini-simulators. They teach observable protocol and device-state decisions rather than imitate a vendor operating system. Every result is derived from typed local state by pure functions and can be reproduced offline.

## Quality gate

A learner-facing module must have a registered deterministic lab with at least four stages. Each stage supplies a current objective, editable device or protocol fields, validation, protocol evidence, two progressive hints retained in history, and a four-part explanation: observation, governing rule, supported conclusion, and next check.

Malformed input never mutates state. Syntactically valid but logically incorrect configuration remains visible and repairable. A stage advances only when its current modeled state satisfies the objective. Optional bounded CLI commands write the same configuration keys as the inspector.

Unfinished sessions autosave independently from learning progress. Up to 20 prior snapshots support Undo. Reset requires confirmation. Version-1 choice sessions are retained as local recovery copies and restarted cleanly because an answer transcript cannot safely become device configuration. Completion is stored separately from detailed simulator state, so cloud sync never uploads a learner's lab configuration.

## Shared lab layout

Every generic Operations lab begins with `LEARN THE SETUP`. It states the goal in plain English, identifies what is already configured, demonstrates the method once, lists the assessed tasks, and links to the prerequisite lessons. The briefing remains replayable after progress begins.

The fixed topology is an interactive inspection surface rather than a row of text labels. Existing themed PCs, switches, routers, and servers are connected by labeled modeled interfaces. Selecting a device explains its role and current visible state; learners still change configuration through the inspector or bounded CLI.

The DHCP reference topology contains two clients, SW-1, relay router R-1, and DHCP-1. It separates the client broadcast domain from the routed server network and makes pool, exclusion, binding, DORA, exhaustion, and relay evidence visible without pretending to transmit live packets.

- One fixed, responsive topology with vertical recomposition on compact screens
- One current objective and one dominant Save or Verify action
- Device/protocol inspector with full-value inputs and explicit selections
- Optional bounded NetBite CLI for ACL, NAT/PAT, IPv6 routing, EtherChannel, OSPF, and capstone work
- Persistent protocol table plus learner-controlled event trace
- Accumulated hints, deterministic explanation, Undo, and confirmed Reset

All eleven modules and the capstone currently carry the `released` quality state. The content model also supports `validation` and `comingSoon`; those states are visible in the learning path and block direct routes unless development presentation access is active.

## Supported engines

- Transport uses the reference step-driven mini-simulator. Learners configure a client endpoint and server listener, then manually send SYN, SYN-ACK, ACK, application data, a controlled missing segment, retransmission, and a cumulative acknowledgment. UDP comparison uses separate datagrams and deliberately provides no TCP connection or recovery state.
- DHCP pool allocation, binding, exhaustion, and relay reachability
- DNS authoritative lookup, recursive evidence, cache state, and logical time
- IPv4 ACL wildcard and ordered first-match evaluation
- NAT/PAT flow eligibility and reversible translation tuples
- IPv6 expansion/compression, neighbor resolution, and longest-prefix routing
- Spanning-tree bridge election, costs, port roles, and link-change recalculation
- LACP compatibility and logical bundle formation
- Route-source and single-area OSPFv2 topology/SPF selection

## Explicit limitations

NetBite does not create sockets, transmit packets, measure time, emulate queues, invent loss, or execute Cisco IOS. CLI-like syntax aids knowledge transfer, but output and state remain original NetBite behavior. Advanced areas, real convergence, packet capture, wireless, production security policy, and hardware troubleshooting require an external tool or physical lab.

The Transport lab uses deterministic initial sequence values only to make state changes inspectable. Its learner-controlled missing segment does not represent a timer, random network loss, or a claim about a particular retransmission timeout. The intermediate router is shown to clarify that transport ports are endpoint information and are not used for ordinary IP route selection.

## Capstone

The Operations capstone has two autosaved parts. The IPv4 small office combines explicit VLAN lists, LACP modes, STP root state, DHCP bindings, DNS records, OSPF prefixes, PAT addressing, and service-specific ACL results. The IPv6 branch combines configured global/link-local identities, router and neighbor discovery, bidirectional static prefixes, and an injected down-interface fault. A part succeeds only when its required forward and return evidence is present.
