# Chapter 5 Technical Sources

## Primary references

- [RFC 950: Internet Standard Subnetting Procedure](https://www.rfc-editor.org/rfc/rfc950) — subnet masks, subnet fields, and address boundaries.
- [RFC 1878: Variable Length Subnet Table for IPv4](https://www.rfc-editor.org/rfc/rfc1878) — `/24–/27` masks, total addresses, network starts, host ranges, and broadcast endpoints.
- [RFC 4632: CIDR Address Strategy](https://www.rfc-editor.org/rfc/rfc4632) — prefix notation and contiguous network prefixes.
- [Cisco: IP Addressing and Subnetting for New Users](https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13788-3.html) — worked subnet and host-range explanations.

## Content boundaries

Practice is deliberately limited to `/24` through `/27`, with the traditional network and broadcast endpoints reserved. VLSM, `/31`, `/32`, IPv6, and summarization are deferred.

## Expanded lesson claims

Prefix/mask equivalence, borrowed final-octet bits, host-bit counts, total address counts, block size, complete subnet maps, containing ranges, and reserved endpoints are taught in that dependency order. Primary examples use complete IPv4 addresses; shortened final-octet notation is never required. The repeatable workflow is a teaching method derived from the same prefix mathematics, not a separate protocol rule.
