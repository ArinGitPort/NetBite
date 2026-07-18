import { createAdvancedChapter } from '@/content/advanced-content-helpers';

export const chapterFive = createAdvancedChapter({
  id: 5,
  contentVersion: 3,
  title: 'Subnetting',
  summary: 'Build full IPv4 subnet maps, then use them to identify network, usable, and broadcast addresses.',
  lessons: [
    {
      id: 'why-subnet', title: 'Why networks are subnetted', illustration: 'subnet-purpose',
      body: 'Subnetting divides one IPv4 address block into smaller networks. Each resulting subnet receives its own network identity and broadcast boundary. This gives an organization clear places to connect departments, sites, or device groups instead of treating every interface as part of one large local network.',
      sections: [
        { heading: 'One block becomes several networks', body: 'Dividing 192.168.10.0/24 into two /25 subnets creates two separate address ranges. A router is required when traffic must cross from one subnet to the other.' },
        { heading: 'The size tradeoff', body: 'Using more bits for network identity creates more subnets, but fewer addresses remain in each subnet for hosts.' },
      ],
      example: { label: 'DIVIDE ONE /24', setup: 'One 192.168.10.0/24 block must serve two separate LANs.', steps: [
        { id: 'start', label: 'START WITH THE FULL BLOCK', explanation: 'A /24 contains addresses from 192.168.10.0 through 192.168.10.255.' },
        { id: 'split', label: 'DIVIDE IT IN HALF', explanation: 'Two /25 blocks contain 128 addresses each.', value: '192.168.10.0–192.168.10.127 / 192.168.10.128–192.168.10.255' },
        { id: 'separate', label: 'TREAT EACH HALF AS A NETWORK', explanation: 'The two ranges now have separate network and broadcast boundaries.' },
      ], result: 'The original /24 now supplies two smaller /25 networks without changing the first three octets.' },
      takeaway: 'Subnetting creates smaller IP network and broadcast boundaries from a larger address block.',
    },
    {
      id: 'masks-prefixes', title: 'Masks and prefixes describe one boundary', illustration: 'subnet-mask',
      body: 'A prefix length and subnet mask describe the same network-versus-host boundary. The prefix counts leading network bits. The mask writes those network bits as binary 1s and host bits as binary 0s, then displays each octet in decimal.',
      sections: [
        { heading: 'Read the pair together', body: 'A host address without its prefix does not identify a subnet. Write 192.168.10.70/26 or pair the address with mask 255.255.255.192.' },
        { heading: 'This chapter changes the fourth octet', body: 'For /24 through /27, the first three mask octets remain 255.255.255. Only the final mask octet changes.' },
      ],
      example: { label: 'TWO FORMS OF /26', setup: 'Host configuration: 192.168.10.70/26.', steps: [
        { id: 'prefix', label: 'COUNT NETWORK BITS', explanation: '/26 means 26 of the 32 IPv4 bits are network bits.' },
        { id: 'full-octets', label: 'FILL THREE OCTETS', explanation: 'The first 24 network bits fill the first three mask octets.', value: '255.255.255' },
        { id: 'remaining', label: 'PLACE TWO MORE NETWORK BITS', explanation: 'The final mask octet begins with binary 11, followed by six host-bit zeros.', value: '11000000 = 192' },
      ], result: 'The complete /26 mask is 255.255.255.192.' },
      takeaway: 'Prefix length and subnet mask are two forms of the same bit boundary.',
    },
    {
      id: 'subnet-borrowed-bits', title: 'Borrowed bits create smaller blocks', illustration: 'subnet-borrowed-bits',
      body: 'A /24 leaves all eight bits of the fourth octet for hosts. Moving to /25, /26, or /27 takes one, two, or three of those positions for the network portion. The remaining positions still identify addresses inside each smaller subnet.',
      sections: [
        { heading: 'Only the needed bit values', body: 'The first final-octet bit is worth 128, the second 64, and the third 32. Therefore /25 uses mask value 128, /26 uses 128 + 64 = 192, and /27 uses 128 + 64 + 32 = 224.' },
        { heading: 'Do not convert whole addresses', body: 'For the practical /24–/27 scope, recognizing these three leading bit patterns is enough. Full binary AND calculations are not required.' },
      ],
      example: { label: 'BUILD A /27 MASK', setup: 'Extend a /24 boundary by three bits.', steps: [
        { id: 'borrow', label: 'BORROW THREE POSITIONS', explanation: 'Mark the first three fourth-octet positions as network bits.', value: '11100000' },
        { id: 'add', label: 'ADD THEIR VALUES', explanation: 'The active positions contribute 128, 64, and 32.', value: '128 + 64 + 32 = 224' },
        { id: 'write', label: 'WRITE THE FULL MASK', explanation: 'The first three octets were already all network bits.', value: '255.255.255.224' },
      ], result: '/27 and 255.255.255.224 state the same network boundary.' },
      takeaway: 'Borrowed leading host positions explain why /25, /26, and /27 use mask values 128, 192, and 224.',
    },
    {
      id: 'host-bits-address-count', title: 'Host bits determine address count', illustration: 'host-bits',
      body: 'After the prefix, the remaining bits form the host portion. Every host bit can be 0 or 1, so h host bits produce 2^h possible address combinations. These combinations determine the total size of one subnet block.',
      sections: [
        { heading: 'From /24 to /27', body: '/24 leaves 8 host bits for 256 total addresses; /25 leaves 7 for 128; /26 leaves 6 for 64; /27 leaves 5 for 32.' },
        { heading: 'Total is not usable', body: 'In these conventional subnets, the first combination identifies the network and the last is broadcast. Subtract two to find the ordinary usable-host count.' },
      ],
      example: { label: 'COUNT ONE /27', setup: 'Find the size of any /27 subnet.', steps: [
        { id: 'remaining', label: 'COUNT HOST BITS', explanation: 'IPv4 has 32 bits, and 27 are network bits.', value: '32 − 27 = 5 host bits' },
        { id: 'total', label: 'COUNT COMBINATIONS', explanation: 'Five two-state positions create 32 combinations.', value: '2^5 = 32 total addresses' },
        { id: 'usable', label: 'REMOVE RESERVED ENDPOINTS', explanation: 'Network and broadcast are not ordinary host settings.', value: '32 − 2 = 30 usable addresses' },
      ], result: 'Every conventional /27 block has 32 total addresses and 30 usable host addresses.' },
      takeaway: 'Remaining host bits determine total addresses; conventional usable count is two fewer.',
    },
    {
      id: 'subnet-block-size', title: 'Block size separates network starts', illustration: 'block-size',
      body: 'Block size is the number of addresses from one subnet network address to the next. It is also the total address count for one subnet. For /24 through /27, block sizes are 256, 128, 64, and 32.',
      sections: [
        { heading: 'Use host bits', body: 'A /26 leaves six host bits, so 2^6 = 64 addresses. Its network starts therefore advance by 64 in the fourth octet.' },
        { heading: 'Starts are not ordinary hosts', body: 'Values such as 0, 64, 128, and 192 are candidate /26 network starts. They define blocks; they are not a list of usable interface addresses.' },
      ],
      example: { label: 'STEP THROUGH A /26', setup: 'Find every /26 network start inside 192.168.10.0/24.', steps: [
        { id: 'size', label: 'FIND BLOCK SIZE', explanation: '/26 leaves six host bits.', value: '2^6 = 64' },
        { id: 'start', label: 'BEGIN AT THE /24 START', explanation: 'The containing block begins at full address 192.168.10.0.' },
        { id: 'add', label: 'REPEATEDLY ADD 64', explanation: 'Stop before the fourth octet would exceed 255.', value: '192.168.10.0, 192.168.10.64, 192.168.10.128, 192.168.10.192' },
      ], result: 'Those four full addresses are the possible /26 network starts inside this /24.' },
      takeaway: 'Block size is the distance between consecutive full subnet network addresses.',
    },
    {
      id: 'subnet-map', title: 'Build a complete subnet map', illustration: 'subnet-map',
      body: 'A subnet map turns a block-size list into complete address intervals. Each network start begins one interval. The address immediately before the next start ends it. Writing full addresses keeps the unchanged octets visible.',
      sections: [
        { heading: 'Four /26 intervals', body: 'The /26 starts 192.168.10.0, 192.168.10.64, 192.168.10.128, and 192.168.10.192 create four 64-address blocks inside 192.168.10.0/24.' },
        { heading: 'The final block ends at 255', body: 'There is no fifth start inside this /24. Its final /26 block therefore ends at the final address of the containing /24, 192.168.10.255.' },
      ],
      example: { label: 'MAP THE SECOND /26', setup: 'The second network starts at 192.168.10.64.', steps: [
        { id: 'current', label: 'CURRENT START', explanation: 'Use the second value in the full start list.', value: '192.168.10.64' },
        { id: 'next', label: 'NEXT START', explanation: 'Adding the 64-address block size gives the following network.', value: '192.168.10.128' },
        { id: 'end', label: 'END BEFORE THE NEXT START', explanation: 'Subtract one address from the next start.', value: '192.168.10.127' },
      ], result: 'The second /26 interval is 192.168.10.64 through 192.168.10.127.' },
      takeaway: 'A subnet interval starts at one full network address and ends immediately before the next.',
    },
    {
      id: 'finding-boundaries', title: 'Find which subnet contains a host', illustration: 'subnet-boundaries',
      body: 'To locate a host, first build or read the subnet intervals for its prefix. Then find the one whose start is not greater than the host and whose end is not less than the host. Do not round the host address as an ordinary decimal number.',
      sections: [
        { heading: 'Use full-address containment', body: 'For 192.168.10.70/26, the neighboring starts are 192.168.10.64 and 192.168.10.128. The first begins the host’s interval; the second begins the following subnet.' },
        { heading: 'Keep host and network roles separate', body: '192.168.10.70 is the interface being tested. It is not the network address merely because it appears in the question.' },
      ],
      example: { label: 'LOCATE 192.168.10.70/26', setup: 'Use the /26 map for 192.168.10.0/24.', steps: [
        { id: 'starts', label: 'READ THE STARTS', explanation: 'The relevant consecutive starts are 192.168.10.64 and 192.168.10.128.' },
        { id: 'compare', label: 'COMPARE THE HOST', explanation: '192.168.10.70 is at least 192.168.10.64 and below 192.168.10.128.' },
        { id: 'choose', label: 'CHOOSE THE LOWER START', explanation: 'That start identifies the containing subnet.', value: '192.168.10.64/26' },
      ], result: 'Host 192.168.10.70 belongs to network 192.168.10.64/26.' },
      takeaway: 'The containing network is the valid full block start immediately at or below the host address.',
      checkpoint: { prompt: 'YOUR TURN: Which /26 network contains 192.168.10.150?', correctChoiceId: '128', hints: ['A /26 block size is 64.', 'The full starts are 192.168.10.0, 192.168.10.64, 192.168.10.128, and 192.168.10.192.'], choices: [
        { id: '128', label: '192.168.10.128/26', feedback: 'Correct. 192.168.10.150 lies between start 192.168.10.128 and the next start 192.168.10.192.' },
        { id: '150', label: '192.168.10.150/26', feedback: '192.168.10.150 is the host being tested, not one of the 64-address network starts.' },
        { id: '192', label: '192.168.10.192/26', feedback: '192.168.10.192 starts the next block after the one containing 192.168.10.150.' },
      ] },
    },
    {
      id: 'network-broadcast-hosts', title: 'Mark network, usable, and broadcast addresses', illustration: 'subnet-range',
      body: 'After finding the containing interval, assign a role to its endpoints. The first address identifies the network. The last address is the subnet-directed broadcast. Ordinary host addresses lie strictly between those two reserved endpoints.',
      sections: [
        { heading: 'Use the next network start', body: 'For 192.168.10.64/26, the next network starts at 192.168.10.128. One address earlier, 192.168.10.127, is therefore broadcast.' },
        { heading: 'Move inward for usable hosts', body: 'Add one to the network address for the first usable host. Subtract one from broadcast for the last usable host.' },
      ],
      example: { label: 'LABEL 192.168.10.64/26', setup: 'The complete interval is 192.168.10.64 through 192.168.10.127.', steps: [
        { id: 'network', label: 'FIRST ADDRESS', explanation: 'The interval start identifies the subnet.', value: 'NETWORK 192.168.10.64' },
        { id: 'broadcast', label: 'LAST ADDRESS', explanation: 'The address before next network 192.168.10.128 reaches the subnet broadcast.', value: 'BROADCAST 192.168.10.127' },
        { id: 'usable', label: 'ADD THE HOST RANGE', explanation: 'Everything between the reserved endpoints is usable for ordinary hosts.', value: 'USABLE 192.168.10.65–192.168.10.126' },
      ], result: 'The network, usable range, and broadcast now describe the entire /26 interval without shorthand.' },
      takeaway: 'Network is first, broadcast is last, and usable host addresses fall between them.',
      checkpoint: { prompt: 'YOUR TURN: What is the broadcast address for 192.168.10.160/27?', correctChoiceId: '191', hints: ['A /27 has block size 32.', 'The next network after 192.168.10.160 is 192.168.10.192. Broadcast is one address earlier.'], choices: [
        { id: '191', label: '192.168.10.191', feedback: 'Correct. The next /27 starts at 192.168.10.192, so 192.168.10.191 ends the current subnet.' },
        { id: '190', label: '192.168.10.190', feedback: '192.168.10.190 is the last usable host, one address before broadcast.' },
        { id: '192', label: '192.168.10.192', feedback: '192.168.10.192 is the next subnet’s network address.' },
      ] },
    },
    {
      id: 'subnet-repeatable-method', title: 'Use one repeatable subnet method', illustration: 'subnet-method',
      body: 'Subnet problems become manageable when solved in a fixed order. Identify the prefix, count host bits, calculate block size, list full network starts, locate the host, and then label network, usable, and broadcast addresses.',
      sections: [
        { heading: 'Write intermediate values', body: 'Do not guess from the host address. Recording host bits, block size, and full network starts makes every later result explainable and easier to verify.' },
        { heading: 'Check the completed range', body: 'The network must be a valid start, broadcast must be one address before the next start, and the tested host must lie inside the interval.' },
      ],
      example: { label: 'COMPLETE 192.168.10.70/26', setup: 'Find the network and complete usable range.', steps: [
        { id: 'bits', label: 'PREFIX TO HOST BITS', explanation: 'IPv4 has 32 bits.', value: '32 − 26 = 6 host bits' },
        { id: 'block', label: 'HOST BITS TO BLOCK SIZE', explanation: 'Six host bits create 64 addresses.', value: '2^6 = 64' },
        { id: 'starts', label: 'LIST FULL NETWORK STARTS', explanation: 'Advance by 64 inside the containing /24.', value: '192.168.10.0, 192.168.10.64, 192.168.10.128, 192.168.10.192' },
        { id: 'locate', label: 'LOCATE THE HOST', explanation: '192.168.10.70 lies from 192.168.10.64 through 192.168.10.127.' },
        { id: 'label', label: 'LABEL THE RANGE', explanation: 'Reserve the two endpoints and keep the addresses between them for hosts.', value: 'NETWORK 192.168.10.64 / USABLE 192.168.10.65–192.168.10.126 / BROADCAST 192.168.10.127' },
      ], result: 'Every answer follows from visible intermediate steps rather than an unexplained decimal jump.' },
      takeaway: 'Prefix → host bits → block size → full starts → containing range is a reliable subnet workflow.',
    },
  ],
  questions: [
    { lessonId: 'why-subnet', prompt: 'What does subnetting create from a larger address block?', answers: ['Smaller IP network and broadcast boundaries', 'Shorter MAC addresses', 'A network without routers'], correctAnswerIndex: 0, explanation: 'Subnetting divides a larger block into smaller networks.' },
    { lessonId: 'masks-prefixes', prompt: 'Which complete mask matches /26?', answers: ['255.255.255.192', '255.255.255.0', '255.255.255.224'], correctAnswerIndex: 0, explanation: '/26 uses two leading network bits in the final mask octet: 128 + 64 = 192.' },
    { lessonId: 'subnet-borrowed-bits', prompt: 'Why is the final mask octet for /27 equal to 224?', answers: ['128 + 64 + 32 are network-bit values', 'A /27 always contains 224 hosts', 'The prefix is multiplied by eight'], correctAnswerIndex: 0, explanation: 'The first three final-octet positions are network bits, and their values total 224.' },
    { lessonId: 'host-bits-address-count', prompt: 'How many total addresses are in one /27 subnet?', answers: ['32', '30', '27'], correctAnswerIndex: 0, explanation: 'Five host bits produce 2^5 = 32 total addresses; 30 are ordinary usable host addresses.' },
    { lessonId: 'subnet-block-size', prompt: 'What is the block size for /26?', answers: ['64', '26', '192'], correctAnswerIndex: 0, explanation: 'Six host bits produce 64-address blocks.' },
    { lessonId: 'subnet-map', prompt: 'A /26 network starts at 192.168.10.64 and the next starts at 192.168.10.128. Where does the first interval end?', answers: ['192.168.10.127', '192.168.10.128', '192.168.10.126'], correctAnswerIndex: 0, explanation: 'An interval ends one address before the next network start.' },
    { lessonId: 'finding-boundaries', prompt: 'Which /26 network contains host 192.168.10.150?', answers: ['192.168.10.128/26', '192.168.10.150/26', '192.168.10.192/26'], correctAnswerIndex: 0, explanation: 'The host lies inside the full 192.168.10.128–192.168.10.191 interval.' },
    { lessonId: 'network-broadcast-hosts', prompt: 'Which address is usable inside 192.168.10.160/27?', answers: ['192.168.10.190', '192.168.10.160', '192.168.10.191'], correctAnswerIndex: 0, explanation: '192.168.10.160 is network and 192.168.10.191 is broadcast, leaving 192.168.10.161–192.168.10.190 usable.' },
  ],
  cards: [
    ['Subnet', 'A smaller IP network made from a larger address block.', '192.168.10.64/26.'],
    ['Subnet Mask', 'Decimal form of the network and host bit boundary.', '255.255.255.192 matches /26.'],
    ['Borrowed Bits', 'Host positions reassigned to extend the network prefix.', '/27 borrows three fourth-octet positions from a /24.'],
    ['Host Bits', 'Bits remaining after the network prefix.', '/27 leaves five host bits.'],
    ['Block Size', 'Distance between consecutive complete subnet starts.', '/26 advances from 192.168.10.64 to 192.168.10.128.'],
    ['Subnet Map', 'The complete address intervals created by one prefix.', 'Four /26 intervals fit inside one /24.'],
    ['Network Address', 'First address identifying the subnet.', '192.168.10.64/26.'],
    ['Broadcast Address', 'Last address targeting every host in the subnet.', '192.168.10.127.'],
    ['Usable Range', 'Ordinary host addresses between network and broadcast.', '192.168.10.65 through 192.168.10.126.'],
  ],
  lab: ['subnet-range-desk', 'Calculate complete subnet ranges', 'Use hints and full IPv4 addresses across /24, /25, /26, and /27'],
  recap: ['Four verified full-address subnet ranges', 'Masks, borrowed bits, host counts, blocks, maps, and reserved endpoints', 'How hosts decide between direct and gateway delivery'],
});
