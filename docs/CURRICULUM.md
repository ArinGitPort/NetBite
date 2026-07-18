# NetBite Curriculum

This is the canonical source for NetBite's chapter order and learning scope. NetBite introduces concrete interactions before abstract models. Each chapter adds one small mechanic and reuses concepts from earlier chapters.

## Learning Sequence

1. Networks and Connections - what a network is and why devices connect.
2. Ethernet - frames, NICs, media, ports, and physical link status.
3. Switching and MAC Addresses - MAC learning, forwarding, broadcasts, and unknown unicasts.
4. IPv4 Addressing - host and network identities.
5. Subnetting - deciding which addresses share a network.
6. Routers and Default Gateways - moving traffic between networks.
7. ARP - resolving a local IPv4 next hop to a MAC address.
8. ICMP and Ping - testing and explaining connectivity.
9. Static Routing - choosing paths across several networks.
10. VLANs - creating separate logical LANs on switches.
11. OSI and TCP/IP Models - organizing concepts the learner has already used.

Future expansion may cover DHCP, DNS, NAT, ACLs, and STP after the core sequence is proven.

## Shared Quality Rules

- Terms must be introduced in a lesson before they are assessed or reviewed.
- Practice must name the lesson skill it reinforces.
- A quiz score of at least 80 percent represents mastery. Lower scores remain recorded as attempts and do not lock content.
- Simplified animations and diagrams must identify their limitations.
- Technical sources and content decisions are recorded in `docs/references/`.

## Chapter 1 - Introduction to Networks

Goal: understand why devices form networks, recognize the basic roles of PCs, switches, and routers, and build a small LAN.

Lessons:

- What Is a Network?
- Why Networks Exist
- Meet the Devices
- Connecting Devices and LANs

Practice: connect two PCs to the same switch. The optional message-path animation is conceptual only; it does not model packets, frames, addressing, or switch forwarding.

Quiz: five questions with an 80 percent mastery target.

Flashcards: Computer Network, PC, Switch, Router, LAN.

Technical sources and claim notes: `docs/references/CHAPTER1_SOURCES.md`.

## Chapter 2 - Ethernet

Goal: understand how a physical Ethernet link carries structured data between network interfaces.

Lessons:

- Data Travels in Frames
- The Network Interface
- Choosing Ethernet Cables
- Ports and Link Status

Lesson 3 explicitly teaches the manual rule: PC/router-to-switch uses straight-through wiring, while switch-to-switch uses crossover wiring when auto-MDIX is unavailable. Its diagrams are conceptual transmit/receive paths, not connector pinouts.

Focused Lesson 3 practice: apply that same rule to PC-to-switch, router-to-switch, and switch-to-switch copper links in explicit legacy/manual mode. It is not presented as practice for every concept in the chapter.

Modern accuracy note: auto-MDIX commonly detects the required copper wiring automatically. The practice teaches the underlying manual rule without suggesting it is required on all current equipment.

Quiz: five questions with an 80 percent mastery target.

Flashcards: Ethernet, Ethernet Frame, NIC, Ethernet Port, Twisted-Pair Copper, Fiber-Optic, Auto-MDIX.

Scope boundary: Chapter 2 names source and destination addresses as frame fields, but detailed MAC addressing and switch forwarding belong to Chapter 3. It does not introduce IP addressing, subnetting, routing, or protocol simulation.

Technical sources and claim notes: `docs/references/CHAPTER2_SOURCES.md`.

## Chapter 3 - Switching and MAC Addresses

Goal: understand how a switch learns source MAC addresses and uses its table to forward or flood Ethernet frames.

Lessons:

- MAC Addresses Identify Interfaces
- How a Switch Learns
- Known and Unknown Unicast
- Broadcast Frames

Focused practice: operate a fixed three-port switch desk. Predict four forwarding decisions while the MAC table learns PC A, PC B, and PC C. Incorrect predictions do not alter the table.

Quiz: five scenario-based questions with an 80 percent mastery target.

Flashcards: MAC Address, MAC Address Table, Source Learning, Known Unicast, Unknown Unicast, Broadcast, Flooding.

Scope boundary: Chapter 3 does not teach IP addressing, ARP, VLANs, multicast, MAC aging, loops, STP, security attacks, or protocol timing.

Technical sources and claim notes: `docs/references/CHAPTER3_SOURCES.md`.

## Chapter 4 - IPv4 Addressing

Lessons: IPv4 Identifies Interfaces; Reading Dotted Decimal; Prefixes Mark the Network; Private Addresses and Valid Hosts.

Focused practice: configure a PC on a fixed `/24` and reject an invalid octet, duplicate address, and address from the wrong network.

Quiz: five scenario questions. Flashcards: IPv4 Address, Octet, Dotted Decimal, Prefix Length, Network Portion, Host Portion, Private IPv4.

Scope: static host configuration only; address assignment services, NAT, and IPv6 are deferred. Sources: `docs/references/CHAPTER4_SOURCES.md`.

## Chapter 5 - Subnetting

Lessons: Why Networks Are Subnetted; Masks and Prefix Lengths; Finding Subnet Boundaries; Network, Broadcast, and Usable Hosts.

Focused practice: calculate ordered `/24`, `/25`, `/26`, and `/27` ranges. Quiz: five scenario questions. Flashcards cover subnet, mask, block size, boundaries, ranges, and prefix size.

Scope: practical fixed-length subnet calculations only; VLSM, route summarization, `/31`, and `/32` host semantics are deferred. Sources: `docs/references/CHAPTER5_SOURCES.md`.

## Chapter 6 - Routers and Default Gateways

Lessons: Routers Join IP Networks; Local or Remote?; The Default Gateway; Forwarding Across a Router.

Focused practice: choose direct or gateway delivery across two fixed LANs and identify an off-subnet gateway. Quiz: five scenario questions. Flashcards cover router interfaces, delivery, gateway, next hop, and forwarding.

Scope: deterministic next-hop decisions, not packet timing or router implementation. Sources: `docs/references/CHAPTER6_SOURCES.md`.

## Chapter 7 - ARP

Lessons: Why ARP Is Needed; ARP Requests Ask the LAN; ARP Replies Build the Cache; Resolve the Next Hop.

Focused practice: resolve a local host, store and reuse its mapping, resolve a gateway for a remote destination, and reuse the gateway cache entry. Quiz: five scenario questions. Flashcards cover ARP requests, replies, cache, and next hops.

Scope: IPv4 ARP on one local link; timers, gratuitous ARP, duplicate detection, and attacks are deferred. Sources: `docs/references/CHAPTER7_SOURCES.md`.

## Chapter 8 - ICMP and Ping

Lessons: ICMP Reports IP Conditions; Echo Request and Echo Reply; What Ping Proves; Check One Layer at a Time.

Focused practice: diagnose known link, address, gateway, and success cases in dependency order. Quiz: five scenario questions. Flashcards cover ICMP, Echo, ping, round trips, checkpoints, and filtering.

Scope: diagnostic reasoning only; no live traffic, latency, loss, or claim that every ping failure has one cause. Sources: `docs/references/CHAPTER8_SOURCES.md`.

## Chapter 9 - Static Routing

Lessons: Connected and Remote Routes; Reading a Route Entry; Adding Static Routes; Longest Prefix and Default Route.

Focused practice: add four forward and return routes across a fixed three-router topology. Quiz: five scenario questions. Flashcards cover route sources, fields, longest match, and default routes.

Scope: static IPv4 routing; dynamic protocols, administrative distance, metrics, and route redistribution are deferred. Sources: `docs/references/CHAPTER9_SOURCES.md`.

## Chapter 10 - VLANs

Lessons: One Switch, Separate VLANs; Access Ports Join One VLAN; Same VLAN or Different VLAN?; Trunks Carry Multiple VLANs.

Focused practice: assign VLAN 10 access ports, configure a trunk carrying VLAN 10 and 20, and predict inter-VLAN reachability. Quiz: five scenario questions. Flashcards cover VLANs, access ports, trunks, 802.1Q, and routing boundaries.

Scope: access and trunk fundamentals; native VLANs, DTP, VTP, STP, and inter-VLAN router configuration are deferred. Sources: `docs/references/CHAPTER10_SOURCES.md`.

## Chapter 11 - OSI and TCP/IP Models

Lessons: Why Layered Models Exist; The Seven OSI Layers; The Four TCP/IP Layers; Map NetBite Concepts to Layers.

Focused practice: sort cables, Ethernet/MAC, IPv4/ICMP/routing, TCP/UDP, and application concepts. Quiz: five scenario questions. Flashcards include both models and every OSI layer name.

Scope: conceptual responsibility mapping, not a literal packet-processing animation. Sources: `docs/references/CHAPTER11_SOURCES.md`.
