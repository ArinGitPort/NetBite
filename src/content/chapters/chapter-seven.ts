import { createAdvancedChapter } from '@/content/advanced-content-helpers';

export const chapterSeven = createAdvancedChapter({
  id: 7, title: 'ARP', summary: 'Resolve the correct local IPv4 next hop into an Ethernet destination MAC address.',
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
      body: 'When no usable mapping is cached, the sender broadcasts an ARP request. The request identifies the target IPv4 address and asks which local interface owns it.',
      sections: [
        { heading: 'Why broadcast', body: 'The sender does not yet know the target MAC, so it cannot address the request as a known unicast. The Ethernet broadcast lets every local interface inspect the question.' },
        { heading: 'Only the owner answers normally', body: 'All hosts may receive the request, but the interface configured with the target IPv4 address is the one expected to identify itself.' },
      ],
      example: { label: 'WHO HAS?', setup: 'PC A broadcasts: Who has 192.168.10.20?', result: 'The switch floods the request within the VLAN, excluding the ingress port.' },
      takeaway: 'An ARP request broadcasts the target IPv4 question to the local domain.',
      checkpoint: { prompt: 'Why is the first ARP request broadcast?', correctChoiceId: 'unknown', choices: [
        { id: 'unknown', label: 'TARGET MAC IS UNKNOWN', feedback: 'Correct. Broadcasting lets the unknown local owner receive the question.' },
        { id: 'remote', label: 'TARGET IS ALWAYS REMOTE', feedback: 'ARP resolves a local next hop, not an always-remote target.' },
        { id: 'damaged', label: 'THE FRAME IS DAMAGED', feedback: 'Broadcasting is the discovery method, not an error response.' },
      ] },
    },
    {
      id: 'arp-reply', title: 'The owner returns an ARP reply', illustration: 'arp-reply',
      body: 'The interface owning the requested IPv4 address returns an ARP reply containing its mapping. Because the requester’s addresses were included in the request, the reply can normally be sent directly back as a unicast.',
      sections: [
        { heading: 'The reply supplies the missing fact', body: 'A statement such as “192.168.10.20 is at 02:00:00:00:00:0B” gives the sender the destination MAC needed for local frame delivery.' },
        { heading: 'ARP does not test the entire route', body: 'A reply proves that this local mapping exchange worked. It does not guarantee that a remote application or every later routed hop is reachable.' },
      ],
      example: { label: 'OWNER RESPONSE', setup: 'PC B owns 192.168.10.20 and receives PC A’s request.', result: 'PC B unicasts its IPv4-to-MAC mapping back to PC A.' },
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
    { lessonId: 'arp-request', prompt: 'Why does an ARP request use Ethernet broadcast?', answers: ['The target MAC is not known yet', 'The target is always on another LAN', 'Broadcast repairs damaged frames'], correctAnswerIndex: 0, explanation: 'Broadcast lets the unknown local owner hear the request.' },
    { lessonId: 'arp-reply', prompt: 'Who normally answers a request for 192.168.10.20?', answers: ['The local interface owning 192.168.10.20', 'Every host', 'A remote DNS server'], correctAnswerIndex: 0, explanation: 'The target owner supplies its mapping.' },
    { lessonId: 'arp-cache-reuse', prompt: 'A usable mapping is already cached. What should the host do?', answers: ['Use it without another request', 'Broadcast anyway for every frame', 'Delete its IPv4 address'], correctAnswerIndex: 0, explanation: 'The cache avoids unnecessary repeated discovery.' },
    { lessonId: 'arp-local-sequence', prompt: 'For a local destination, whose MAC is resolved?', answers: ['The destination host’s', 'The default gateway’s', 'A remote router’s'], correctAnswerIndex: 0, explanation: 'The local destination is the IP next hop itself.' },
    { lessonId: 'arp-next-hop', prompt: 'For a remote destination, whose MAC is used in the first frame?', answers: ['The local gateway’s', 'The remote host’s', 'Every local host’s'], correctAnswerIndex: 0, explanation: 'The gateway is the local next hop.' },
    { lessonId: 'arp-next-hop', prompt: 'What stays as the IPv4 destination while the first frame targets the gateway MAC?', answers: ['The remote host address', 'The gateway address', 'The switch address'], correctAnswerIndex: 0, explanation: 'Link-layer next hop and final IP destination have different roles.' },
  ],
  cards: [
    ['ARP', 'IPv4 local-next-hop to MAC resolution.', 'Resolve 192.168.10.20 to a MAC.'], ['ARP Request', 'A broadcast asking who owns a local IPv4 address.', 'Who has 192.168.10.20?'],
    ['ARP Reply', 'The owner’s response containing its mapping.', '.20 is at 02:00:...:0B.'], ['ARP Cache', 'Temporary stored IPv4-to-MAC mappings.', 'Reuse the gateway entry.'],
    ['Cache Hit', 'Finding a usable mapping without a new request.', 'Send immediately using the cached MAC.'], ['Local Resolution', 'Resolving the destination host itself.', 'PC A resolves PC B.'],
    ['Gateway Resolution', 'Resolving the local router for remote traffic.', 'PC A resolves 192.168.10.1.'], ['Local Next Hop', 'The interface receiving the current local frame.', 'Destination host or gateway.'],
  ],
  lab: ['arp-resolution-desk', 'Resolve the local next hop', 'Process local resolution, cache reuse, gateway resolution, and reuse'],
  recap: ['A reusable ARP cache', 'Requests, replies, mappings, local targets, and gateway resolution', 'How ICMP Echo provides reachability evidence'],
});
