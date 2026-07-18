# Chapter 11 Technical Sources

## Primary references

- [ISO/IEC 7498-1: Open Systems Interconnection Basic Reference Model](https://www.iso.org/standard/20269.html) — the seven-layer OSI reference model.
- [RFC 1122: Requirements for Internet Hosts — Communication Layers](https://www.rfc-editor.org/rfc/rfc1122) — layered TCP/IP host requirements.
- [Cisco: OSI Model Reference Chart](https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13769-5.html) — practical OSI layer responsibilities and protocol mappings.

## Content boundaries

Layer mapping is a teaching model for responsibilities and troubleshooting. It is not presented as a literal animation of implementation steps. Detailed session/presentation protocols and application protocol operation are outside this chapter.

## Expanded lesson claims

- Every OSI layer receives a separate responsibility lesson with examples and an explicit non-responsibility boundary.
- Session and Presentation are described as reference-model responsibility groups; NetBite does not claim modern internet stacks always expose them as separate software modules.
- The TCP/IP bottom layer is labeled `Network Access / Link` to acknowledge common terminology variants while retaining RFC 1122’s Link-layer grouping.
- End-to-end examples classify each responsibility independently and do not present the OSI model as a literal timed processing machine.
