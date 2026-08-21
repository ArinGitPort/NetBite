# NetBite Curriculum

This is the canonical source for chapter order, lesson scope, practice alignment, quizzes, and flashcards. NetBite introduces concrete interactions before abstract models and teaches prerequisites before using their terminology.

NetBite now contains two distinct courses: 84 Foundation lessons across 12 chapters and 82 Network Operations lessons across 11 dependency-ordered modules.

Mechanism lessons follow a consistent beginner sequence: trigger → known information → transmitted fields → device decision → state or output → scope boundary. Exact values appear when they explain observable behavior, such as Ethernet EtherType, ARP broadcast addressing, ICMP Echo types, IPv4 TTL processing, or an 802.1Q VLAN identifier; exhaustive header memorization remains outside scope.

## Shared Quality Rules

- A lesson teaches one main idea in roughly 1–2 minutes using an opening explanation, one or two titled details, a concrete example, and one key idea.
- Multi-stage decisions use three to five numbered worked steps. Missing prerequisites receive another short lesson instead of being hidden in a dense example.
- Complex examples use learner-controlled guided stages with an always-available full-step view. Guided interaction reinforces reasoning but never blocks lesson completion.
- Chapters 4–6, 9, and 11 receive priority visual reasoning: prefix derivation, subnet boundaries, local-versus-gateway delivery, route match-before-selection, and responsibility-based model mapping.
- Full IPv4 addresses are shown until any abbreviated notation has been explicitly explained.
- Optional hints reveal one reasoning step at a time without selecting an answer, changing state, or applying a penalty.
- Difficult distinctions may include a retry-until-correct checkpoint. Checkpoints record no score or penalty.
- Terms are defined before they appear in assessment or review.
- Practice must reinforce an identified lesson skill rather than exist for decoration.
- Quizzes use scenario questions and 80 percent mastery. A lower result remains an attempt and never locks later content.
- Flashcards use question-first active recall. Learners answer before reveal, then choose `REVIEW AGAIN` to requeue an idea or `GOT IT` to mark it retrieved. Each deck maps its highest-value prompts to every lesson rather than repeating a passive glossary.
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
12. Inter-VLAN Routing

## Course 2 — Network Operations

Course 2 uses a plain-English teaching layer around exact networking vocabulary. Each of its 82 lessons introduces the problem, defines the important term, follows the device decision, works one complete example, states what the result proves, and ends with active recall. Its guided labs show and teach the setup before asking for configuration.

Course 2 is unlocked by completing Network Foundations or passing the 12-question prerequisite diagnostic at 10/12. Modules unlock in order. Each practical activity is a fixed-topology, configuration-driven mini-simulator backed by a pure deterministic engine. Valid mistakes remain editable, malformed input does not mutate state, hints accumulate, and every activity documents its simulation boundary. Module visibility also follows an explicit released/validation/coming-soon quality state.

| Module | Lessons | Guided simulation |
| --- | ---: | --- |
| 01 Transport and Application Endpoints | 8 | TCP/UDP endpoint and recovery desk |
| 02 DHCP | 7 | Pool, binding, exhaustion, and relay desk |
| 03 DNS | 7 | Recursive resolution, cache, and logical-TTL desk |
| 04 IPv4 Traffic Policy and ACLs | 8 | Ordered named-ACL match trace |
| 05 NAT and PAT | 8 | Translation creation and return matching |
| 06 IPv6 Addressing | 8 | Expansion, compression, scope, and interface validation |
| 07 IPv6 Local Delivery and Routing | 8 | NDP, router discovery, static route, and return-path trace |
| 08 Redundant Switching and STP | 8 | Root election, port roles, and topology recalculation |
| 09 EtherChannel | 6 | LACP compatibility and port-channel verification |
| 10 Dynamic Routing Foundations | 6 | Prefix, route source, AD, metric, and withdrawal decisions |
| 11 Single-Area OSPFv2 | 8 | Neighbor graph, topology state, SPF, and failure recovery |

Eight- and seven-lesson modules use eight scenario questions with 7/8 mastery. Six-lesson modules use seven questions with 6/7 mastery. Every deck contains 8–11 question-first active-recall cards. The two-part Operations capstone integrates an IPv4 small office and IPv6 branch; completion requires forward and return verification plus correction of injected faults.

Future expansion may cover DHCPv6, OSPFv3, wireless RF, QoS, advanced OSPF areas, BGP, production packet capture, and vendor hardware practice after the bounded operations sequence is proven.

## Chapter 1 — Introduction to Networks

Goal: recognize network purpose, endpoint and intermediary roles, and the physical shape of a small LAN.

Lessons: What Is a Computer Network?; Why Networks Exist; End and Intermediary Devices; PC, Switch, and Router Roles; Physical Links and Local Networks.

Practice: connect two PCs to the same switch. The optional message path is conceptual and does not model frames, addresses, or switching logic.

Assessment: six quiz questions, mastery 5/6. Eight active-recall cards cover network requirements and purpose, endpoint and intermediary roles, switch and router decisions, physical links, and LAN scope.

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

Practice: configure exactly four forward and return static routes through the NetBite CLI, inspect derived route/path state, and verify both PC1-to-PC3 directions.

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

## Chapter 12 — Inter-VLAN Routing

Goal: route between two intentionally separate VLAN networks using one router trunk and two logical gateway interfaces.

Lessons: Different VLANs Need a Layer 3 Crossing; Each VLAN Uses a Gateway in Its Own Subnet; One Router Link Can Serve Several VLANs; A Subinterface Terminates One VLAN Context; Routing Rebuilds the Ethernet Frame; Configure and Verify in a Reliable Order; Troubleshoot the First Broken Boundary.

Practice: configure an 802.1Q switch trunk and two router subinterfaces, verify both connected networks, and prove forwarding and return paths.

The lab keeps this topology map visible throughout configuration:

- PC1 `192.168.10.10/24`, gateway `192.168.10.1` -> SW1 `F0/1`, access VLAN 10.
- PC2 `192.168.20.20/24`, gateway `192.168.20.1` -> SW1 `F0/2`, access VLAN 20.
- R1 `G0/0` <-> SW1 `F0/24`, trunk carrying VLANs 10 and 20.

Assessment: eight quiz questions, mastery 7/8. Scope is router-on-a-stick only; Layer 3 switch SVIs, native-VLAN behavior, DTP, VTP, and STP remain excluded. Sources: `references/CHAPTER12_SOURCES.md`.
