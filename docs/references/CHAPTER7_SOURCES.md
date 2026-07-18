# Chapter 7 Technical Sources

## Primary references

- [RFC 826: An Ethernet Address Resolution Protocol](https://www.rfc-editor.org/rfc/rfc826) — IPv4 protocol-address to Ethernet-address resolution, requests, and replies.
- [Cisco: IP Addressing Services Configuration Guide — ARP](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_arp/configuration/15-mt/arp-15-mt-book.html) — ARP tables and operational behavior.

## Content boundaries

NetBite models one local IPv4 link and current cache entries. Aging timers, gratuitous and proxy ARP, duplicate detection, security attacks, IPv6 Neighbor Discovery, and packet timing are excluded.

## Expanded lesson claims

The host chooses the IP next hop before ARP. A local destination resolves the destination host; a remote destination resolves the local gateway. Cache reuse is explained without claiming one universal timer.

Worked sequences name the selected next hop, ARP target, learned mapping, and resulting Ethernet destination separately.
