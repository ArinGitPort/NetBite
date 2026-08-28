# Network Scope

NetBite teaches networking concepts through lessons, worked examples, deterministic graph/configuration models, and focused practice.

NetBite does not emulate a production network operating system or run real networking protocols. A simulated command changes typed local state; a result is derived immediately from that state. There are no real packets, sockets, queues, clocks, latency values, loss rates, or hardware processes.

## Supported teaching models

- IPv4 addressing and `/24–/27` subnetting
- Connected, static, longest-prefix, and default route decisions
- Ethernet switching and MAC learning
- IPv4 ARP request, reply, and cache decisions
- ICMP Echo path evidence without invented timing
- VLAN access membership and two-ended 802.1Q trunk reachability
- Router-on-a-stick inter-VLAN forwarding through logical 802.1Q subinterfaces
- A documented Cisco-like CLI subset for Chapters 8–10 and 12
- A standalone, port-aware Network Sandbox for bounded Ethernet, IPv4, static-route, ARP, ICMP Echo, VLAN, and inter-VLAN experimentation
- TCP and UDP endpoint-state exchanges without real sockets or congestion timing
- DHCP pool allocation, exclusions, exhaustion, renewal steps, and router relay decisions
- DNS hierarchy, authoritative records, caching, and learner-controlled logical TTL
- Ordered bounded IPv4 ACL evaluation and implicit deny
- Static NAT and PAT tuple creation and deterministic return matching
- IPv6 parsing, scope, Neighbor Discovery, router discovery, SLAAC/DAD decisions, and static routing
- Single-VLAN spanning-tree election and port roles without real convergence timing
- LACP member compatibility and logical port-channel state
- Connected, static, and OSPF route-source comparison using prefix, administrative distance, and metric
- Fixed single-area OSPFv2 neighbor graphs, synchronized topology state, and SPF path calculation

The CLI supports only the commands listed in `CLI_SIMULATION_GUIDE.md`. Familiar syntax is used for learning transfer, but NetBite does not claim Cisco IOS compatibility and its output is original NetBite text.

Router-on-a-stick is a bounded deterministic model. One physical router link may host logical subinterfaces with unique VLAN IDs and IPv4 gateway networks. The model validates VLAN carriage, connected routing, ARP, MAC learning, frame replacement, and the return path.

## Outside the current model

- BGP, MPLS, route redistribution, multi-area OSPF, OSPF authentication, and OSPFv3
- DTP, VTP, native-VLAN edge behavior, MST, PVST+, spanning-tree timers, and Layer 3 switch SVI configuration
- DHCPv6, DNSSEC implementation, advanced NAT variants, reflexive/time-based ACLs, and IPv6 ACLs
- TCP congestion and packet fragmentation
- Real sockets, packet capture, or protocol timing
- Queues, loss, jitter, collisions, or electrical behavior
- Arbitrary commands, unbounded topologies, and vendor-specific hardware behavior

The Network Sandbox permits free arrangement within its documented device and interface limits. Layer 2 cycles are rejected because STP is outside the model. Its exact invariants and persistence rules are recorded in `SANDBOX_SIMULATION_GUIDE.md`.

If a concept can be accurately taught through deterministic graph and configuration state, prefer that approach. Every simulation must state its boundary and report only conclusions proven by the modeled state.
