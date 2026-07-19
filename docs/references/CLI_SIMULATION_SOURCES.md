# CLI Simulation Technical Sources

## Primary references

- Cisco, [Using the Command-Line Interface](https://www.cisco.com/c/en/us/td/docs/routers/ios-xe/system-management/system-management/m_cf-cli-basics.html): prompt hierarchy, EXEC/configuration mode concepts, context-sensitive command availability, and familiar mode transitions.
- Cisco, [IP Routing: Protocol-Independent Command Reference](https://www.cisco.com/c/en/us/td/docs/ios/iproute_pi/command/reference/iri_book/iri_pi1.html): static route command structure and route verification concepts.
- Cisco, [VLAN Commands](https://www.cisco.com/c/en/us/td/docs/switches/campus-lan-switches-access/Catalyst-1200-and-1300-Switches/cli/C1200-cli/vlan-commands.html): VLAN creation, access membership, trunk allowed lists, and show-command concepts.
- [RFC 1812 — Requirements for IP Version 4 Routers](https://www.rfc-editor.org/rfc/rfc1812): IPv4 forwarding, next-hop, route selection, and router behavior boundaries.
- [RFC 792 — Internet Control Message Protocol](https://www.rfc-editor.org/rfc/rfc792): Echo Request and Echo Reply semantics.
- IEEE 802.1Q: VLAN identification and bridged-network behavior. The public standard landing page is [IEEE 802.1Q](https://standards.ieee.org/ieee/802.1Q/6844/).

## NetBite adaptations

- Command syntax is intentionally limited and aliases are explicit rather than accepting every valid IOS abbreviation.
- Prompts resemble the conventional mode hierarchy; output wording and formatting are original NetBite text.
- Configuration applies immediately to deterministic state. NetBite does not model control-plane convergence, ARP timing, queues, frame transmission, ICMP timing, or hardware processes.
- `ping` traces modeled forward and return paths. It never invents latency or loss and never turns an Echo failure into a universal diagnosis.
- Connected routes are derived from configured active interfaces. Static routes participate in longest-prefix selection; next hops must be modeled adjacent devices.
- VLAN reachability requires endpoint access membership and, across switches, matching allowed VLAN state on both trunk endpoints. STP, native VLANs, negotiation, and Layer 3 inter-VLAN routing are excluded.
- Lab completion is state-based and accepts valid command order. It can require no conflicting extra configuration even if the simulator otherwise accepts that configuration.

## Unsupported command behavior

An unsupported or wrong-mode command returns a learning-oriented error and never changes state. NetBite does not attempt to reproduce vendor error strings, hidden defaults, command privilege matrices, configuration file formats, or arbitrary platform differences.
