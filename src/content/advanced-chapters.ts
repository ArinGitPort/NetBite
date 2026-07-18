import type { ChapterDefinition, Flashcard, LessonIllustration, QuizQuestion } from '@/content/types';

type LessonSeed = [id: string, title: string, body: string, takeaway: string, illustration: LessonIllustration];
type QuestionSeed = [lesson: number, prompt: string, answers: string[], correct: number, explanation: string];

function chapter(input: {
  id: number; title: string; summary: string; lessons: LessonSeed[]; questions: QuestionSeed[];
  cards: [string, string, string][]; lab: [string, string, string]; recap: [string, string, string];
}): ChapterDefinition {
  const lessons = input.lessons.map(([id, title, body, takeaway, illustration], index) => ({
    id, chapterId: String(input.id), order: index + 1, eyebrow: `Lesson ${index + 1} of 4`, title, body, takeaway, illustration,
  }));
  const quiz: QuizQuestion[] = input.questions.map(([lesson, prompt, answers, correctAnswerIndex, explanation], index) => ({
    id: `ch${input.id}-q${index + 1}`, lessonId: lessons[lesson].id, prompt, answers, correctAnswerIndex, explanation,
  }));
  const flashcards: Flashcard[] = input.cards.map(([term, definition, example], index) => ({
    id: `ch${input.id}-card-${index + 1}`, term, definition, example,
  }));
  return {
    id: String(input.id), numberLabel: String(input.id).padStart(2, '0'), title: input.title, summary: input.summary,
    lessons, quiz, flashcards,
    lab: { id: input.lab[0], title: input.lab[1], detail: input.lab[2] },
    recap: { built: input.recap[0], learned: input.recap[1], next: input.recap[2] },
  };
}

export const chapterFour = chapter({
  id: 4,
  title: 'IPv4 Addressing',
  summary: 'Read IPv4 addresses, separate network and host identity, and configure a valid host.',
  lessons: [
    ['ipv4-identifies-interfaces', 'IPv4 identifies interfaces', 'An IPv4 address gives a network interface a logical identity. Unlike a MAC address used on one local Ethernet link, IPv4 addressing helps devices and routers deliver data across connected networks.', 'IPv4 identifies an interface and locates it within an IP network.', 'ipv4-address'],
    ['reading-dotted-decimal', 'Reading dotted decimal', 'IPv4 contains 32 bits grouped into four 8-bit octets. Dotted decimal writes each octet as a value from 0 through 255, such as 192.168.10.25.', 'A valid IPv4 address has exactly four decimal octets, each from 0 to 255.', 'ipv4-octets'],
    ['prefixes-mark-network', 'Prefixes mark the network', 'A prefix length states how many leading bits identify the network. In 192.168.10.25/24, the first 24 bits identify 192.168.10.0 and the remaining bits identify the host interface.', 'Hosts compare the prefix-defined network portion to decide whether a destination is local.', 'ipv4-prefix'],
    ['private-valid-hosts', 'Private addresses and valid hosts', 'Private IPv4 ranges are intended for internal networks. A valid host setting uses a usable address, the correct prefix, no duplicate address, and a gateway on the local subnet when remote access is needed.', 'A host address must be unique, usable, and paired with the correct local prefix and gateway.', 'private-ipv4'],
  ],
  questions: [
    [0, 'Which identity helps routers deliver data between IP networks?', ['IPv4 address', 'Cable label', 'Switch port number'], 0, 'IPv4 supplies the logical network identity used for routed delivery.'],
    [1, 'A technician enters 192.168.10.300. What is wrong?', ['An octet exceeds 255', 'The address needs five octets', 'Private addresses cannot start with 192'], 0, 'Each IPv4 octet must be between 0 and 255.'],
    [2, 'In 192.168.10.25/24, which value is the network identity?', ['192.168.10.0', '192.168.10.25', '192.168.10.255'], 0, 'With /24, the final octet is the host portion and the network begins at .0.'],
    [3, 'PC B is assigned the same IPv4 address as PC A. What should you do?', ['Choose a unique usable address', 'Keep both because their MAC addresses differ', 'Change only the PC name'], 0, 'Two interfaces on one network must not use the same IPv4 address.'],
    [3, 'A /24 host uses 192.168.10.255. Why is this invalid?', ['It is the subnet broadcast address', 'It is always a router address', 'It is outside private space'], 0, 'The last address in this /24 is reserved for subnet broadcast.'],
  ],
  cards: [
    ['IPv4 Address', 'A 32-bit logical address assigned to a network interface.', '192.168.10.25'],
    ['Octet', 'One 8-bit part of an IPv4 address, shown from 0 to 255.', 'The 168 in 192.168.10.25'],
    ['Dotted Decimal', 'Four decimal octets separated by dots.', '10.0.0.8'],
    ['Prefix Length', 'The count of leading network bits.', '/24 means 24 network bits.'],
    ['Network Portion', 'The prefix-defined part shared by one subnet.', '192.168.10 in a /24.'],
    ['Host Portion', 'The remaining bits that identify an interface in the subnet.', '25 in 192.168.10.25/24.'],
    ['Private IPv4', 'Address space reserved for private internal networks.', '192.168.0.0/16 is private space.'],
  ],
  lab: ['ipv4-configurator', 'Configure a /24 host', 'Reject invalid, duplicate, and off-network settings'],
  recap: ['A valid PC IPv4 configuration', 'Octets, prefixes, private space, and host rules', 'How prefixes divide one network into smaller subnets'],
});

export const chapterFive = chapter({
  id: 5, title: 'Subnetting', summary: 'Find subnet boundaries and usable host ranges for practical /24 through /27 networks.',
  lessons: [
    ['why-subnet', 'Why networks are subnetted', 'Subnetting divides a larger address block into smaller network boundaries. It limits each local broadcast domain, organizes address use, and gives routers distinct networks to connect.', 'A subnet is a deliberately smaller IP network with its own boundary.', 'subnet-purpose'],
    ['masks-prefixes', 'Masks and prefix lengths', 'The subnet mask and prefix length describe the same network boundary. /24, /25, /26, and /27 leave 8, 7, 6, and 5 host bits, producing blocks of 256, 128, 64, and 32 addresses.', 'A longer prefix creates smaller address blocks.', 'subnet-mask'],
    ['finding-boundaries', 'Finding subnet boundaries', 'A subnet begins at a multiple of its block size in the changing octet. A /26 has 64-address blocks beginning at 0, 64, 128, and 192.', 'Use block size to locate the network boundary containing an address.', 'subnet-boundaries'],
    ['network-broadcast-hosts', 'Network, broadcast, and usable hosts', 'The first address identifies the subnet and the last is its broadcast address. In these beginner subnets, usable host addresses fall between those two reserved endpoints.', 'Do not assign the network or broadcast address to a host.', 'subnet-range'],
  ],
  questions: [
    [0, 'Why would an administrator split a /24 into smaller networks?', ['To create separate address and broadcast boundaries', 'To remove every router', 'To make MAC addresses shorter'], 0, 'Subnetting creates smaller routed network boundaries.'],
    [1, 'How many total addresses are in a /26 block?', ['64', '26', '192'], 0, 'Six remaining host bits produce 2^6, or 64, addresses.'],
    [2, 'Which /27 network contains 192.168.10.70?', ['192.168.10.64/27', '192.168.10.70/27', '192.168.10.32/27'], 0, '/27 boundaries advance by 32; 70 falls in 64 through 95.'],
    [3, 'What is the broadcast address for 192.168.10.128/25?', ['192.168.10.255', '192.168.10.254', '192.168.10.128'], 0, 'The last address in the 128–255 block is .255.'],
    [3, 'Which address is usable in 192.168.10.160/27?', ['192.168.10.190', '192.168.10.160', '192.168.10.191'], 0, '.160 is the network and .191 is broadcast, leaving .161 through .190 usable.'],
  ],
  cards: [
    ['Subnet', 'A smaller IP network created from a larger address block.', '192.168.10.0/25'], ['Subnet Mask', 'A dotted-decimal form of the network boundary.', '255.255.255.192 equals /26.'], ['Block Size', 'The number of addresses in each subnet interval.', '/27 advances by 32.'], ['Network Address', 'The first address that identifies a subnet.', '192.168.10.64/26'], ['Broadcast Address', 'The final address used to reach the whole subnet.', '192.168.10.127 for the .64/26 subnet.'], ['Usable Range', 'Host addresses between network and broadcast.', '.65 through .126 in .64/26.'], ['Longer Prefix', 'More network bits and fewer host addresses.', '/27 is smaller than /24.'],
  ],
  lab: ['subnet-range-desk', 'Calculate subnet ranges', 'Solve ordered /24, /25, /26, and /27 scenarios'],
  recap: ['Four correct subnet ranges', 'Block sizes, boundaries, reserved addresses, and usable hosts', 'How hosts choose direct delivery or a router'],
});

export const chapterSix = chapter({
  id: 6, title: 'Routers and Default Gateways', summary: 'Choose direct or gateway delivery and follow a packet across two fixed LANs.',
  lessons: [
    ['router-interfaces', 'Routers join IP networks', 'A router has an interface in each network it connects. Each interface uses an address from its attached subnet and becomes a reachable next hop for hosts on that LAN.', 'A router forwards between networks through separately addressed interfaces.', 'router-interfaces'],
    ['local-or-remote', 'Local or remote?', 'A host applies its own prefix to compare its network with the destination network. A local destination is reached directly; a remote destination must be sent to a router.', 'The prefix comparison determines direct delivery or gateway delivery.', 'local-remote'],
    ['valid-default-gateway', 'The default gateway', 'A default gateway is the router address a host uses when no more specific local path exists. That gateway must itself be a usable address on the host’s local subnet.', 'An off-subnet gateway cannot be reached directly and is invalid for the host.', 'default-gateway'],
    ['forwarding-router', 'Forwarding across a router', 'For a remote destination, the host sends the local Ethernet frame to the gateway. The router removes that local frame, chooses an outgoing network, and creates the next link-layer delivery.', 'IP endpoints remain the same while each Ethernet link uses its own local delivery.', 'routed-frame'],
  ],
  questions: [
    [0, 'A router connects 192.168.10.0/24 and 192.168.20.0/24. What does it need?', ['One interface in each subnet', 'One MAC address shared by every host', 'A crossover cable rule only'], 0, 'Each attached IP network needs a router interface in that subnet.'],
    [1, '192.168.10.10/24 sends to 192.168.10.20. Which delivery is used?', ['Direct local delivery', 'Default gateway delivery', 'Internet default route only'], 0, 'Both addresses share the 192.168.10.0/24 network.'],
    [1, '192.168.10.10/24 sends to 192.168.20.10. What is required?', ['A local default gateway', 'A duplicate host address', 'A switch MAC table reset'], 0, 'The destination is remote, so the host sends toward its router.'],
    [2, 'Which gateway is valid for 192.168.10.10/24?', ['192.168.10.1', '192.168.20.1', '192.168.10.255'], 0, 'The gateway must be usable and within 192.168.10.0/24.'],
    [3, 'What changes when a router forwards an IP packet to the next LAN?', ['The local Ethernet delivery', 'The original IP destination', 'The sender’s subnet mask inside the packet'], 0, 'A new link-layer frame is used on the outgoing link while IP endpoints remain.'],
  ],
  cards: [
    ['Router Interface', 'A router connection addressed within an attached IP network.', '192.168.10.1/24 on LAN A.'], ['Local Destination', 'A destination sharing the source host’s subnet.', '192.168.10.20 from 192.168.10.10/24.'], ['Remote Destination', 'A destination outside the source host’s subnet.', '192.168.20.10 from LAN A.'], ['Default Gateway', 'The local router next hop used for remote networks.', '192.168.10.1'], ['Direct Delivery', 'Sending to a host on the same subnet.', 'PC A delivers directly to PC B.'], ['Next Hop', 'The next device chosen along a routed path.', 'The local gateway is the host’s next hop.'], ['Forwarding', 'Moving an IP packet toward a selected outgoing network.', 'The router sends from LAN A to LAN B.'],
  ],
  lab: ['gateway-forwarding-desk', 'Choose the next hop', 'Decide direct, gateway, and invalid delivery cases'],
  recap: ['A two-LAN forwarding plan', 'Router interfaces, subnet comparison, and valid gateways', 'How ARP discovers the MAC address of a local next hop'],
});

export const chapterSeven = chapter({
  id: 7, title: 'ARP', summary: 'Resolve a local next-hop IPv4 address to its Ethernet MAC address.',
  lessons: [
    ['arp-ip-to-mac', 'Why ARP is needed', 'A host may know the next-hop IPv4 address but Ethernet delivery still needs a destination MAC address. Address Resolution Protocol, or ARP, resolves an IPv4 address on the local link to a MAC address.', 'ARP supplies the local MAC address needed for the next Ethernet delivery.', 'arp-mapping'],
    ['arp-broadcast-request', 'ARP requests ask the LAN', 'When no cache entry exists, the sender broadcasts an ARP request asking which local interface owns the target IPv4 address. Every interface can inspect the request, but only the owner should answer.', 'An ARP request is broadcast because the target MAC is not known yet.', 'arp-request'],
    ['arp-reply-cache', 'ARP replies build the cache', 'The owner returns its mapping in an ARP reply, normally as a unicast to the requester. The requester records the IPv4-to-MAC mapping in its ARP cache for later local delivery.', 'A learned ARP cache entry can avoid repeating the immediate request.', 'arp-reply'],
    ['arp-local-gateway', 'Resolve the next hop', 'For a local destination, the next hop is that destination. For a remote destination, the next hop is the default gateway, so the sender resolves the gateway’s MAC—not the remote host’s MAC.', 'ARP resolves a reachable local next hop, never an arbitrary remote interface.', 'arp-next-hop'],
  ],
  questions: [
    [0, 'PC A knows PC B’s local IPv4 address but not its MAC. What does it need?', ['ARP resolution', 'A static route to itself', 'A new subnet mask'], 0, 'ARP maps the local next-hop IPv4 address to a MAC address.'],
    [1, 'Why is an initial ARP request broadcast?', ['The target MAC is not known', 'All ARP replies must be broadcast', 'Routers learn from destination MACs'], 0, 'Broadcast lets the unknown owner see the question.'],
    [2, 'A valid mapping is already in the ARP cache. What can the sender do?', ['Use the cached MAC', 'Flood every IP packet forever', 'Change the destination IPv4 address'], 0, 'The cache supplies the mapping for immediate local Ethernet delivery.'],
    [3, 'PC A sends to a remote subnet. Which IPv4 address does it resolve with ARP?', ['Its local gateway', 'The remote PC directly', 'Every router on the path'], 0, 'The host can resolve only its locally reachable next hop: the gateway.'],
    [2, 'Who normally answers an ARP request for 192.168.10.20?', ['The local interface owning 192.168.10.20', 'Every switch port', 'A random remote router'], 0, 'The owner of the queried local IPv4 address returns its mapping.'],
  ],
  cards: [
    ['ARP', 'A protocol that resolves a local IPv4 next hop to a MAC address.', 'Resolve 192.168.10.1 before sending to the gateway.'], ['ARP Request', 'A broadcast question asking who owns a local IPv4 address.', 'Who has 192.168.10.20?'], ['ARP Reply', 'A response containing the owner’s IPv4-to-MAC mapping.', '192.168.10.20 is at 02:…:0B.'], ['ARP Cache', 'Temporarily stored IPv4-to-MAC mappings.', 'Reuse the gateway mapping.'], ['Local Next Hop', 'The directly reachable interface used for the next link.', 'A local host or default gateway.'], ['Gateway Resolution', 'Resolving the gateway rather than a remote final host.', 'Remote packet, local gateway MAC.'], ['Broadcast Request', 'A request delivered throughout the local LAN.', 'The unknown owner can hear it.'],
  ],
  lab: ['arp-resolution-desk', 'Resolve the next hop', 'Process local, cached, and gateway ARP decisions'],
  recap: ['A reusable ARP cache', 'Requests, replies, caching, and next-hop resolution', 'How ICMP Echo checks IP reachability'],
});

export const chapterEight = chapter({
  id: 8, title: 'ICMP and Ping', summary: 'Understand Echo exchange and troubleshoot reachability one checkpoint at a time.',
  lessons: [
    ['icmp-role', 'ICMP reports IP conditions', 'Internet Control Message Protocol carries control and error information related to IP delivery. It supports diagnostics, but an ICMP message is not an application data session and does not repair a path.', 'ICMP reports network-layer conditions and supports diagnostic checks.', 'icmp-role'],
    ['echo-request-reply', 'Echo Request and Echo Reply', 'Ping commonly sends an ICMP Echo Request to a destination and waits for an Echo Reply. A reply demonstrates that this test completed a round trip at that moment.', 'Echo Request asks for a response; Echo Reply confirms a returned response.', 'echo-exchange'],
    ['ping-proves-limits', 'What ping does and does not prove', 'A successful ping supports end-to-end IP reachability. A failed ping alone does not identify one certain fault: links, addressing, gateways, remote paths, the destination, or filtering may be involved.', 'Use ping as evidence, not as a complete diagnosis.', 'ping-boundary'],
    ['checkpoint-troubleshooting', 'Check one layer at a time', 'Begin with the local link, then verify the host address and prefix, then the gateway for remote destinations. Only after those checks should you investigate the remote path, destination, or filtering.', 'Troubleshooting becomes clearer when checks follow the dependency path.', 'diagnostic-path'],
  ],
  questions: [
    [0, 'What is ICMP mainly used for in this chapter?', ['IP control information and diagnostics', 'Assigning switch VLANs', 'Encrypting application data'], 0, 'ICMP supports network-layer reporting and diagnostics.'],
    [1, 'An Echo Reply returns to the sender. What does that show?', ['Round-trip IP reachability for that test', 'Every application port is open', 'The network can never fail later'], 0, 'The reply proves this Echo exchange completed, not every possible service.'],
    [2, 'A ping fails. What can you conclude immediately?', ['More checks are needed', 'The cable is definitely broken', 'The destination definitely has no IPv4 address'], 0, 'Many different conditions can prevent an Echo Reply.'],
    [3, 'A PC has no link indicator. What should be checked first?', ['The local physical/link connection', 'A remote static route', 'The application password'], 0, 'Higher-layer checks depend on a working local link.'],
    [3, 'Local pings work, but a remote ping fails and the gateway is off-subnet. What should be corrected?', ['The default gateway', 'The remote PC’s MAC on the local host', 'The Ethernet type field'], 0, 'Remote delivery requires a reachable local gateway.'],
  ],
  cards: [
    ['ICMP', 'IP control and error-reporting messages used by network tools.', 'Echo messages support ping.'], ['Echo Request', 'An ICMP request asking a destination to reply.', 'The first half of a ping exchange.'], ['Echo Reply', 'The response to an ICMP Echo Request.', 'Evidence of a completed round trip.'], ['Ping', 'A tool that tests IP reachability using Echo messages.', 'Ping the default gateway.'], ['Round Trip', 'Travel to a destination and back to the sender.', 'Request out, reply back.'], ['Checkpoint', 'One dependency verified during troubleshooting.', 'Check link before gateway.'], ['Filtering', 'A policy may block ICMP even when some other traffic works.', 'A failed ping is not one-cause proof.'],
  ],
  lab: ['ping-diagnostic-desk', 'Diagnose the ping path', 'Check link, addressing, gateway, and end-to-end success'],
  recap: ['A checkpoint-based diagnosis', 'ICMP Echo, ping evidence, and troubleshooting order', 'How routers choose connected, static, and default routes'],
});

export const chapterNine = chapter({
  id: 9, title: 'Static Routing', summary: 'Read route entries, add fixed remote paths, and choose the longest matching prefix.',
  lessons: [
    ['connected-remote-routes', 'Connected and remote routes', 'A router knows networks attached directly to its interfaces as connected routes. Reaching any other network requires a learned or configured route that identifies where to send the packet next.', 'Connected routes come from active interfaces; remote routes need another path.', 'connected-routes'],
    ['reading-route-entry', 'Reading a route entry', 'A route entry identifies a destination prefix, its prefix length, a next hop when required, and an outgoing interface. Together these fields describe which destinations match and where matching packets leave.', 'Read destination, prefix, next hop, and exit interface as one forwarding instruction.', 'route-entry'],
    ['adding-static-routes', 'Adding static routes', 'A static route is configured by an administrator. Multi-router communication needs a forward path and a return path; a correct outward route alone cannot guarantee that replies know how to return.', 'Verify bidirectional routing, not only the first direction.', 'static-route'],
    ['longest-prefix-default', 'Longest prefix and default route', 'A router compares the destination against its route table and chooses the matching route with the longest prefix. A default route, 0.0.0.0/0, matches when no more specific entry exists.', 'Most-specific matching wins; the default is the least-specific fallback.', 'longest-prefix'],
  ],
  questions: [
    [0, 'How does a router normally learn a directly attached active subnet?', ['As a connected route', 'From an ARP broadcast across the internet', 'From a VLAN name'], 0, 'An addressed active interface creates knowledge of its connected network.'],
    [1, 'Which route field states the network to match?', ['Destination prefix', 'Router hostname', 'Cable category'], 0, 'The destination and prefix length define the matching address range.'],
    [2, 'Traffic reaches LAN C, but replies cannot return to LAN A. What is likely missing?', ['A return route', 'A longer Ethernet cable', 'A duplicate default gateway'], 0, 'Communication needs a valid path in both directions.'],
    [3, 'Routes /8, /16, and /24 all match a destination. Which is selected?', ['The /24 route', 'The /8 route', 'All three at once'], 0, 'The longest prefix is the most specific match.'],
    [3, 'When is 0.0.0.0/0 selected?', ['When no more specific route matches', 'Before every connected route', 'Only for local Ethernet delivery'], 0, 'The default route is the least-specific fallback.'],
  ],
  cards: [
    ['Connected Route', 'A route to a network attached to an active router interface.', 'LAN A on the router’s Ethernet interface.'], ['Remote Route', 'A route to a network not directly attached.', 'LAN C reached through Router B.'], ['Static Route', 'A route entered by an administrator.', 'Send 192.168.30.0/24 to 10.0.12.2.'], ['Destination Prefix', 'The address range a route matches.', '192.168.30.0/24'], ['Next Hop', 'The neighboring router that receives a forwarded packet.', '10.0.12.2'], ['Exit Interface', 'The interface used to leave the router.', 'Port toward Router B.'], ['Longest Prefix', 'The most specific matching route wins.', '/24 wins over /16.'], ['Default Route', 'The /0 fallback used when nothing more specific matches.', '0.0.0.0/0'],
  ],
  lab: ['static-route-board', 'Complete the route board', 'Add four routes and verify forward and return paths'],
  recap: ['A bidirectional three-router path', 'Route fields, static routes, return paths, and longest match', 'How VLANs create separate logical LANs on switches'],
});

export const chapterTen = chapter({
  id: 10, title: 'VLANs', summary: 'Separate logical LANs with access ports and carry them between switches on a trunk.',
  lessons: [
    ['logical-vlan-separation', 'One switch, separate VLANs', 'A virtual LAN creates a logical Layer 2 broadcast domain. Ports in different VLANs act as members of separate LANs even when they belong to the same physical switch.', 'A VLAN separates Ethernet broadcast domains logically.', 'vlan-segments'],
    ['access-ports', 'Access ports join one VLAN', 'An access port is assigned to one VLAN for an attached endpoint. Frames from that endpoint are associated with the port’s VLAN as the switch processes and forwards them.', 'An endpoint access port belongs to one configured VLAN.', 'access-port'],
    ['same-different-vlan', 'Same VLAN or different VLAN?', 'Endpoints in the same VLAN can communicate through Layer 2 switching when a valid path exists. Endpoints in different VLANs need Layer 3 routing; a switch does not merge the VLANs automatically.', 'Different VLANs require routing to communicate.', 'vlan-reachability'],
    ['dot1q-trunks', 'Trunks carry multiple VLANs', 'An IEEE 802.1Q trunk can carry traffic for multiple VLANs between switches. Both ends must provide a consistent trunk path and allow the VLAN that needs to cross it.', 'A trunk extends allowed VLANs across a shared inter-switch link.', 'vlan-trunk'],
  ],
  questions: [
    [0, 'PC A and PC B use different VLANs on one switch. What is separated?', ['Their Layer 2 broadcast domains', 'Their physical power supply', 'Every router interface worldwide'], 0, 'Each VLAN forms a separate logical LAN and broadcast domain.'],
    [1, 'A user PC connects to a switch port assigned only to VLAN 10. What kind of port is this?', ['Access port', 'Default route', 'ARP cache'], 0, 'An access port associates the endpoint with one VLAN.'],
    [2, 'Two PCs are in VLAN 20 on the same switch. What can switch them directly?', ['A Layer 2 path in VLAN 20', 'A route between different VLANs', 'A /0 route on each PC'], 0, 'Same-VLAN endpoints can use switching when their Layer 2 path is valid.'],
    [2, 'PC A is in VLAN 10 and PC B is in VLAN 20. What is needed for communication?', ['Layer 3 routing', 'Only a larger MAC table', 'The same access port'], 0, 'Communication between distinct VLAN networks requires routing.'],
    [3, 'VLAN 20 works locally on both switches but not across their trunk. What should be checked?', ['Whether the trunk allows VLAN 20', 'Whether VLAN 10 has more PCs', 'Whether ARP uses dotted decimal'], 0, 'The inter-switch trunk must carry the VLAN.'],
  ],
  cards: [
    ['VLAN', 'A logical Layer 2 broadcast domain.', 'VLAN 10 for one group.'], ['Broadcast Domain', 'The set of interfaces reached by a Layer 2 broadcast.', 'Each VLAN has its own domain.'], ['Access Port', 'A switch port assigned to one endpoint VLAN.', 'PC A port in VLAN 10.'], ['Same-VLAN Traffic', 'Layer 2 communication inside one VLAN.', 'VLAN 20 PC to VLAN 20 PC.'], ['Inter-VLAN Routing', 'Layer 3 forwarding between different VLANs.', 'VLAN 10 to VLAN 20.'], ['802.1Q', 'The standard method used to identify VLAN traffic on a trunk.', 'VLAN-tagged inter-switch traffic.'], ['Trunk', 'A link that carries multiple allowed VLANs.', 'Switch A to Switch B.'], ['Allowed VLAN', 'A VLAN permitted to cross a trunk.', 'Allow VLANs 10 and 20.'],
  ],
  lab: ['vlan-port-desk', 'Configure VLAN paths', 'Assign access ports, enable a trunk, and predict reachability'],
  recap: ['Two VLANs across two switches', 'Broadcast separation, access ports, routing boundaries, and trunks', 'How OSI and TCP/IP models organize every concept learned so far'],
});

export const chapterEleven = chapter({
  id: 11, title: 'OSI and TCP/IP Models', summary: 'Organize NetBite concepts into layered models for clearer design and troubleshooting.',
  lessons: [
    ['why-models', 'Why layered models exist', 'Layered models divide networking responsibilities into understandable groups. They give designers and troubleshooters a shared vocabulary without claiming that every implementation follows one visible step-by-step animation.', 'Models organize responsibilities and help isolate where a problem belongs.', 'model-purpose'],
    ['seven-osi-layers', 'The seven OSI layers', 'From lowest to highest, the OSI model names Physical, Data Link, Network, Transport, Session, Presentation, and Application. NetBite has focused mainly on the first three so far.', 'Remember the OSI order and the responsibility each layer groups.', 'osi-stack'],
    ['four-tcp-ip-layers', 'The four TCP/IP layers', 'A common four-layer TCP/IP view groups Network Access, Internet, Transport, and Application. It combines several OSI categories while describing the protocol suite used by IP networks.', 'TCP/IP groups practical protocol responsibilities into four broad layers.', 'tcp-ip-stack'],
    ['mapping-concepts', 'Map NetBite concepts to layers', 'Cables belong at OSI Physical; Ethernet and MAC at Data Link; IPv4, ICMP, and routing at Network; TCP and UDP at Transport; user-facing protocols belong at Application. TCP/IP combines Physical and Data Link as Network Access.', 'Classifying a concept by responsibility makes troubleshooting more precise.', 'concept-layer-map'],
  ],
  questions: [
    [0, 'Why use a layered networking model?', ['To organize responsibilities and troubleshooting', 'To replace every real protocol', 'To guarantee every vendor uses identical code'], 0, 'A model provides shared structure and vocabulary.'],
    [1, 'Which OSI layer handles Ethernet frames and MAC addresses?', ['Data Link', 'Application', 'Session'], 0, 'Ethernet local delivery is grouped at OSI Layer 2, Data Link.'],
    [1, 'Which OSI order is correct from Layer 1 upward?', ['Physical, Data Link, Network, Transport', 'Application, Physical, Network, Session', 'Network, Data Link, Physical, Transport'], 0, 'The lower four begin Physical, Data Link, Network, Transport.'],
    [2, 'Where does IPv4 fit in the four-layer TCP/IP model?', ['Internet layer', 'Application layer', 'Network Access only'], 0, 'IP and ICMP belong to the TCP/IP Internet layer.'],
    [3, 'Where should TCP and UDP be classified?', ['Transport', 'Physical', 'Data Link'], 0, 'TCP and UDP provide transport-layer communication.'],
  ],
  cards: [
    ['Layered Model', 'A structured grouping of networking responsibilities.', 'Use layers to narrow a fault.'], ['Physical', 'OSI Layer 1: signals, media, and physical connections.', 'Copper cable.'], ['Data Link', 'OSI Layer 2: local frames and MAC delivery.', 'Ethernet switching.'], ['Network', 'OSI Layer 3: logical addressing and routing.', 'IPv4 and ICMP.'], ['Transport', 'OSI Layer 4: end-to-end transport services.', 'TCP and UDP.'], ['Session', 'OSI Layer 5: organizing communication sessions.', 'A model responsibility above transport.'], ['Presentation', 'OSI Layer 6: data representation and transformation.', 'Encoding formats.'], ['Application', 'OSI Layer 7: services used by applications.', 'A user-facing network protocol.'], ['TCP/IP Model', 'Network Access, Internet, Transport, and Application layers.', 'IPv4 belongs to Internet.'],
  ],
  lab: ['layer-sorting-desk', 'Sort the network stack', 'Classify learned concepts in OSI and TCP/IP layers'],
  recap: ['A complete layered concept map', 'All seven OSI layers, four TCP/IP layers, and NetBite concept mappings', 'You are ready to revisit any chapter and strengthen mastery'],
});

export const advancedChapters = [chapterFour, chapterFive, chapterSix, chapterSeven, chapterEight, chapterNine, chapterTen, chapterEleven];
