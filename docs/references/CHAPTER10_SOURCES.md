# Chapter 10 Technical Sources

## Primary references

- [IEEE 802.1Q Working Group](https://1.ieee802.org/tsn/802-1q/) — bridges and bridged networks with VLAN support.
- [Cisco: Configure VLANs and Trunks](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/15-0_2_se/configuration/guide/scg2960/swvlan.html) — access VLAN and 802.1Q trunk behavior.
- [Cisco: IEEE 802.1Q Frame Format](https://www.cisco.com/c/en/us/support/docs/lan-switching/8021q/17056-741-4.html) — four-byte tag placement, TPID `0x8100`, PCP, DEI/CFI, and the 12-bit VLAN identifier.

## Content boundaries

The chapter covers access-port membership, logical broadcast separation, allowed VLANs on a two-switch trunk, and the need for Layer 3 routing between VLANs. Native VLANs, DTP, VTP, STP, and routing configuration are deferred.

## Expanded lesson claims

VLAN purpose, broadcast-domain behavior, endpoint access membership, same-VLAN switching, the inter-VLAN routing boundary, 802.1Q identity, and allowed trunk paths are separate lessons.

Worked paths preserve VLAN identity across ingress access classification, trunk allowance, and egress membership.

The tag lesson shows the complete four-byte structure but keeps configuration focus on the VLAN identifier. PCP, DEI, native-VLAN behavior, and priority policy are not assessed beyond recognizing that they occupy fields in the tag.

The chapter practice uses the bounded command and state model in `CLI_SIMULATION_SOURCES.md`. Reachability is derived from access membership and matching allowed-VLAN state on both trunk endpoints; it does not model STP, negotiation, frame timing, or inter-VLAN routing.
