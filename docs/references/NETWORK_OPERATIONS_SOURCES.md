# Network Operations Source Record

Jeremy’s IT Lab may guide beginner-friendly teaching order and practice style. Protocol claims are checked against these primary or official references:

- TCP — RFC 9293: <https://www.rfc-editor.org/rfc/rfc9293>
- UDP — RFC 768: <https://www.rfc-editor.org/rfc/rfc768>
- Service names and ports — IANA registry: <https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml>
- DHCP — RFC 2131 and RFC 2132: <https://www.rfc-editor.org/rfc/rfc2131>, <https://www.rfc-editor.org/rfc/rfc2132>
- DNS — RFC 1034 and RFC 1035: <https://www.rfc-editor.org/rfc/rfc1034>, <https://www.rfc-editor.org/rfc/rfc1035>
- Private addressing and traditional NAT — RFC 1918 and RFC 3022: <https://www.rfc-editor.org/rfc/rfc1918>, <https://www.rfc-editor.org/rfc/rfc3022>
- IPv6 — RFC 8200, RFC 4291, and RFC 5952: <https://www.rfc-editor.org/rfc/rfc8200>, <https://www.rfc-editor.org/rfc/rfc4291>, <https://www.rfc-editor.org/rfc/rfc5952>
- IPv6 Neighbor Discovery and SLAAC — RFC 4861 and RFC 4862: <https://www.rfc-editor.org/rfc/rfc4861>, <https://www.rfc-editor.org/rfc/rfc4862>
- OSPFv2 — RFC 2328: <https://www.rfc-editor.org/rfc/rfc2328>
- Bridging/VLAN and link aggregation — IEEE 802.1Q and IEEE 802.1AX standard pages: <https://standards.ieee.org/standard/802_1Q-2022.html>, <https://standards.ieee.org/standard/802_1AX-2020.html>
- ACL, STP, EtherChannel, and OSPF configuration syntax — current official Cisco configuration documentation. Vendor syntax informs bounded practice only; NetBite does not claim IOS compatibility.

## Scope notes

Port examples are learning examples, not a promise that an application always uses one port. DHCP and DNS timers advance only through learner-controlled logical steps. Spanning tree and OSPF calculate stable state without claiming real convergence duration. NAT/PAT covers deterministic tuple mapping, not every implementation behavior. IPv6 excludes DHCPv6 and OSPFv3.

The Transport mini-simulator follows RFC 9293's connection-establishment and acknowledgment concepts but deliberately exposes only the beginner states needed by the lesson. Initial sequence values and the omitted data segment are deterministic teaching inputs. UDP behavior follows RFC 768: NetBite does not add TCP-style acknowledgments or retransmission state to a UDP exchange.
