import { createAdvancedChapter } from '@/content/advanced-content-helpers';

export const chapterSeven = createAdvancedChapter({
  id: 7, contentVersion: 3, flashcardVersion: 4, title: 'ARP', summary: 'Resolve the correct local IPv4 next hop into an Ethernet destination MAC address.',
  lessons: [
    {
      id: 'arp-purpose', title: 'Why IPv4 needs a local MAC mapping', illustration: 'arp-mapping',
      body: 'After choosing a local next-hop IPv4 address, an Ethernet host still needs a destination MAC address for the frame. Address Resolution Protocol, or ARP, discovers the mapping between that local IPv4 next hop and its MAC address.',
      sections: [
        { heading: 'Two decisions happen in order', body: 'The prefix and route decision chooses the next-hop IPv4 address. ARP then resolves that local address; ARP does not choose whether the final destination is local or remote.' },
        { heading: 'Local-link scope', body: 'ARP messages operate on the local broadcast domain. A router separates broadcast domains, so a host cannot ARP directly for an interface on a remote LAN.' },
      ],
      example: { label: 'MISSING FRAME ADDRESS', setup: 'PC A knows local next-hop IPv4 192.168.10.20 but not its MAC.', result: 'ARP asks the LAN for the interface that owns 192.168.10.20.' },
      takeaway: 'ARP maps the already-selected local next-hop IPv4 address to a MAC address.',
    },
    {
      id: 'arp-request', title: 'An ARP request asks the broadcast domain', illustration: 'arp-request',
      body: 'When no usable mapping is cached, the sender puts an ARP Request inside an Ethernet broadcast frame. The outer Ethernet destination is FF:FF:FF:FF:FF:FF, while EtherType 0x0806 tells receiving interfaces that the payload is ARP.',
      sections: [
        { heading: 'The request carries known facts', body: 'PC-A includes its own IPv4 and MAC, operation Request, and target IPv4 192.168.10.20. The ARP target-hardware field is unknown and has no useful target value yet; it is separate from the outer Ethernet broadcast destination.' },
        { heading: 'Flood only inside this VLAN', body: 'The switch learns PC-A from the frame source and floods the broadcast through every other active port in VLAN 1. All local interfaces may inspect the question, but only the owner of 192.168.10.20 normally answers.' },
      ],
      example: { label: 'WHO HAS 192.168.10.20?', setup: 'PC-A is 192.168.10.10 with MAC 02:00:00:00:00:0A. Its cache has no entry for PC-B.', presentation: 'guided', visual: { illustration: 'arp-request', stageIds: ['build', 'broadcast', 'flood', 'inspect'] }, steps: [
        { id: 'build', label: 'BUILD THE ARP QUESTION', explanation: 'PC-A supplies its sender IPv4 and MAC, asks for 192.168.10.20, and marks the operation as Request.' },
        { id: 'broadcast', label: 'ADD THE ETHERNET ENVELOPE', explanation: 'Because the target MAC is unknown, PC-A uses destination FF:FF:FF:FF:FF:FF and EtherType 0x0806.' },
        { id: 'flood', label: 'FLOOD WITHIN VLAN 1', explanation: 'The switch sends copies through every other active VLAN 1 port, never back through the ingress port.' },
        { id: 'inspect', label: 'MATCH THE TARGET IPv4', explanation: 'Each receiving host inspects the question. PC-B owns 192.168.10.20, so it prepares the reply.' },
      ], result: 'The broadcast discovers the unknown local owner without confusing the Ethernet destination with the still-unknown ARP target hardware address.' },
      takeaway: 'An ARP Request uses Ethernet broadcast FF:FF:FF:FF:FF:FF to ask who owns one local IPv4 address.',
      termNote: { term: 'FFFF.FFFF.FFFF', definition: 'Cisco-style dotted display of the same 48-bit Ethernet broadcast address written in NetBite as FF:FF:FF:FF:FF:FF.' },
      checkpoint: { prompt: 'PC-A knows PC-B’s IPv4 address but not its MAC address. Why does PC-A send its first ARP Request to FF:FF:FF:FF:FF:FF?', correctChoiceId: 'unknown', choices: [
        { id: 'unknown', label: 'TARGET MAC IS UNKNOWN', feedback: 'Correct. Broadcasting lets the unknown local owner receive the question.' },
        { id: 'remote', label: 'TARGET IS ALWAYS REMOTE', feedback: 'ARP resolves a local next hop, not an always-remote target.' },
        { id: 'damaged', label: 'THE FRAME IS DAMAGED', feedback: 'Broadcasting is the discovery method, not an error response.' },
      ] },
    },
    {
      id: 'arp-reply', title: 'The owner returns an ARP reply', illustration: 'arp-reply',
      body: 'The interface owning the requested IPv4 address builds operation Reply and places its IPv4-to-MAC mapping in the ARP message. Because PC-A included its addresses in the request, PC-B can normally place the reply inside a unicast Ethernet frame addressed directly to PC-A.',
      sections: [
        { heading: 'The request teaches too', body: 'The sender fields in PC-A’s request assert that 192.168.10.10 is at 02:00:00:00:00:0A. PC-B can learn or refresh that mapping before it examines whether the message is a request.' },
        { heading: 'The reply supplies the missing fact', body: 'The reply states that 192.168.10.20 is at 02:00:00:00:00:0B. PC-A stores that mapping and can finally build the separate Ethernet data frame.' },
        { heading: 'ARP does not test the entire route', body: 'A reply proves that this local mapping exchange worked. It does not guarantee that a remote application or every later routed hop is reachable.' },
      ],
      example: { label: 'OWNER RESPONSE', setup: 'PC-B owns 192.168.10.20 and uses MAC 02:00:00:00:00:0B.', presentation: 'guided', visual: { illustration: 'arp-reply', stageIds: ['learn-requester', 'build-reply', 'unicast', 'cache'] }, steps: [
        { id: 'learn-requester', label: 'READ THE REQUESTER', explanation: 'PC-B can learn PC-A’s mapping from the sender fields carried in the request.' },
        { id: 'build-reply', label: 'SUPPLY THE OWNER MAPPING', explanation: 'PC-B sets operation Reply and identifies 192.168.10.20 as 02:00:00:00:00:0B.' },
        { id: 'unicast', label: 'RETURN DIRECTLY', explanation: 'PC-B normally unicasts the Ethernet reply to PC-A MAC 02:00:00:00:00:0A.' },
        { id: 'cache', label: 'STORE AND SEND', explanation: 'PC-A caches PC-B’s mapping, then uses it as the destination MAC of the later data frame.' },
      ], result: 'The ARP exchange updates local mapping knowledge; the data frame is a later, separate Ethernet transmission.' },
      takeaway: 'The target owner normally unicasts an ARP reply containing its local IPv4-to-MAC mapping.',
    },
    {
      id: 'arp-cache-reuse', title: 'The ARP cache avoids repeated discovery', illustration: 'arp-cache',
      body: 'A host stores learned IPv4-to-MAC mappings in an ARP cache. If a usable entry already exists for the selected next hop, the host can build the Ethernet frame without broadcasting another request.',
      sections: [
        { heading: 'Cache is temporary knowledge', body: 'Dynamic entries do not last forever because interfaces and addresses can change. Exact timers differ and are outside this beginner lesson.' },
        { heading: 'Reuse the next-hop mapping', body: 'Several remote destinations may use the same default gateway. The host can reuse the gateway’s cached MAC instead of resolving each remote host.' },
      ],
      example: { label: 'SECOND FRAME', setup: 'PC A already caches 192.168.10.20 → PC B MAC.', result: 'PC A uses the cached destination MAC and sends without a new ARP request.' },
      takeaway: 'A usable ARP cache entry supplies the local frame destination without another broadcast.',
    },
    {
      id: 'arp-local-sequence', title: 'Resolve a local destination itself', illustration: 'arp-local-sequence',
      body: 'For a destination in the sender’s own subnet, the destination host is the IP next hop. The sender therefore checks or resolves the destination host’s MAC address, then sends the frame toward that host.',
      sections: [
        { heading: 'Sequence matters', body: 'First compare prefixes, then choose the destination as next hop, then check the cache, then request only if the mapping is absent.' },
        { heading: 'Switching still occurs', body: 'The frame may cross a switch, but the destination MAC identifies the target host interface, not the switch itself.' },
      ],
      example: { label: 'LOCAL A TO B', setup: 'PC A 192.168.10.10/24 sends to PC B 192.168.10.20/24 with an empty ARP cache.', steps: [
        { id: 'local', label: 'CHOOSE THE NEXT HOP', explanation: 'Both addresses belong to 192.168.10.0/24, so PC B itself is the local next hop.' },
        { id: 'request', label: 'BROADCAST THE QUESTION', explanation: 'PC A asks who owns 192.168.10.20.' },
        { id: 'reply', label: 'LEARN THE OWNER', explanation: 'PC B unicasts its MAC mapping back to PC A.' },
        { id: 'send', label: 'BUILD THE DATA FRAME', explanation: 'PC A uses PC B’s learned MAC as the destination.' },
      ], result: 'ARP resolves the local destination itself before the Ethernet data frame is sent.' },
      takeaway: 'For local traffic, ARP resolves the destination host’s own IPv4 address.',
    },
    {
      id: 'arp-next-hop', title: 'Resolve the gateway for remote traffic', illustration: 'arp-next-hop',
      body: 'For a remote IPv4 destination, the default gateway is the local next hop. The sender resolves the gateway’s local interface address and uses the gateway MAC as the Ethernet destination.',
      sections: [
        { heading: 'Do not ARP for the remote host', body: 'ARP broadcasts stop at the local router boundary. The remote host’s MAC is meaningful on its own LAN and is not needed in the first local frame.' },
        { heading: 'Keep the remote IPv4 destination', body: 'The frame destination is the gateway MAC, while the contained datagram still names the remote host as its IPv4 destination.' },
      ],
      example: { label: 'REMOTE NEXT HOP', setup: 'PC A 192.168.10.10/24 sends to 192.168.20.20 through gateway 192.168.10.1.', steps: [
        { id: 'remote', label: 'IDENTIFY REMOTE DESTINATION', explanation: 'The destination is outside PC A’s 192.168.10.0/24 subnet.' },
        { id: 'gateway', label: 'CHOOSE THE GATEWAY', explanation: 'The gateway is the next hop on PC A’s local link.', value: '192.168.10.1' },
        { id: 'resolve', label: 'ARP LOCALLY', explanation: 'PC A resolves the gateway IPv4 address to the gateway MAC.' },
        { id: 'frame', label: 'SEND THE FIRST FRAME', explanation: 'The frame targets the gateway MAC while the IP destination stays 192.168.20.20.' },
      ], result: 'ARP never broadcasts across the router to discover the remote PC’s MAC.' },
      takeaway: 'For remote traffic, ARP resolves the local gateway rather than the remote destination.',
      checkpoint: { prompt: 'PC A sends to a remote subnet. Which IPv4 address should it ARP for?', correctChoiceId: 'gateway', choices: [
        { id: 'gateway', label: 'LOCAL DEFAULT GATEWAY', feedback: 'Correct. The gateway is the local next hop for remote delivery.' },
        { id: 'remote', label: 'REMOTE HOST', feedback: 'The remote host is beyond the local broadcast domain, so PC A cannot resolve it directly.' },
        { id: 'switch', label: 'SWITCH MANAGEMENT ADDRESS', feedback: 'The switch forwards the local frame but is not the selected IP next hop.' },
      ] },
    },
  ],
  questions: [
    { lessonId: 'arp-purpose', prompt: 'What missing information does ARP discover?', answers: ['The local next-hop MAC for an IPv4 address', 'The entire internet route', 'The subnet block size'], correctAnswerIndex: 0, explanation: 'ARP resolves a selected local next-hop IPv4 address into a MAC.' },
    { lessonId: 'arp-request', prompt: 'PC-A does not know the MAC for 192.168.10.20. Which Ethernet destination carries its first ARP Request?', answers: ['FF:FF:FF:FF:FF:FF', '00:00:00:00:00:00', 'The remote router MAC'], correctAnswerIndex: 0, explanation: 'The outer Ethernet frame uses the local broadcast MAC so the unknown owner can inspect the request.' },
    { lessonId: 'arp-reply', prompt: 'Who normally answers a request for 192.168.10.20?', answers: ['The local interface owning 192.168.10.20', 'Every host', 'A remote DNS server'], correctAnswerIndex: 0, explanation: 'The target owner supplies its mapping.' },
    { lessonId: 'arp-cache-reuse', prompt: 'A usable mapping is already cached. What should the host do?', answers: ['Use it without another request', 'Broadcast anyway for every frame', 'Delete its IPv4 address'], correctAnswerIndex: 0, explanation: 'The cache avoids unnecessary repeated discovery.' },
    { lessonId: 'arp-local-sequence', prompt: 'For a local destination, whose MAC is resolved?', answers: ['The destination host’s', 'The default gateway’s', 'A remote router’s'], correctAnswerIndex: 0, explanation: 'The local destination is the IP next hop itself.' },
    { lessonId: 'arp-next-hop', prompt: 'For a remote destination, whose MAC is used in the first frame?', answers: ['The local gateway’s', 'The remote host’s', 'Every local host’s'], correctAnswerIndex: 0, explanation: 'The gateway is the local next hop.' },
    { lessonId: 'arp-next-hop', prompt: 'What stays as the IPv4 destination while the first frame targets the gateway MAC?', answers: ['The remote host address', 'The gateway address', 'The switch address'], correctAnswerIndex: 0, explanation: 'Link-layer next hop and final IP destination have different roles.' },
  ],
  cards: [
    ['arp-purpose', 'What problem does ARP solve on an IPv4 Ethernet LAN?', 'It maps the local next-hop IPv4 address to the MAC address needed for the Ethernet frame.', 'The sender knows an IPv4 next hop but still needs a local-link destination.'],
    ['arp-request', 'Which Ethernet destination and EtherType carry a normal IPv4 ARP Request?', 'Destination FF:FF:FF:FF:FF:FF and EtherType 0x0806.', 'The broadcast is the outer Ethernet destination. The ARP target-hardware field remains unknown or unused in the request.'],
    ['arp-reply', 'How does the ARP owner normally reply, and what mapping does it provide?', 'It normally unicasts an ARP Reply to the requester and supplies its own IPv4-to-MAC mapping.', 'The requester addresses were already present in the original request.'],
    ['arp-cache-reuse', 'What advantage does an ARP cache provide?', 'It lets a host reuse a recent IPv4-to-MAC mapping without broadcasting another request.', 'A usable cache entry shortens later local delivery setup.'],
    ['arp-local-sequence', 'PC A sends to PC B in the same subnet. Whose MAC address must PC A resolve?', 'PC B’s MAC address.', 'For local delivery, the destination host itself is the local next hop.'],
    ['arp-next-hop', 'PC A sends to a remote subnet. Whose MAC address must PC A resolve?', 'The default gateway’s local-interface MAC address.', 'ARP resolves only the local next hop, not the final remote host across the router.'],
    ['arp-next-hop', 'Does an ARP Request cross a router to discover a remote host’s MAC address?', 'No.', 'The source resolves its local gateway; routers perform their own next-hop resolution on later links.'],
    ['arp-local-sequence', 'What is the correct order for local ARP delivery?', 'Choose the local next hop, check the ARP cache, broadcast a request if needed, receive the reply, cache the mapping, then send the frame.', 'ARP resolution prepares the link-layer destination before normal Ethernet delivery.'],
  ],
  lab: ['arp-resolution-desk', 'Resolve the local next hop', 'Process local resolution, cache reuse, gateway resolution, and reuse'],
  recap: ['A reusable ARP cache', 'Requests, replies, mappings, local targets, and gateway resolution', 'How ICMP Echo provides reachability evidence'],
});
