# NetBite Network Sandbox

## Product boundary

The Network Sandbox is a deterministic educational state model. It is not Cisco Packet Tracer, a network operating system, or a live packet emulator. Actions calculate an immediate result from serializable device, interface, link, VLAN, address, route, MAC-table, and ARP-table state.

The interface must report only what that state proves. A successful ping means the modeled Echo Request and Reply paths succeeded; it does not invent latency or prove that every application works.

## Supported workspace

- One locally autosaved workspace
- Up to 12 PCs, switches, and routers
- One Ethernet interface per PC, eight switchports per switch, and four routed interfaces per router
- Automatic free-port selection with visible endpoint names
- IPv4 interface configuration and PC default gateways
- Connected, static, longest-prefix, and default-route decisions
- Per-VLAN switch access and two-ended trunk forwarding
- MAC source learning and ARP next-hop cache state
- Ethernet unicast/broadcast traces and ICMP Echo round-trip traces
- Inspector and Cisco-like NetBite CLI operating on the same configuration
- Visual and CLI ping using the same routed, switched, VLAN-aware path engine

## Deliberate exclusions

The sandbox does not model STP, DTP, VTP, switch management SVIs, dynamic routing, DHCP, DNS, NAT, ACLs, router-on-a-stick, wireless, IPv6, sockets, queues, latency, jitter, loss, electrical behavior, or arbitrary vendor commands. Links that would create a Layer 2 cycle are rejected because STP is not modeled.

## State and feedback rules

- Invalid syntax never mutates state.
- Valid but logically conflicting configuration remains visible with a warning.
- Every interface can belong to at most one physical link.
- VLAN traffic crosses a switch-to-switch link only when both endpoints are trunks and both allow the VLAN.
- Learned MAC and ARP state is cleared independently from topology and configuration.
- Trace animation is optional presentation. The ordered text events are authoritative.
- Topology and configuration edits invalidate the visible trace. Repeating a test that produces no state change does not consume undo history.
- Persisted workspaces are structurally validated before hydration; malformed saved state falls back to a safe empty workspace.
- Ping form readiness is validated before simulation. Missing source addressing or malformed destination input is setup guidance, not a stopped network trace.
- A two-PC, one-switch workspace may explicitly apply the previewed `192.168.10.0/24` beginner setup. Existing configuration is never replaced without confirmation.
- Canvas plates show PC addressing, every configured router interface address, and whether an interface is down. Layer 2 switches state that management IPs are not modeled because the sandbox does not yet support an SVI.
- Filled configuration values use normal high-contrast input text. Muted input text is reserved for examples in empty fields.
- Undo and redo retain 20 changes during the current session. Only the workspace and first-use acknowledgement persist after relaunch.

## Sandbox CLI additions

The sandbox extends the Chapter 8–10 subset with interface addressing, `shutdown`, `no shutdown`, `show mac address-table`, `show arp`, `clear mac address-table`, and `clear arp`. Sandbox CLI ping traverses the same active links, VLAN context, routes, and return path as the visual trace, and its ARP/MAC learning is written back to the shared workspace. Output is original NetBite wording and does not claim IOS compatibility.

Technical evidence is listed in `references/SANDBOX_SIMULATION_SOURCES.md`.
