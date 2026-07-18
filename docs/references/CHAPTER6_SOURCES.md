# Chapter 6 Technical Sources

## Primary references

- [RFC 1122: Requirements for Internet Hosts](https://www.rfc-editor.org/rfc/rfc1122) — host IP-layer behavior and gateway selection requirements.
- [RFC 1812: Requirements for IPv4 Routers](https://www.rfc-editor.org/rfc/rfc1812) — router forwarding and next-hop behavior.
- [Cisco: Configure a Default Gateway on Switches](https://www.cisco.com/c/en/us/support/docs/smb/switches/cisco-350-series-managed-switches/smb5657-configure-the-default-gateway-ip-address-on-a-switch.html) — gateway purpose and local reachability context.

## Content boundaries

The practice models local-prefix comparison and next-hop choice across two LANs. It does not model packet queues, frame timing, TTL processing, fragmentation, or router internals.

## Expanded lesson claims

Local-versus-remote comparison, direct next hop, default gateway, local gateway reachability, and link-layer frame replacement are taught separately. “Direct” refers to the IP next hop and can still include a Layer 2 switch.

Worked examples derive both network identities before choosing a next hop and distinguish changing Ethernet frames from stable IPv4 endpoints.
