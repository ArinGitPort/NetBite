import { createAdvancedChapter } from '@/content/advanced-content-helpers';

export const chapterFour = createAdvancedChapter({
  id: 4,
  flashcardVersion: 3,
  title: 'IPv4 Addressing',
  summary: 'Build IPv4 understanding from bits and octets before separating network and host identity.',
  lessons: [
    {
      id: 'ipv4-identifies-interfaces', title: 'IPv4 and MAC identities have different scope', illustration: 'ipv4-address',
      body: 'An IPv4 address gives a network interface a logical identity within an IP network. A MAC address supports delivery on a local Ethernet link; an IPv4 address can remain meaningful while routers move the contained datagram across several different links.',
      sections: [
        { heading: 'Logical location', body: 'The address combines a network portion with a host portion. Routers use the network identity to move traffic toward the correct destination network.' },
        { heading: 'Assigned configuration', body: 'IPv4 addresses are configured or assigned rather than being determined by the cable. Moving an interface to another subnet normally requires a suitable address for that subnet.' },
      ],
      example: { label: 'TWO IDENTITIES', setup: 'PC A sends an IPv4 datagram through a router to a remote PC.', presentation: 'guided', visual: { illustration: 'ipv4-address', stageIds: ['ip-endpoints', 'first-link', 'router', 'second-link'] }, steps: [
        { id: 'ip-endpoints', label: 'SET THE IP ENDPOINTS', explanation: 'The IPv4 header identifies PC A as the source and the remote PC as the destination. Routers later inspect the destination IPv4 address.', value: 'SOURCE IP A / DESTINATION IP B' },
        { id: 'first-link', label: 'BUILD THE FIRST FRAME', explanation: 'PC A chooses its local next hop and resolves that interface\'s MAC address. The Ethernet frame carries PC A\'s source MAC and the next-hop destination MAC.', value: 'LOCAL-LINK MAC ADDRESSES' },
        { id: 'router', label: 'CROSS THE ROUTER', explanation: 'The router removes the incoming Ethernet framing, inspects the destination IPv4 address, and selects another outgoing link.', value: 'IP DESTINATION STILL PC B' },
        { id: 'second-link', label: 'BUILD A NEW FRAME', explanation: 'The router uses new source and destination MAC addresses for the next link while forwarding the same endpoint IP identities.', value: 'NEW MACS / SAME IP ENDPOINTS' },
      ], result: 'IPv4 identifies the end-to-end logical endpoints; Ethernet MAC addresses identify the sender and next receiver on each local link.' },
      takeaway: 'MAC identifies local interfaces; IPv4 supplies logical interface and network identity.',
    },
    {
      id: 'reading-dotted-decimal', title: 'Read four dotted-decimal octets', illustration: 'ipv4-octets',
      body: 'An IPv4 address contains 32 bits divided into four groups of eight bits. Each eight-bit group is an octet, and dotted-decimal notation displays the four octets as decimal values separated by three dots.',
      sections: [
        { heading: 'Valid written shape', body: 'A complete address has exactly four octets. Because eight bits can represent values from 0 through 255, 192.168.10.25 is valid but 192.168.10.300 is not.' },
        { heading: 'Dots are separators', body: 'The dots make the four octets readable. They do not add bits, and a missing or extra octet creates an invalid IPv4 address.' },
      ],
      example: { label: 'BREAK IT APART', setup: 'Address: 192.168.10.25', result: 'Octets: 192 / 168 / 10 / 25. Each value fits the 0–255 range.' },
      takeaway: 'IPv4 uses four decimal octets, each representing eight bits and ranging from 0 to 255.',
      checkpoint: { prompt: 'Which entry is a valid dotted-decimal IPv4 address?', correctChoiceId: 'valid', choices: [
        { id: 'valid', label: '10.20.30.40', feedback: 'Correct. It has four octets and every value is between 0 and 255.' },
        { id: 'large', label: '10.20.30.400', feedback: 'An octet cannot exceed 255.' },
        { id: 'short', label: '10.20.30', feedback: 'IPv4 dotted decimal requires four octets.' },
      ] },
    },
    {
      id: 'bits-inside-octet', title: 'Bits build an octet', illustration: 'octet-bits',
      body: 'A bit has two possible values: 0 or 1. Eight bit positions form one IPv4 octet. From left to right, their place values are 128, 64, 32, 16, 8, 4, 2, and 1.',
      sections: [
        { heading: 'Add the active places', body: 'A 1 means its place value contributes to the total; a 0 means it does not. Binary 11000000 equals 128 + 64, which is decimal 192.' },
        { heading: 'Why this matters', body: 'Prefix lengths count leading bits, not decimal digits. Understanding the eight positions makes /24, /25, and later subnet boundaries less mysterious.' },
      ],
      example: { label: 'READ ONE OCTET', setup: 'Convert binary 11000000 without converting a complete IPv4 address.', presentation: 'guided', visual: { illustration: 'octet-bits', stageIds: ['positions', 'active', 'sum'] }, steps: [
        { id: 'positions', label: 'LABEL THE POSITIONS', explanation: 'From left to right, the first positions are worth 128, 64, and 32.' },
        { id: 'active', label: 'KEEP ACTIVE VALUES', explanation: 'The first two bits are 1; the remaining bits are 0.', value: '128 + 64' },
        { id: 'sum', label: 'ADD THE ACTIVE VALUES', explanation: 'Only active positions contribute to the decimal octet.', value: '192' },
      ], result: 'Binary 11000000 equals decimal 192, a connection Chapter 5 uses for a /26 mask.' },
      takeaway: 'An octet is eight bit positions whose active place values produce a decimal number.',
    },
    {
      id: 'network-host-identity', title: 'Every address has network and host portions', illustration: 'network-host',
      body: 'An IPv4 address alone does not show where the network identity ends. The prefix length supplies that boundary. Bits inside the prefix identify the network; the remaining bits identify an interface within that network.',
      sections: [
        { heading: 'Shared network portion', body: 'Interfaces in the same subnet use the same network portion. Their host portions must differ so each usable interface address remains unique.' },
        { heading: 'The boundary can move', body: 'It does not always fall on a dot. A /24 does, but /25 through /27 divide bits inside the final octet, which Chapter 5 calculates.' },
      ],
      example: { label: 'ADDRESS WITH A BOUNDARY', setup: '192.168.10.25/24', result: 'The /24 network is 192.168.10.0/24; complete host address 192.168.10.25 identifies one interface in that network.' },
      takeaway: 'The prefix boundary separates the shared network identity from the unique host identity.',
    },
    {
      id: 'prefixes-mark-network', title: 'A prefix counts leading network bits', illustration: 'ipv4-prefix',
      body: 'Slash notation writes the prefix length after an address. In 192.168.10.25/24, /24 means the first 24 of 32 bits form the network portion, leaving eight bits for the host portion.',
      sections: [
        { heading: 'Find the /24 network', body: 'The first three octets contain 24 bits, so they stay as 192.168.10. Setting all eight host bits to zero produces network address 192.168.10.0.' },
        { heading: 'Compare destinations', body: 'A host applies the same prefix boundary to itself and the destination. Matching network portions indicate local delivery; different portions require a router.' },
      ],
      example: { label: 'LOCAL COMPARISON', setup: 'Host 192.168.10.25/24 considers destination 192.168.10.80.', presentation: 'guided', visual: { illustration: 'ipv4-prefix', stageIds: ['host-network', 'destination-network', 'compare'] }, steps: [
        { id: 'host-network', label: 'DERIVE THE HOST NETWORK', explanation: '/24 keeps the first three octets and sets the final host octet to zero.', value: '192.168.10.0/24' },
        { id: 'destination-network', label: 'DERIVE THE DESTINATION NETWORK', explanation: 'Apply the same /24 boundary to the destination.', value: '192.168.10.0/24' },
        { id: 'compare', label: 'COMPARE THE RESULTS', explanation: 'The network identities match.', value: 'LOCAL DESTINATION' },
      ], result: 'The host can prepare direct local delivery instead of choosing its default gateway.' },
      takeaway: 'A prefix length counts network bits and lets a host determine its network identity.',
      checkpoint: { prompt: 'In 192.168.10.25/24, how many bits remain for the host portion?', correctChoiceId: 'eight', choices: [
        { id: 'eight', label: '8 BITS', feedback: 'Correct. IPv4 has 32 bits, and 32 − 24 leaves 8 host bits.' },
        { id: 'twenty-four', label: '24 BITS', feedback: 'Twenty-four is the network portion, not the remaining host portion.' },
        { id: 'four', label: '4 BITS', feedback: 'The four displayed octets are not the number of remaining bits.' },
      ] },
    },
    {
      id: 'private-ipv4-ranges', title: 'Private IPv4 has three defined ranges', illustration: 'private-ranges',
      body: 'RFC 1918 reserves three IPv4 blocks for private internets: 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16. Organizations can reuse these blocks internally because they are not globally routed as public internet destinations.',
      sections: [
        { heading: 'Private does not mean automatically secure', body: 'A private address describes allocation and routing scope. Firewalls, authentication, updates, and other controls still provide security.' },
        { heading: 'Not every familiar-looking address is private', body: 'Only the defined blocks qualify. For example, 172.20.1.5 is private, but 172.40.1.5 is outside the 172.16.0.0–172.31.255.255 private range.' },
      ],
      example: { label: 'PRIVATE EXAMPLES', setup: '10.5.0.8 / 172.20.4.2 / 192.168.10.25', result: 'All three fall inside one of the RFC 1918 private blocks.' },
      takeaway: 'Private IPv4 space consists of three specific reusable internal address blocks.',
    },
    {
      id: 'private-valid-hosts', title: 'A valid host setting needs a usable identity', illustration: 'private-ipv4',
      body: 'A syntactically valid IPv4 address is not automatically a valid host configuration. The address must be usable in the selected subnet, unique on that network, and paired with the correct prefix.',
      sections: [
        { heading: 'Reserved endpoints', body: 'In the beginner subnets used here, the network address identifies the subnet and the broadcast address targets every host in it. Neither is assigned as an ordinary host address.' },
        { heading: 'Gateway consistency', body: 'If the host needs remote access, its default gateway must be a usable router-interface address on the same local subnet. Chapter 6 explains why.' },
      ],
      example: { label: 'VALID /24 HOST', setup: 'Network 192.168.10.0/24 already contains 192.168.10.10; gateway is 192.168.10.1.', result: '192.168.10.25/24 is usable and unique. 192.168.10.0 is network, 192.168.10.255 is broadcast, 192.168.10.10 is duplicate, and 192.168.20.25 is off-network.' },
      takeaway: 'A host address must be syntactically valid, usable, unique, and consistent with its prefix and local gateway.',
      checkpoint: { prompt: 'Which address is a usable new host in 192.168.10.0/24 if 192.168.10.10 is already taken?', correctChoiceId: 'host', choices: [
        { id: 'host', label: '192.168.10.25', feedback: 'Correct. It is inside the subnet, not reserved, and not the listed duplicate.' },
        { id: 'network', label: '192.168.10.0', feedback: 'This is the /24 network address.' },
        { id: 'broadcast', label: '192.168.10.255', feedback: 'This is the /24 broadcast address.' },
      ] },
    },
  ],
  questions: [
    { lessonId: 'ipv4-identifies-interfaces', prompt: 'Which identity remains useful as data crosses several routed Ethernet links?', answers: ['The destination IPv4 address', 'One original cable label', 'The first switch port'], correctAnswerIndex: 0, explanation: 'IPv4 identifies the logical destination across routed networks.' },
    { lessonId: 'reading-dotted-decimal', prompt: 'Why is 192.168.10.300 invalid?', answers: ['One octet exceeds 255', 'It needs a fifth octet', '192 can never begin an address'], correctAnswerIndex: 0, explanation: 'Each eight-bit octet ranges from 0 through 255.' },
    { lessonId: 'bits-inside-octet', prompt: 'What decimal value is binary 11000000?', answers: ['192', '128', '255'], correctAnswerIndex: 0, explanation: 'The active 128 and 64 places total 192.' },
    { lessonId: 'network-host-identity', prompt: 'What tells you where an IPv4 network portion ends?', answers: ['The prefix length', 'The MAC address', 'The cable category'], correctAnswerIndex: 0, explanation: 'The prefix length defines the boundary between network and host bits.' },
    { lessonId: 'prefixes-mark-network', prompt: 'What is the network for 192.168.10.25/24?', answers: ['192.168.10.0/24', '192.168.10.25/24', '192.168.10.255/24'], correctAnswerIndex: 0, explanation: 'Setting the eight /24 host bits to zero produces full network address 192.168.10.0.' },
    { lessonId: 'private-ipv4-ranges', prompt: 'Which address is inside RFC 1918 private space?', answers: ['172.20.5.8', '172.40.5.8', '193.168.5.8'], correctAnswerIndex: 0, explanation: '172.20.5.8 falls inside 172.16.0.0/12.' },
    { lessonId: 'private-valid-hosts', prompt: 'Why can’t 192.168.10.255 be a normal host in 192.168.10.0/24?', answers: ['It is the subnet broadcast address', 'It is always a router address', 'It is public space'], correctAnswerIndex: 0, explanation: 'The final /24 address is reserved for subnet broadcast.' },
    { lessonId: 'private-valid-hosts', prompt: 'PC B receives the same IPv4 address as PC A. What should change?', answers: ['Assign PC B a unique usable address', 'Keep both because their MACs differ', 'Rename PC B only'], correctAnswerIndex: 0, explanation: 'Host IPv4 addresses must be unique within the subnet.' },
  ],
  cards: [
    ['ipv4-identifies-interfaces', 'How do IPv4 and MAC addresses differ in scope?', 'IPv4 provides a logical network identity used across routed paths; a MAC address identifies an interface for local-link delivery.', 'A packet can keep the same endpoint IPv4 addresses while its Ethernet MAC addresses change at a router.'],
    ['reading-dotted-decimal', 'How is a 32-bit IPv4 address normally displayed?', 'As four decimal octets separated by dots.', 'Each octet represents eight bits and must be from 0 through 255.'],
    ['bits-inside-octet', 'What decimal value does the bit pattern 11111111 represent?', '255.', 'The eight place values 128+64+32+16+8+4+2+1 total 255.'],
    ['reading-dotted-decimal', 'Why is 192.168.10.300 not a valid IPv4 address?', 'An octet cannot exceed 255.', 'Every IPv4 octet is exactly eight bits, so its decimal range is 0 through 255.'],
    ['network-host-identity', 'What two identities are contained in an IPv4 interface address?', 'A network portion and a host portion.', 'The prefix determines the boundary between the shared subnet identity and the interface identity.'],
    ['prefixes-mark-network', 'What does /24 mean in 192.168.10.25/24?', 'The first 24 bits identify the network and the remaining 8 bits identify the host.', 'For this address, the derived network is 192.168.10.0/24.'],
    ['private-ipv4-ranges', 'Which three IPv4 blocks are reserved for private internal use?', '10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16.', 'Private describes address scope; it does not mean automatically secure.'],
    ['private-valid-hosts', 'Why can 192.168.10.0/24 not be assigned as an ordinary host address?', 'It is the network address identifying the subnet itself.', 'In this conventional /24, usable hosts are 192.168.10.1 through 192.168.10.254.'],
    ['private-valid-hosts', 'Why can 192.168.10.255/24 not be assigned as an ordinary host address?', 'It is the broadcast address for the subnet.', 'The first address identifies the network and the last targets all hosts in the conventional subnet.'],
    ['private-valid-hosts', 'Two PCs on the same LAN both use 192.168.10.25/24. What is wrong?', 'They have duplicate IPv4 addresses.', 'Each active interface in the same subnet needs a unique usable host address.'],
  ],
  lab: ['ipv4-configurator', 'Configure a /24 host', 'Reject invalid, duplicate, reserved, and off-network settings'],
  recap: ['A valid PC IPv4 configuration', 'Bits, octets, prefixes, private space, and host rules', 'How prefixes divide a block into smaller subnets'],
});
