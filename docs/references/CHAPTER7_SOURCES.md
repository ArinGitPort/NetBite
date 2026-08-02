# Chapter 7 Technical Sources

## Primary references

- [RFC 826: An Ethernet Address Resolution Protocol](https://www.rfc-editor.org/rfc/rfc826) — IPv4 protocol-address to Ethernet-address resolution, requests, and replies.
- [IANA IEEE 802 Numbers](https://www.iana.org/assignments/ieee-802-numbers/ieee-802-numbers.xhtml) — EtherType `0x0806` identifies ARP.
- [Cisco: IP Addressing Services Configuration Guide — ARP](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_arp/configuration/15-mt/arp-15-mt-book.html) — ARP tables and operational behavior.

## Content boundaries

NetBite models one local IPv4 link and current cache entries. Aging timers, gratuitous and proxy ARP, duplicate detection, security attacks, IPv6 Neighbor Discovery, and packet timing are excluded.

## Expanded lesson claims

The host chooses the IP next hop before ARP. A local destination resolves the destination host; a remote destination resolves the local gateway. Cache reuse is explained without claiming one universal timer.

Worked sequences name the selected next hop, ARP target, learned mapping, and resulting Ethernet destination separately.

The request example distinguishes the outer Ethernet broadcast destination `FF:FF:FF:FF:FF:FF` from the ARP target-hardware field, which is unknown and has no useful target value in a normal request. The same broadcast MAC may appear as `FFFF.FFFF.FFFF` in Cisco-style output. The request carries the sender mapping and target IPv4; the owner normally replies directly and both sides can update mapping knowledge from sender fields.
