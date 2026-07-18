# Chapter 9 Technical Sources

## Primary references

- [RFC 1812: Requirements for IPv4 Routers](https://www.rfc-editor.org/rfc/rfc1812) — route selection and longest-prefix matching.
- [RFC 4632: CIDR Address Strategy](https://www.rfc-editor.org/rfc/rfc4632) — CIDR prefixes, longest match, and default routing.
- [Cisco: Configure a Next-Hop IP Address for Static Routes](https://www.cisco.com/c/en/us/support/docs/ip/static-routes/118263-technote-nexthop-00.html) — static-route next-hop behavior.

## Content boundaries

The fixed topology teaches connected, static, and default routes plus return paths. Dynamic protocols, metrics, administrative distance, recursive edge cases, and route redistribution are excluded.

## Expanded lesson claims

Route-table purpose, connected-route origin, entry fields, reachable static next hops, return routes, prefix-range matching, longest-prefix selection, and default fallback are taught independently. Learners first form the usable matching candidate set; longest-prefix selection operates only on that set.
