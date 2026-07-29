# Chapter 12 Technical Sources

## Primary references

- IEEE 802.1Q, *Bridges and Bridged Networks*: VLAN-aware bridged-network behavior and tagged VLAN context.
- RFC 1122, *Requirements for Internet Hosts — Communication Layers*: host next-hop and gateway responsibilities.
- RFC 1812, *Requirements for IP Version 4 Routers*: IPv4 router forwarding and route behavior.
- RFC 826, *An Ethernet Address Resolution Protocol*: IPv4 next-hop to Ethernet-address resolution.
- Cisco, *Configure Inter VLAN Routing with the Use of an External Router*: one physical router interface, IEEE 802.1Q trunking, logical subinterfaces, VLAN encapsulation, and IPv4 gateway configuration.

## NetBite boundaries

The chapter teaches router-on-a-stick with VLAN 10 and VLAN 20. A subinterface is modeled as a logical child of one physical interface, inherits the parent MAC and physical link, and becomes usable only with a unique VLAN ID, IPv4 configuration, and an active VLAN path.

The simulator does not claim Cisco IOS compatibility. It does not model Layer 3 switch SVIs, native-VLAN behavior, DTP, VTP, STP, ACLs, dynamic routing, packet timing, queues, loss, or hardware-specific behavior. CLI output and prompts are original NetBite educational text.
