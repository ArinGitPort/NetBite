# Educational Illustration Sources

The renderer registry stores the source identifiers below on every illustration specification. References determine technical structure and claims only; no source artwork is copied.

| Source ID | Authoritative reference | Illustration coverage |
| --- | --- | --- |
| `IEEE-802.3` | [IEEE 802.3 Ethernet Working Group](https://www.ieee802.org/3/) | Ethernet media, interfaces, frame concepts, and 48-bit addresses |
| `IEEE-RA` | [IEEE Registration Authority](https://standards.ieee.org/products-programs/regauth/) | MAC-address administration |
| `IEEE-802.1Q` | [IEEE 802.1 Working Group](https://www.ieee802.org/1/pages/802.1Q.html) | VLAN separation and tagged links |
| `RFC-791` | [Internet Protocol](https://www.rfc-editor.org/rfc/rfc791) | IPv4 address and datagram structure |
| `RFC-950` | [Internet Standard Subnetting Procedure](https://www.rfc-editor.org/rfc/rfc950) | Masks, subnet boundaries, and ranges |
| `RFC-1878` | [Variable Length Subnet Table for IPv4](https://www.rfc-editor.org/rfc/rfc1878) | `/24–/27` masks, block sizes, complete host ranges, and broadcast endpoints |
| `RFC-1918` | [Address Allocation for Private Internets](https://www.rfc-editor.org/rfc/rfc1918) | Private IPv4 blocks |
| `RFC-4632` | [Classless Inter-domain Routing](https://www.rfc-editor.org/rfc/rfc4632) | Prefix notation and longest-prefix concepts |
| `RFC-826` | [Address Resolution Protocol](https://www.rfc-editor.org/rfc/rfc826) | ARP request, reply, mapping, and cache concepts |
| `RFC-792` | [Internet Control Message Protocol](https://www.rfc-editor.org/rfc/rfc792) | ICMP Echo Request and Reply |
| `RFC-1122` | [Requirements for Internet Hosts — Communication Layers](https://www.rfc-editor.org/rfc/rfc1122) | Host forwarding decisions and TCP/IP layer names |
| `RFC-1812` | [Requirements for IPv4 Routers](https://www.rfc-editor.org/rfc/rfc1812) | Router interfaces, forwarding, and route selection |
| `ISO-7498-1` | [ISO/IEC 7498-1 OSI Basic Reference Model](https://www.iso.org/standard/20269.html) | Exact seven-layer ordering and responsibility model |
| `CISCO-NETWORK`, `CISCO-DEVICES`, `CISCO-LAN` | [Cisco Networking Basics](https://www.cisco.com/site/us/en/learn/topics/networking/what-is-a-computer-network.html) | Beginner network, device-role, and LAN relationships |
| `CISCO-MAC-LEARNING` | [Cisco MAC Address and MAC Address Table Management](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/cdp-lldp-mac-udld/cdp-lldp-mac-udld-configuration-guide/configure-mac.html) | Source learning and MAC-table forwarding decisions |
| `C2-CISCO-MDIX` | [Cisco Auto-MDIX configuration guidance](https://www.cisco.com/c/en/us/td/docs/routers/access/800M/software/800MSCG/routconf.html) | Manual straight-through/crossover rules and the auto-MDIX boundary |
| `CISCO-PING` | [Cisco IP connectivity and ping troubleshooting](https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13730-ext-ping-trace.html) | Diagnostic evidence and troubleshooting boundaries |
| `CISCO-STATIC` | [Cisco IPv4 Static Route Configuration Guide](https://www.cisco.com/c/en/us/td/docs/routers/ncs5xx/ncs520/configuration/guide/iproute/17-1-1/b-ipv4-routing-xe-17-1-1-ncs520/m-configuring-static-route-ncs520.html) | Static routes, next hops, and return paths |
| `CISCO-VLAN` | [Cisco access- and trunk-port configuration](https://www.cisco.com/c/en/us/support/docs/smb/switches/cisco-small-business-300-series-managed-switches/smb5653-configure-port-to-vlan-interface-settings-on-a-switch-throug.html) | Access ports, trunks, and VLAN reachability |
| `CISCO-OSI` | [Cisco OSI reference material](https://www.cisco.com/c/en/us/td/docs/ios/sw_upgrades/interlink/r2_0/api_con/acoview.html) | Conventional Application-top, Physical-bottom presentation |

## Content boundaries

- OSI is a reference model, not an implementation specification or a literal machine sequence.
- Ethernet diagrams omit preamble and detailed field lengths in the beginner overview unless the lesson explicitly teaches them.
- ARP is presented for IPv4 on one local link. Neighbor Discovery, security attacks, and cache timing are outside scope.
- Ping success supports round-trip IP reachability for that test. Failure alone does not prove one specific cause.
- Routing illustrations model deterministic prefix selection, not convergence, dynamic protocol timing, or packet queues.
- VLAN illustrations show access membership and 802.1Q trunks. Inter-VLAN routing, native-VLAN details, and spanning tree remain outside this chapter.
