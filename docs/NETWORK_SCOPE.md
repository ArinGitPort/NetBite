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
- A documented Cisco-like CLI subset for Chapters 8–10
- A standalone, port-aware Network Sandbox for bounded Ethernet, IPv4, static-route, ARP, ICMP Echo, and VLAN experimentation

The CLI supports only the commands listed in `CLI_SIMULATION_GUIDE.md`. Familiar syntax is used for learning transfer, but NetBite does not claim Cisco IOS compatibility and its output is original NetBite text.

## Outside the current model

- Dynamic routing, OSPF, BGP, and MPLS
- STP, DTP, VTP, and inter-VLAN routing configuration
- ACLs, NAT, DHCP, and DNS configuration
- TCP congestion and packet fragmentation
- Real sockets, packet capture, or protocol timing
- Queues, loss, jitter, collisions, or electrical behavior
- Arbitrary commands, unbounded topologies, and vendor-specific hardware behavior

The Network Sandbox permits free arrangement within its documented device and interface limits. Layer 2 cycles are rejected because STP is outside the model. Its exact invariants and persistence rules are recorded in `SANDBOX_SIMULATION_GUIDE.md`.

If a concept can be accurately taught through deterministic graph and configuration state, prefer that approach. Every simulation must state its boundary and report only conclusions proven by the modeled state.
