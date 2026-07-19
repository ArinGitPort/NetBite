import { createAdvancedChapter } from '@/content/advanced-content-helpers';

export const chapterNine = createAdvancedChapter({
  id: 9, contentVersion: 3, title: 'Static Routing', summary: 'Read route entries, find every matching prefix, and select connected, static, most-specific, and default paths.',
  lessons: [
    {
      id: 'route-table-purpose', title: 'A route table answers where to send IP traffic', illustration: 'route-purpose',
      body: 'A router compares each destination IPv4 address with entries in its routing table. A matching route describes a destination prefix and how traffic for that prefix should leave or reach a next router.',
      sections: [
        { heading: 'Routes describe networks', body: 'A route normally matches an address range represented by a prefix, not one application or Ethernet frame. More than one entry may match the same destination.' },
        { heading: 'No usable match means no forwarding path', body: 'If neither a specific route nor a default route is available, the router cannot invent a next hop. It drops the packet and may report an ICMP condition.' },
      ],
      example: { label: 'LOOKUP QUESTION', setup: 'A packet reaches R1 with destination 192.168.30.25.', steps: [
        { id: 'read', label: 'READ THE DESTINATION', explanation: 'Route lookup uses the destination IPv4 address, not the source MAC or application name.', value: '192.168.30.25' },
        { id: 'match', label: 'FIND MATCHING PREFIXES', explanation: 'Compare the destination with each usable route’s address range.' },
        { id: 'select', label: 'SELECT THE MOST SPECIFIC', explanation: 'From the matching set, choose the route with the longest prefix.' },
      ], result: 'Only after those steps does the router obtain a next hop or exit interface.' },
      takeaway: 'The route table maps destination prefixes to forwarding paths.',
    },
    {
      id: 'connected-remote-routes', title: 'Active interfaces create connected routes', illustration: 'connected-routes',
      body: 'A router knows a network attached to an active, correctly addressed interface as a connected route. Networks not directly attached are remote and need a static, dynamically learned, or default route.',
      sections: [
        { heading: 'Connected means one link away', body: 'If interface LAN-A is 192.168.10.1/24 and active, the router can install connected network 192.168.10.0/24.' },
        { heading: 'Interface state matters', body: 'Configuration alone is not always enough. If the interface is not operational, its connected path may not be usable.' },
      ],
      example: { label: 'DIRECT KNOWLEDGE', setup: 'Router R1 has active interfaces in 192.168.10.0/24 and 10.0.12.0/30.', result: 'Both networks can appear as connected routes without manually adding static routes to them.' },
      takeaway: 'Connected routes come from active local interfaces; remote networks require another source of route information.',
    },
    {
      id: 'reading-route-entry', title: 'Read a route entry as one instruction', illustration: 'route-entry',
      body: 'A route entry includes a destination prefix and route source, plus forwarding information such as a next-hop address, exit interface, or both. These fields work together rather than as unrelated labels.',
      sections: [
        { heading: 'Destination and prefix', body: 'These fields define which IPv4 addresses the entry can match. 192.168.30.0/24 covers that one /24 network.' },
        { heading: 'Next hop and exit', body: 'The next hop identifies a neighboring router; the exit interface identifies where the packet leaves. Connected routes may not require a separate next-hop router.' },
      ],
      example: { label: 'STATIC ENTRY', setup: '192.168.30.0/24 via 10.0.12.2 out P2.', result: 'Traffic matching the destination /24 is sent toward neighboring router 10.0.12.2 through interface P2.' },
      takeaway: 'Read destination, prefix, source, next hop, and exit interface as one forwarding instruction.',
      checkpoint: { prompt: 'Which field defines the address range a route can match?', correctChoiceId: 'prefix', choices: [
        { id: 'prefix', label: 'DESTINATION PREFIX', feedback: 'Correct. The prefix describes the matching network range.' },
        { id: 'exit', label: 'EXIT INTERFACE', feedback: 'The exit says where traffic leaves after a route is selected.' },
        { id: 'name', label: 'ROUTER HOSTNAME', feedback: 'A hostname does not define the matching IPv4 range.' },
      ] },
    },
    {
      id: 'static-next-hop', title: 'A static route names an administrator-chosen path', illustration: 'route-next-hop',
      body: 'A static route is entered by an administrator rather than learned through a dynamic routing protocol. It can point to a reachable next-hop address, an exit interface, or both, depending on the network and platform.',
      sections: [
        { heading: 'The next hop must be resolvable', body: 'Naming 10.0.12.2 as next hop works only when the router has a usable path to that neighbor, often through a connected transit network.' },
        { heading: 'Static does not adapt by itself', body: 'If the topology changes, the configured route may need administrative correction. Dynamic routing behavior is outside this chapter.' },
      ],
      example: { label: 'REMOTE LAN', setup: 'R1 must reach 192.168.30.0/24 through neighbor 10.0.12.2.', result: 'A static route directs that destination prefix to the reachable neighbor.' },
      takeaway: 'A static route is a deliberate destination-to-next-hop instruction maintained by an administrator.',
    },
    {
      id: 'adding-static-routes', title: 'Communication needs forward and return routes', illustration: 'static-route',
      body: 'Delivering a request to a remote LAN is only half of two-way communication. Routers along the reverse direction also need routes back toward the original source network.',
      sections: [
        { heading: 'Asymmetry can be valid', body: 'The return path does not have to use the identical routers, but every hop still needs a usable route. NetBite uses symmetric fixed paths for clarity.' },
        { heading: 'Test both directions', body: 'When one-way delivery appears to work, inspect the destination’s gateway and the routers’ return entries before assuming the forward route is wrong.' },
      ],
      example: { label: 'REQUEST WITHOUT REPLY', setup: 'LAN A reaches LAN C, but R3 has no route to LAN A.', result: 'The request arrives; the reply cannot be forwarded back until a return route is added.' },
      takeaway: 'End-to-end exchange needs valid routing in both forward and return directions.',
      checkpoint: { prompt: 'A request reaches LAN C but its reply has no path to LAN A. What is missing?', correctChoiceId: 'return', choices: [
        { id: 'return', label: 'A RETURN ROUTE', feedback: 'Correct. The reverse direction needs its own matching path.' },
        { id: 'cable', label: 'A CROSSOVER CABLE AT PC A', feedback: 'The request already reached LAN C, so this symptom points beyond PC A’s local cable.' },
        { id: 'name', label: 'A NEW ROUTER NAME', feedback: 'Changing a hostname does not create a forwarding entry.' },
      ] },
    },
    {
      id: 'route-match-test', title: 'First decide which routes match', illustration: 'route-match-test',
      body: 'Longest-prefix selection happens only after the router has found the routes whose destination ranges contain the packet’s destination address. An entry cannot win merely because its prefix number is long; it must match first.',
      sections: [
        { heading: 'A prefix describes a range', body: 'Route 192.168.10.0/24 covers addresses from 192.168.10.0 through 192.168.10.255. Destination 192.168.10.25 is inside that range, while 192.168.20.25 is not.' },
        { heading: 'Keep only usable matches', body: 'A matching entry whose required interface or next hop is unavailable may not supply a usable forwarding path. NetBite states route usability explicitly.' },
      ],
      example: { label: 'TEST THREE ROUTES', setup: 'Destination 192.168.10.25 is compared with 192.168.10.0/24, 192.168.0.0/16, and 10.0.0.0/8.', steps: [
        { id: '24', label: 'TEST THE /24', explanation: '192.168.10.25 is inside 192.168.10.0–192.168.10.255.', value: 'MATCH' },
        { id: '16', label: 'TEST THE /16', explanation: 'Its first two octets are 192.168, so it is inside 192.168.0.0/16.', value: 'MATCH' },
        { id: '8', label: 'TEST THE /8', explanation: 'The destination begins with 192, not 10.', value: 'NO MATCH' },
      ], result: 'The candidate set contains the /24 and /16 routes. Longest-prefix selection can now compare those two.' },
      takeaway: 'A route enters the candidate set only when its prefix-defined range contains the destination.',
      checkpoint: { prompt: 'Which route matches destination 192.168.20.25?', correctChoiceId: '16', hints: ['Compare the fixed network portion of each route with the destination.', '192.168.0.0/16 covers every address beginning 192.168.'], choices: [
        { id: '16', label: '192.168.0.0/16', feedback: 'Correct. The destination begins with the same 16 network bits represented by 192.168.' },
        { id: '24', label: '192.168.10.0/24', feedback: 'This /24 covers only 192.168.10.0 through 192.168.10.255, not the 192.168.20.0 network.' },
        { id: '8', label: '10.0.0.0/8', feedback: 'This route matches destinations beginning with 10, not 192.' },
      ] },
    },
    {
      id: 'longest-prefix', title: 'The longest matching prefix wins', illustration: 'longest-prefix',
      body: 'Several routes can match one destination. IPv4 forwarding chooses the route with the longest matching prefix because it describes the smallest, most specific matching address range.',
      sections: [
        { heading: 'Specific before general', body: 'For destination 192.168.10.25, matching /24, /16, and /0 entries do not compete equally. /24 contains the most leading destination bits and is selected.' },
        { heading: 'Longest is not largest', body: 'A longer prefix represents a smaller range. “Longest” refers to the number of matching network bits, not a larger network.' },
      ],
      example: { label: 'SELECT FROM THE MATCHES', setup: 'Destination 192.168.10.25 matches 192.168.10.0/24, 192.168.0.0/16, and 0.0.0.0/0.', steps: [
        { id: 'candidates', label: 'KEEP MATCHES ONLY', explanation: 'All three listed routes contain the destination, so all are candidates.' },
        { id: 'lengths', label: 'COMPARE PREFIX LENGTHS', explanation: 'The candidates fix 24, 16, and 0 leading network bits.', value: '/24 > /16 > /0' },
        { id: 'winner', label: 'CHOOSE THE LONGEST', explanation: 'The /24 route describes the smallest and most-specific matching range.', value: '192.168.10.0/24' },
      ], result: 'The /24 route wins; the /16 and default route remain valid but less-specific alternatives.' },
      takeaway: 'Choose the usable matching route with the most-specific, longest prefix.',
    },
    {
      id: 'default-route', title: 'A default route is the least-specific fallback', illustration: 'default-route',
      body: 'The IPv4 default route 0.0.0.0/0 matches every destination because it has zero fixed network bits. It is selected only when no more-specific usable route matches.',
      sections: [
        { heading: 'Useful for one general direction', body: 'A branch router may send all otherwise unknown destinations toward an upstream router instead of storing a separate entry for every external network.' },
        { heading: 'Default is not magic reachability', body: 'The next hop still needs to be reachable, and upstream routers still need onward and return routes. A default route only supplies this router’s fallback decision.' },
      ],
      example: { label: 'FALLBACK', setup: 'No connected or static specific route matches 203.0.113.8; a usable /0 route exists.', result: 'The router sends the packet toward the default route’s next hop.' },
      takeaway: '0.0.0.0/0 is chosen only when no longer matching route is available.',
    },
  ],
  questions: [
    { lessonId: 'route-table-purpose', prompt: 'What does a router compare with its route table?', answers: ['The destination IPv4 address', 'The source application password', 'The cable color'], correctAnswerIndex: 0, explanation: 'Destination prefixes drive route lookup.' },
    { lessonId: 'connected-remote-routes', prompt: 'How is an active directly attached subnet normally known?', answers: ['As a connected route', 'As an ARP reply across the internet', 'As a VLAN name'], correctAnswerIndex: 0, explanation: 'Active addressed interfaces create connected routes.' },
    { lessonId: 'reading-route-entry', prompt: 'Which field defines the matching network?', answers: ['Destination prefix', 'Router hostname', 'Cable type'], correctAnswerIndex: 0, explanation: 'Destination plus prefix length defines the range.' },
    { lessonId: 'static-next-hop', prompt: 'What must be true of a static route’s next hop?', answers: ['It must be reachable', 'It must be the final host', 'It must use /0'], correctAnswerIndex: 0, explanation: 'The router needs a path to the named neighbor.' },
    { lessonId: 'adding-static-routes', prompt: 'Traffic reaches LAN C but replies cannot return. What is likely missing?', answers: ['A return route', 'A longer PC cable', 'A second MAC on PC C'], correctAnswerIndex: 0, explanation: 'The reverse direction requires routing too.' },
    { lessonId: 'route-match-test', prompt: 'Which route matches destination 192.168.20.25?', answers: ['192.168.0.0/16', '192.168.10.0/24', '10.0.0.0/8'], correctAnswerIndex: 0, explanation: '192.168.0.0/16 covers addresses whose first two octets are 192.168.' },
    { lessonId: 'longest-prefix', prompt: 'Routes /8, /16, and /24 all match. Which is selected?', answers: ['/24', '/8', 'All simultaneously'], correctAnswerIndex: 0, explanation: '/24 is most specific.' },
    { lessonId: 'default-route', prompt: 'When is 0.0.0.0/0 selected?', answers: ['When no more-specific route matches', 'Before every connected route', 'Only for broadcasts'], correctAnswerIndex: 0, explanation: 'Default is the least-specific fallback.' },
  ],
  cards: [
    ['Routing Table', 'A router’s destination-prefix forwarding instructions.', 'Look up 192.168.30.25.'], ['Connected Route', 'A route from an active directly attached interface.', '192.168.10.0/24 on LAN A.'],
    ['Remote Route', 'A route to a network not directly attached.', 'LAN C through R2.'], ['Route Entry', 'A destination prefix plus forwarding information.', '192.168.30.0/24 via 10.0.12.2.'],
    ['Static Route', 'An administrator-configured route.', 'A fixed route to LAN C.'], ['Next Hop', 'A neighboring router receiving forwarded traffic.', '10.0.12.2.'],
    ['Return Route', 'A route back toward the source network.', 'R3 route to LAN A.'], ['Route Match', 'A route whose prefix-defined range contains the destination.', '192.168.0.0/16 matches 192.168.20.25.'], ['Longest Prefix', 'The most-specific matching route.', '/24 wins over /16.'],
    ['Default Route', 'The /0 fallback for otherwise unmatched destinations.', '0.0.0.0/0.'],
  ],
  lab: ['static-route-board', 'Configure static routes', 'Use the NetBite CLI to build and verify both directions across three routers'],
  recap: ['A bidirectional three-router path', 'Route fields, next hops, return paths, longest match, and default fallback', 'How VLANs separate logical LANs on switches'],
});
