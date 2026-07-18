# Chapter 3 Technical Sources

Jeremy's IT Lab remains a sequencing reference for beginner-friendly CCNA instruction. NetBite's switching claims are independently checked against IEEE material and official Cisco documentation.

## MAC Addresses and Ethernet

- [IEEE 802.3 Ethernet overview](https://www.ieee802.org/misc-docs/GlobeCom2009/IEEE_802d3_Law.pdf) - 48-bit destination and source address fields in an Ethernet frame and the role of MAC addressing.
- [IEEE Registration Authority](https://standards.ieee.org/products-programs/regauth/) - authoritative background for IEEE-managed MAC address assignment and registration.
- [Cisco: What Is an Ethernet Switch?](https://www.cisco.com/site/us/en/learn/topics/networking/what-is-an-ethernet-switch.html) - Ethernet frames, sender and destination MAC addresses, and switch forwarding behavior.

## Switching Behavior

- [Cisco Catalyst 6500 MAC Address Table Configuration](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst6500/ios/12-2SX/configuration/guide/book/mac.html) - dynamic source learning, MAC-to-port table entries, forwarding, and flooding behavior.
- [Cisco: Troubleshooting Unicast Flooding](https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/10595-8.html) - unknown-unicast flooding when a destination is absent from the forwarding table.

## Content Decisions

- NetBite uses fictional locally administered unicast addresses beginning with `02` so examples do not imply ownership by a real hardware vendor.
- The guided desk processes one frame at a time as a deterministic teaching model. It does not simulate timing, queues, frame contents, collisions, or real traffic.
- MAC aging, multicast, VLAN boundaries, loops and STP, spoofing, security controls, ARP, and IPv4 are intentionally deferred or out of scope.
- Flooding always excludes the ingress port in the simplified single-switch topology.
