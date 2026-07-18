import { createAdvancedChapter } from '@/content/advanced-content-helpers';

export const chapterSix = createAdvancedChapter({
  id: 6, title: 'Routers and Default Gateways', summary: 'Decide whether a destination is local and follow remote delivery through a reachable gateway.',
  lessons: [
    {
      id: 'router-interfaces', title: 'Routers join separately addressed networks', illustration: 'router-interfaces',
      body: 'A router connects IP networks through separately addressed interfaces. Each active interface belongs to its attached subnet, giving hosts on that subnet a local router address they can reach directly.',
      sections: [
        { heading: 'One interface per side', body: 'A router joining 192.168.10.0/24 and 192.168.20.0/24 might use 192.168.10.1 on one interface and 192.168.20.1 on the other.' },
        { heading: 'The router is not one universal address', body: 'Hosts use the address of the router interface on their own subnet. The far-side interface belongs to a different network.' },
      ],
      example: { label: 'TWO-LAN ROUTER', setup: 'PC A is in 192.168.10.0/24; PC B is in 192.168.20.0/24.', result: 'The router needs one interface in each subnet to provide a path between them.' },
      takeaway: 'Each router interface has an address appropriate for its directly attached network.',
    },
    {
      id: 'same-subnet-decision', title: 'Compare prefixes before choosing a path', illustration: 'same-subnet',
      body: 'A host first determines whether the destination is local or remote. It applies its own prefix to both addresses and compares the resulting network identities rather than comparing only the first octet or familiar-looking digits.',
      sections: [
        { heading: 'Same network means local', body: '192.168.10.25/24 and 192.168.10.80 produce the same 192.168.10.0/24 network identity.' },
        { heading: 'Different network means remote', body: '192.168.10.25/24 and 192.168.20.80 produce different /24 identities, so direct local delivery is not enough.' },
      ],
      example: { label: 'PREFIX TEST', setup: 'Source 10.0.1.10/24; destination 10.0.2.10.', result: 'The networks are 10.0.1.0/24 and 10.0.2.0/24. The destination is remote despite sharing the first two octets.' },
      takeaway: 'Local or remote is determined by comparing prefix-defined network identities.',
      checkpoint: { prompt: 'For 192.168.10.25/24, which destination is local?', correctChoiceId: 'local', choices: [
        { id: 'local', label: '192.168.10.90', feedback: 'Correct. Both addresses produce network 192.168.10.0/24.' },
        { id: 'remote', label: '192.168.20.25', feedback: 'This produces network 192.168.20.0/24, so it is remote.' },
        { id: 'public', label: '8.8.8.8', feedback: 'This is outside the source /24 and therefore remote.' },
      ] },
    },
    {
      id: 'local-delivery', title: 'Local destinations are delivered directly', illustration: 'local-remote',
      body: 'When source and destination share a subnet, the host prepares local-link delivery for the destination interface itself. A router is not the next hop merely because one is configured on the host.',
      sections: [
        { heading: 'Direct does not mean cable-to-cable', body: 'A switch may still sit between the hosts. “Direct” means the IP next hop is the destination host, not a router.' },
        { heading: 'Local mapping is still required', body: 'On Ethernet, the sender needs the destination’s MAC address. Chapter 7 explains how ARP discovers that local mapping.' },
      ],
      example: { label: 'SAME /24', setup: 'PC A 192.168.10.10 sends to PC B 192.168.10.20 in 192.168.10.0/24.', result: 'PC A targets PC B as the IP next hop and the switch carries the local Ethernet frame.' },
      takeaway: 'A local destination is the next hop itself, even when a switch lies along the physical path.',
    },
    {
      id: 'remote-delivery', title: 'Remote destinations use the default gateway', illustration: 'default-gateway',
      body: 'When the destination network differs, the host cannot deliver directly on its LAN. It sends the local Ethernet frame toward a router, normally the configured default gateway, while keeping the remote IPv4 destination inside the datagram.',
      sections: [
        { heading: 'Gateway is the next hop', body: 'The gateway is the next device along the route, not the final destination. Its local MAC becomes the frame destination on the first link.' },
        { heading: 'The remote address remains', body: 'If PC A sends to 192.168.20.20, that complete IPv4 destination remains unchanged; only the first local-link frame targets the gateway.' },
      ],
      example: { label: 'LEAVE THE LAN', setup: 'PC A 192.168.10.10/24 sends to remote destination 192.168.20.20 through gateway 192.168.10.1.', steps: [
        { id: 'compare', label: 'COMPARE NETWORK IDENTITIES', explanation: '192.168.10.0/24 and 192.168.20.0/24 differ.', value: 'REMOTE' },
        { id: 'next-hop', label: 'CHOOSE A LOCAL NEXT HOP', explanation: 'PC A selects its reachable gateway 192.168.10.1.' },
        { id: 'frame', label: 'ADDRESS THE LOCAL FRAME', explanation: 'The first Ethernet frame targets the gateway MAC, not the remote PC MAC.' },
        { id: 'ip', label: 'KEEP THE IP DESTINATION', explanation: 'The enclosed datagram still names the remote endpoint.', value: '192.168.20.20' },
      ], result: 'Local frame delivery reaches the router; IP addressing continues to describe the end destination.' },
      takeaway: 'For remote traffic, the gateway is the local next hop while the remote host remains the IPv4 destination.',
    },
    {
      id: 'gateway-requirements', title: 'A gateway must be locally reachable', illustration: 'gateway-requirements',
      body: 'A host must reach its default gateway before the gateway can forward anything. The configured gateway address therefore needs to belong to the host’s local subnet and identify a usable router interface on that LAN.',
      sections: [
        { heading: 'Off-subnet gateway failure', body: 'A 192.168.10.25/24 host cannot directly reach gateway 192.168.20.1 because that gateway is already in a different /24 network.' },
        { heading: 'Correct address is not enough by itself', body: 'The local router interface must also be connected and operating. Configuration names a next hop; it does not create the physical path.' },
      ],
      example: { label: 'VALID GATEWAY', setup: 'Host 192.168.10.25/24; router interface 192.168.10.1/24.', result: 'Both share the local /24, so the host can resolve and send to the gateway.' },
      takeaway: 'A default gateway must be a reachable router-interface address on the host’s own subnet.',
      checkpoint: { prompt: 'Which gateway is locally reachable from 192.168.10.25/24?', correctChoiceId: 'same', choices: [
        { id: 'same', label: '192.168.10.1', feedback: 'Correct. It shares network 192.168.10.0/24.' },
        { id: 'other', label: '192.168.20.1', feedback: 'That address is in another /24 and cannot be the direct local next hop.' },
        { id: 'broadcast', label: '192.168.10.255', feedback: 'This is the subnet broadcast address, not a usable router interface.' },
      ] },
    },
    {
      id: 'routed-frame', title: 'Routers replace link-layer frames', illustration: 'routed-frame',
      body: 'A router receives a frame addressed to its local interface, removes the link-layer wrapper, examines the IPv4 destination, chooses an outgoing path, and creates a new link-layer frame for the next link.',
      sections: [
        { heading: 'Local frame addresses change', body: 'The source and destination MAC addresses are meaningful only on their particular Ethernet link. The next link uses addresses appropriate for that link.' },
        { heading: 'IP endpoints normally remain', body: 'Across this simple route, the original source and destination IPv4 addresses remain the endpoints while each router handles a new local frame.' },
      ],
      example: { label: 'TWO ETHERNET LINKS', setup: 'PC A sends an IP datagram through one router to PC B.', steps: [
        { id: 'first', label: 'LAN A FRAME', explanation: 'PC A builds a local frame addressed to the router interface.' },
        { id: 'remove', label: 'ROUTER RECEIVES', explanation: 'The router removes the LAN A frame and selects the next route.' },
        { id: 'second', label: 'LAN B FRAME', explanation: 'The router creates a new frame suitable for the outgoing LAN.' },
        { id: 'endpoints', label: 'PRESERVE IP ENDPOINTS', explanation: 'The datagram still names PC A and PC B.', value: 'FRAME CHANGES / IP DESTINATION REMAINS' },
      ], result: 'Link-layer addresses are hop-specific, while the routed IPv4 destination remains end-to-end.' },
      takeaway: 'Routing preserves the IP destination while replacing local-link delivery information at each routed hop.',
    },
  ],
  questions: [
    { lessonId: 'router-interfaces', prompt: 'Why does a router between two LANs need an interface in each subnet?', answers: ['Each side must have a locally addressed attachment', 'One cable name covers every network', 'Routers use only MAC addresses'], correctAnswerIndex: 0, explanation: 'Each router interface belongs to its attached network.' },
    { lessonId: 'same-subnet-decision', prompt: 'How does a host decide whether 192.168.10.80 is local to 192.168.10.25/24?', answers: ['Compare their /24 network identities', 'Compare only device names', 'Check the destination MAC first'], correctAnswerIndex: 0, explanation: 'The prefix-defined networks match.' },
    { lessonId: 'local-delivery', prompt: 'For a local destination, what is the IP next hop?', answers: ['The destination host', 'Always the default gateway', 'The first switch'], correctAnswerIndex: 0, explanation: 'Local delivery targets the destination itself at the IP layer.' },
    { lessonId: 'remote-delivery', prompt: 'For a remote destination, what local device receives the first frame?', answers: ['The default gateway', 'The remote host directly', 'Every local PC'], correctAnswerIndex: 0, explanation: 'The gateway is the local next hop toward a remote network.' },
    { lessonId: 'remote-delivery', prompt: 'What remains the IPv4 destination in the first frame to the gateway?', answers: ['The remote host’s IPv4 address', 'The switch port number', 'The gateway MAC address'], correctAnswerIndex: 0, explanation: 'The gateway is the next hop, but the remote host remains the IP destination.' },
    { lessonId: 'gateway-requirements', prompt: 'Why is gateway 192.168.20.1 invalid for host 192.168.10.25/24?', answers: ['It is not on the host’s local subnet', 'Gateway addresses must end in 254', 'It is a private address'], correctAnswerIndex: 0, explanation: 'The host must directly reach its gateway on the local subnet.' },
    { lessonId: 'routed-frame', prompt: 'What normally changes when a router forwards onto another Ethernet LAN?', answers: ['The link-layer frame addresses', 'The final IPv4 destination', 'The application’s user account'], correctAnswerIndex: 0, explanation: 'A new local frame is built while the destination IP remains.' },
  ],
  cards: [
    ['Router Interface', 'A router attachment with an address in its connected subnet.', '192.168.10.1/24 on LAN A.'], ['Local Destination', 'A destination sharing the source subnet.', 'Deliver directly to 192.168.10.20.'],
    ['Remote Destination', 'A destination in a different subnet.', '192.168.20.20 from LAN A.'], ['Default Gateway', 'The local router used for destinations without a more specific host route.', '192.168.10.1.'],
    ['Next Hop', 'The next IP device along a route.', 'The local gateway for remote traffic.'], ['Direct Delivery', 'Using the local destination as the next hop.', 'PC A sends locally to PC B.'],
    ['Routed Delivery', 'Forwarding through one or more routers.', 'LAN A to LAN B.'], ['Frame Replacement', 'Building new link-layer delivery information for a new link.', 'Router sends a new Ethernet frame on LAN B.'],
  ],
  lab: ['gateway-forwarding-desk', 'Choose direct or gateway delivery', 'Compare two fixed LANs and detect an off-subnet gateway'],
  recap: ['A correct next-hop decision', 'Router interfaces, local and remote delivery, gateways, and frame replacement', 'How ARP discovers the local next-hop MAC address'],
});
