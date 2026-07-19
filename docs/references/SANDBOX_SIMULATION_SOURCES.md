# Network Sandbox Technical Sources

| Modeled behavior | Primary evidence | NetBite boundary |
| --- | --- | --- |
| Ethernet addressing and frames | IEEE 802.3 Ethernet standard | No electrical signaling, timing, collision, or physical encoding simulation |
| VLAN access and tagged trunk context | IEEE 802.1Q Bridges and Bridged Networks | No STP, negotiation, native-VLAN behavior, or router-on-a-stick |
| IPv4 addressing and forwarding | RFC 791; RFC 1812 | Deterministic addresses and route decisions only; no fragmentation or queues |
| ARP request, reply, and cache mapping | RFC 826 | Immediate state transitions with no timers, retries, poisoning, or security model |
| ICMP Echo evidence | RFC 792; RFC 1122 | Round-trip reachability without invented latency, loss, or universal failure causes |
| Prefix and route selection | RFC 4632; RFC 1812 | Connected, static, longest-prefix, and default choices only |
| Familiar command modes and syntax | Official Cisco IOS XE CLI basics, static-routing, and VLAN command references already recorded in `CLI_SIMULATION_SOURCES.md` | Original output and an explicit, unambiguous command subset |

Examples use documentation-oriented private IPv4 networks and locally administered fictional MAC addresses. Source artwork and vendor output are not copied.
