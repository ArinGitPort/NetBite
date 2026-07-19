# NetBite Curriculum

This is the canonical source for chapter order, lesson scope, practice alignment, quizzes, and flashcards. NetBite introduces concrete interactions before abstract models and teaches prerequisites before using their terminology.

The current sequence contains 77 focused lessons across 11 chapters.

## Shared Quality Rules

- A lesson teaches one main idea in roughly 1–2 minutes using an opening explanation, one or two titled details, a concrete example, and one key idea.
- Multi-stage decisions use three to five numbered worked steps. Missing prerequisites receive another short lesson instead of being hidden in a dense example.
- Full IPv4 addresses are shown until any abbreviated notation has been explicitly explained.
- Optional hints reveal one reasoning step at a time without selecting an answer, changing state, or applying a penalty.
- Difficult distinctions may include a retry-until-correct checkpoint. Checkpoints record no score or penalty.
- Terms are defined before they appear in assessment or review.
- Practice must reinforce an identified lesson skill rather than exist for decoration.
- Quizzes use scenario questions and 80 percent mastery. A lower result remains an attempt and never locks later content.
- Simplified diagrams identify their limits and never claim to be live packet, timing, queue, or protocol simulations.
- Technical claims and scope boundaries are recorded in `docs/references/`.

## Learning Sequence

1. Networks and Connections
2. Ethernet
3. Switching and MAC Addresses
4. IPv4 Addressing
5. Subnetting
6. Routers and Default Gateways
7. ARP
8. ICMP and Ping
9. Static Routing
10. VLANs
11. OSI and TCP/IP Models

Future expansion may cover DHCP, DNS, NAT, ACLs, STP, and IPv6 after the core sequence is proven.

## Chapter 1 — Introduction to Networks

Goal: recognize network purpose, endpoint and intermediary roles, and the physical shape of a small LAN.

Lessons: What Is a Computer Network?; Why Networks Exist; End and Intermediary Devices; PC, Switch, and Router Roles; Physical Links and Local Networks.

Practice: connect two PCs to the same switch. The optional message path is conceptual and does not model frames, addresses, or switching logic.

Assessment: six quiz questions, mastery 5/6. Flashcards cover Network, End Device, Intermediary Device, PC, Switch, Router, and LAN.

Scope: no addressing, routing logic, protocol simulation, or configuration. Sources: `references/CHAPTER1_SOURCES.md`.

## Chapter 2 — Ethernet

Goal: understand how interfaces, frames, media, cabling roles, ports, and link state create a local Ethernet link.

Lessons: Ethernet Works Across Local Links; Data Travels in Frames; The Network Interface; Copper and Fiber Carry Signals; Straight-Through, Crossover, and Auto-MDIX; Ports, Link, and Activity.

Practice: apply the legacy/manual straight-through and crossover rule. Modern auto-MDIX is explained before practice, and diagrams are relationships rather than connector pinouts.

Assessment: seven quiz questions, mastery 6/7. Scope excludes detailed frame sizes, MAC switching logic, IP addressing, and real signal simulation. Sources: `references/CHAPTER2_SOURCES.md`.

## Chapter 3 — Switching and MAC Addresses

Goal: distinguish source and destination MAC roles, then predict source learning and forwarding behavior.

Lessons: MAC Addresses Identify Interfaces; Source and Destination Have Different Jobs; How a Switch Learns; Known Unicast Uses One Learned Port; Unknown Unicast Must Be Flooded; Broadcast Frames Intentionally Reach the LAN.

Practice: predict four deterministic decisions on a fixed three-port switch desk. Incorrect predictions never mutate the table.

Assessment: seven quiz questions, mastery 6/7. Scope excludes multicast, aging timers, loops, STP, spoofing, and packet timing. Sources: `references/CHAPTER3_SOURCES.md`.

## Chapter 4 — IPv4 Addressing

Goal: understand bits and octets before using prefixes to identify a network and configure a valid host.

Lessons: IPv4 and MAC Identities Have Different Scope; Read Four Dotted-Decimal Octets; Bits Build an Octet; Every Address Has Network and Host Portions; A Prefix Counts Leading Network Bits; Private IPv4 Has Three Defined Ranges; A Valid Host Setting Needs a Usable Identity.

Practice: configure a fixed `/24` host and reject invalid, duplicate, reserved, and off-network settings.

Assessment: eight quiz questions, mastery 7/8. Scope excludes IPv6, DHCP, NAT, public allocation policy, and complex binary conversion. Sources: `references/CHAPTER4_SOURCES.md`.

## Chapter 5 — Subnetting

Goal: calculate practical `/24–/27` ranges with one repeatable method.

Lessons: Why Networks Are Subnetted; Masks and Prefixes Describe One Boundary; Borrowed Bits Create Smaller Blocks; Host Bits Determine Address Count; Block Size Separates Network Starts; Build a Complete Subnet Map; Find Which Subnet Contains a Host; Mark Network, Usable, and Broadcast Addresses; Use One Repeatable Subnet Method.

Practice: solve ordered `/24`, `/25`, `/26`, and `/27` ranges using full IPv4 addresses and optional progressive hints.

Assessment: eight quiz questions, mastery 7/8. Scope excludes VLSM, summarization, `/31`, and `/32` semantics. Sources: `references/CHAPTER5_SOURCES.md`.

## Chapter 6 — Routers and Default Gateways

Goal: compare network identities, choose direct or gateway delivery, and understand link-layer replacement across a router.

Lessons: Routers Join Separately Addressed Networks; Compare Prefixes Before Choosing a Path; Local Destinations Are Delivered Directly; Remote Destinations Use the Default Gateway; A Gateway Must Be Locally Reachable; Routers Replace Link-Layer Frames.

Practice: decide direct, gateway, return, and invalid-gateway cases across two fixed LANs.

Assessment: seven quiz questions, mastery 6/7. Scope is deterministic next-hop reasoning rather than real packet processing. Sources: `references/CHAPTER6_SOURCES.md`.

## Chapter 7 — ARP

Goal: resolve the selected local IPv4 next hop into an Ethernet destination MAC.

Lessons: Why IPv4 Needs a Local MAC Mapping; An ARP Request Asks the Broadcast Domain; The Owner Returns an ARP Reply; The ARP Cache Avoids Repeated Discovery; Resolve a Local Destination Itself; Resolve the Gateway for Remote Traffic.

Practice: process local resolution, cache reuse, gateway resolution, and gateway cache reuse.

Assessment: seven quiz questions, mastery 6/7. Scope is IPv4 ARP on one local link; timers, gratuitous ARP, duplicate detection, and attacks are deferred. Sources: `references/CHAPTER7_SOURCES.md`.

## Chapter 8 — ICMP and Ping

Goal: interpret Echo evidence without turning one outcome into an unsupported diagnosis.

Lessons: ICMP Carries IP Control Information; Echo Uses a Request and Reply; Read a Result Before Explaining It; A Successful Ping Proves Something Limited; A Failed Ping Does Not Name One Cause; Check Dependencies from Near to Far.

Practice: use the NetBite CLI to run required evidence commands across four isolated scenarios, then identify the first known failed link, wrong network, missing route, or limited meaning of a successful Echo round trip.

Assessment: seven quiz questions, mastery 6/7. Scope excludes live latency, loss simulation, and detailed ICMP message coverage. Sources: `references/CHAPTER8_SOURCES.md`.

## Chapter 9 — Static Routing

Goal: read route instructions and select connected, static, most-specific, and default paths in both directions.

Lessons: A Route Table Answers Where to Send IP Traffic; Active Interfaces Create Connected Routes; Read a Route Entry as One Instruction; A Static Route Names an Administrator-Chosen Path; Communication Needs Forward and Return Routes; First Decide Which Routes Match; The Longest Matching Prefix Wins; A Default Route Is the Least-Specific Fallback.

Practice: configure exactly four forward and return static routes through the NetBite CLI, inspect derived route/path state, and verify both PC-A-to-PC-C directions.

Assessment: eight quiz questions, mastery 7/8. Scope excludes dynamic routing protocols, metrics, administrative distance, and convergence. Sources: `references/CHAPTER9_SOURCES.md`.

## Chapter 10 — VLANs

Goal: understand logical broadcast separation, endpoint membership, 802.1Q identity, and allowed trunk paths.

Lessons: VLANs Create Logical Local Networks; Each VLAN Is a Broadcast Domain; An Access Port Joins One Endpoint VLAN; Same-VLAN Traffic Can Stay at Layer 2; Different VLANs Require Layer 3 Forwarding; An 802.1Q Tag Identifies VLAN Traffic; A Trunk Carries Allowed VLANs Between Switches.

Practice: create VLAN 10 and 20 through the NetBite CLI, assign access ports, allow both VLANs on both trunk endpoints, inspect derived port state, and predict reachability.

Assessment: eight quiz questions, mastery 7/8. Scope excludes native-VLAN details, DTP, VTP, STP, and inter-VLAN router configuration. Sources: `references/CHAPTER10_SOURCES.md`.

## Chapter 11 — OSI and TCP/IP Models

Goal: understand every OSI layer’s responsibility and map familiar concepts into the four-layer TCP/IP view.

Lessons: Why Layered Models Exist; Read the Seven-Layer OSI Stack; Layer 1 Physical; Layer 2 Data Link; Layer 3 Network; Layer 4 Transport; Layer 5 Session; Layer 6 Presentation; Layer 7 Application; TCP/IP Groups Responsibilities into Four Layers; Map Responsibilities, Not Just Layer Numbers.

Practice: classify media, Ethernet/MAC, IPv4/ICMP/routing, TCP/UDP, and application concepts.

Assessment: eight quiz questions, mastery 7/8. The models classify responsibilities and do not represent a literal implementation sequence. Sources: `references/CHAPTER11_SOURCES.md`.
