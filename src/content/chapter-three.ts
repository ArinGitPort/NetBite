import { buildLessons } from '@/content/lesson-builder';
import type { ChapterDefinition, Flashcard, QuizQuestion } from '@/content/types';

const PC_A = '02:00:00:00:00:0A';
const PC_B = '02:00:00:00:00:0B';

export const chapterThreeLessons = buildLessons('3', [
  {
    id: 'mac-addresses', title: 'MAC addresses identify interfaces', illustration: 'mac-address',
    body: `A media access control address, or MAC address, identifies a network interface for local Ethernet delivery. It is 48 bits, commonly displayed as six hexadecimal bytes such as ${PC_A}.`,
    sections: [
      { heading: 'Read the displayed address', body: 'Each pair of hexadecimal digits represents one byte. Six pairs equal six bytes, and six bytes equal 48 bits. The separators improve readability but are not extra address data.' },
      { heading: 'Interface identity', body: 'A MAC address belongs to an interface role, not to an entire route or physical cable. A device with several network interfaces can have several MAC addresses.' },
    ],
    example: { label: 'TWO LOCAL INTERFACES', setup: `PC A uses ${PC_A}; PC B uses ${PC_B}.`, result: 'The switch can distinguish their Ethernet interfaces even though both PCs attach to the same LAN.' },
    takeaway: 'A displayed MAC address contains six hexadecimal bytes identifying one network interface.',
    termNote: { term: 'HEXADECIMAL', definition: 'A number system using 0–9 and A–F. Two hexadecimal digits display one byte.' },
  },
  {
    id: 'mac-source-destination', title: 'Source and destination have different jobs', illustration: 'mac-fields',
    body: 'An Ethernet frame carries both a source MAC and destination MAC. The source identifies the interface that sent the frame onto this local link, while the destination identifies the intended local-link receiver or group.',
    sections: [
      { heading: 'Source tells where it came from', body: 'A switch examines the source to learn which interface is reachable through the ingress port. Learning therefore follows the frame’s actual arrival path.' },
      { heading: 'Destination tells where it should go', body: 'The switch compares the destination with its MAC address table to choose an output. It does not learn the destination simply because that address appears in a frame.' },
    ],
    example: { label: 'FRAME A TO B', setup: `A frame enters port 1 with source ${PC_A} and destination ${PC_B}.`, steps: [
      { id: 'source', label: 'READ THE SOURCE', explanation: 'The switch associates the arriving source with the ingress port.', value: `${PC_A} → PORT 1` },
      { id: 'destination', label: 'READ THE DESTINATION', explanation: 'The switch searches its table for the intended receiver.', value: PC_B },
      { id: 'act', label: 'CHOOSE AN OUTPUT', explanation: 'A known destination uses its learned port; an unknown one is flooded to other eligible ports.' },
    ], result: 'Source learning and destination forwarding are two ordered decisions with different address roles.' },
    takeaway: 'Switches learn from the source MAC and make forwarding decisions from the destination MAC.',
    checkpoint: { prompt: 'Which field teaches the switch where the sender is connected?', correctChoiceId: 'source', choices: [
      { id: 'source', label: 'SOURCE MAC', feedback: 'Correct. The source arrived through the ingress port, so the switch can map that address to the port.' },
      { id: 'destination', label: 'DESTINATION MAC', feedback: 'The destination guides forwarding; it does not prove where that interface is connected.' },
      { id: 'payload', label: 'PAYLOAD', feedback: 'The payload carries upper-layer data, not the switch’s source-to-port learning identity.' },
    ] },
  },
  {
    id: 'switch-source-learning', title: 'How a switch learns', illustration: 'mac-learning',
    body: 'When a frame enters a switch, the switch records or refreshes a mapping between the source MAC address and the ingress port. These mappings form the dynamic MAC address table used for later forwarding decisions.',
    sections: [
      { heading: 'Ingress means arrival', body: 'If PC A’s frame arrives on port 1, the switch learns PC A on port 1. It never adds the ingress port to that same frame’s output list.' },
      { heading: 'Mappings can change', body: 'If the same source later arrives on a different port, the switch updates the mapping. Real switches also age dynamic entries, but aging timers are outside this beginner chapter.' },
    ],
    example: { label: 'TABLE UPDATE', setup: `A frame with source ${PC_A} enters port 1.`, result: `The table records ${PC_A} → port 1 before the switch handles the destination.` },
    takeaway: 'A switch maps each arriving frame’s source MAC to its ingress port.',
  },
  {
    id: 'known-unknown-unicast', title: 'Known unicast uses one learned port', illustration: 'switch-forwarding',
    body: 'A unicast frame is intended for one destination interface. When the destination MAC already has a table entry, the switch has a known unicast and can select the single learned output port.',
    sections: [
      { heading: 'Targeted forwarding', body: 'If PC B is learned on port 2, a frame for PC B is forwarded to port 2 rather than copied to every other device.' },
      { heading: 'Ingress exclusion still applies', body: 'If the learned destination points to the same port where the frame arrived, the switch does not send the frame back through that port. The destination is already on that segment.' },
    ],
    example: { label: 'KNOWN DESTINATION', setup: `${PC_B} is stored on port 2; a frame for PC B enters port 1.`, result: 'The switch forwards only through port 2.' },
    takeaway: 'Known unicast forwarding uses the destination’s single learned port.',
  },
  {
    id: 'unknown-unicast-flooding', title: 'Unknown unicast must be flooded', illustration: 'unknown-unicast',
    body: 'A unicast destination may not yet appear in the MAC address table. The switch cannot choose one learned port, so it floods the frame through every other active port in that VLAN except the ingress port.',
    sections: [
      { heading: 'Flooding is controlled copying', body: 'The switch sends copies through possible output ports so the unknown destination can receive one. It does not send a copy back toward the source on the ingress port.' },
      { heading: 'Replies improve the table', body: 'When the destination replies, that reply’s source MAC teaches the switch its location. Later traffic can become known unicast rather than unknown flooding.' },
    ],
    example: { label: 'EMPTY TABLE', setup: 'A frame from port 1 targets an unknown MAC; active ports are 1, 2, and 3.', steps: [
      { id: 'learn', label: 'LEARN THE SOURCE', explanation: 'Record the source MAC on ingress port 1.' },
      { id: 'lookup', label: 'LOOK UP THE DESTINATION', explanation: 'No destination entry exists, so there is no single known output port.' },
      { id: 'exclude', label: 'EXCLUDE THE INGRESS', explanation: 'Do not send a copy back through port 1.' },
      { id: 'flood', label: 'COPY TO OTHER PORTS', explanation: 'Send through eligible ports 2 and 3.', value: 'OUTPUT PORTS 2 + 3' },
    ], result: 'Flooding handles the unknown destination while source learning prepares the switch for later replies.' },
    takeaway: 'Unknown unicast floods every other active port because no destination mapping exists yet.',
    checkpoint: { prompt: 'An unknown unicast enters port 2 on a three-port switch. Which outputs are used?', correctChoiceId: 'others', choices: [
      { id: 'others', label: 'PORTS 1 AND 3', feedback: 'Correct. Flooding uses every other active port and excludes ingress port 2.' },
      { id: 'all', label: 'PORTS 1, 2, AND 3', feedback: 'The ingress port is excluded; the switch does not reflect the frame back to its source.' },
      { id: 'none', label: 'NO PORTS', feedback: 'An unknown destination is flooded so it still has a chance to receive the frame.' },
    ] },
  },
  {
    id: 'broadcast-frames', title: 'Broadcast frames intentionally reach the LAN', illustration: 'broadcast',
    body: 'The Ethernet broadcast destination FF:FF:FF:FF:FF:FF intentionally addresses every interface in the local broadcast domain. A switch floods it through every other active port in the VLAN, even when all unicast addresses are known.',
    sections: [
      { heading: 'Same output shape / different reason', body: 'Unknown unicast floods because the switch lacks one destination mapping. Broadcast floods because the sender deliberately selected everyone as the destination.' },
      { heading: 'Local boundary', body: 'A basic router does not forward Ethernet broadcasts from one LAN into another. Later chapters use this boundary when explaining ARP and VLANs.' },
    ],
    example: { label: 'BROADCAST FROM PORT 3', setup: 'A broadcast enters a switch on port 3 with active ports 1, 2, and 3.', result: 'The switch learns the source on port 3 and floods copies through ports 1 and 2.' },
    takeaway: 'A broadcast is intentionally flooded within its local broadcast domain, excluding the ingress port.',
  },
]);

export const chapterThreeQuiz: QuizQuestion[] = [
  { id: 'mac-identifies-interface', lessonId: 'mac-addresses', prompt: 'What does a MAC address identify for Ethernet delivery?', answers: ['A network interface', 'A complete routed path', 'A cable type'], correctAnswerIndex: 0, explanation: 'A MAC address is a local-link interface identifier.' },
  { id: 'mac-byte-count', lessonId: 'mac-addresses', prompt: 'How many displayed bytes are in 02:00:00:00:00:0A?', answers: ['Six', 'Twelve', 'Forty-eight'], correctAnswerIndex: 0, explanation: 'Six pairs of hexadecimal digits display six bytes, or 48 bits.' },
  { id: 'switch-learns-source', lessonId: 'mac-source-destination', prompt: 'Which frame field does a switch learn from?', answers: ['Source MAC', 'Destination MAC', 'Payload length'], correctAnswerIndex: 0, explanation: 'The source arrived on the ingress port, allowing a reliable mapping.' },
  { id: 'learning-port', lessonId: 'switch-source-learning', prompt: 'A frame from PC C enters port 3. What entry is learned?', answers: ['PC C → port 3', 'Destination → port 3', 'PC C → every port'], correctAnswerIndex: 0, explanation: 'The switch maps the source, PC C, to ingress port 3.' },
  { id: 'known-unicast-decision', lessonId: 'known-unknown-unicast', prompt: 'The destination is learned on port 2. What should the switch do?', answers: ['Forward only to port 2', 'Flood every port including ingress', 'Erase the table'], correctAnswerIndex: 0, explanation: 'Known unicast uses the destination’s learned port.' },
  { id: 'unknown-unicast-decision', lessonId: 'unknown-unicast-flooding', prompt: 'An unknown destination arrives on port 1. What should happen?', answers: ['Flood every other active port', 'Return it through port 1', 'Send only to a router'], correctAnswerIndex: 0, explanation: 'Unknown unicast is flooded except through the ingress port.' },
  { id: 'broadcast-difference', lessonId: 'broadcast-frames', prompt: 'Why is a broadcast flooded when every unicast MAC is known?', answers: ['It is intentionally addressed to everyone locally', 'Its source cannot be learned', 'It always has a damaged check'], correctAnswerIndex: 0, explanation: 'Broadcast flooding is intentional, not caused by an unknown unicast destination.' },
];

export const chapterThreeFlashcards: Flashcard[] = [
  { id: 'mac-address', term: 'MAC Address', definition: 'A 48-bit interface identifier used for local Ethernet delivery.', example: PC_A },
  { id: 'source-mac', term: 'Source MAC', definition: 'The MAC address of the interface that sent the frame on the local link.', example: 'The field a switch learns from.' },
  { id: 'destination-mac', term: 'Destination MAC', definition: 'The intended local-link receiver or group.', example: 'The field a switch looks up for forwarding.' },
  { id: 'mac-table', term: 'MAC Address Table', definition: 'A switch table mapping learned source MAC addresses to ports.', example: `${PC_A} → port 1.` },
  { id: 'known-unicast', term: 'Known Unicast', definition: 'A one-interface destination with a learned port.', example: 'Forward only to port 2.' },
  { id: 'unknown-unicast', term: 'Unknown Unicast', definition: 'A one-interface destination not yet in the MAC table.', example: 'Flood every other active port.' },
  { id: 'broadcast', term: 'Broadcast', definition: 'A frame intentionally addressed to every interface in a local broadcast domain.', example: 'FF:FF:FF:FF:FF:FF' },
  { id: 'flooding', term: 'Flooding', definition: 'Copying a frame through every other active port in its VLAN.', example: 'Ingress is always excluded.' },
];

export const chapterThree: ChapterDefinition = {
  id: '3', contentVersion: 2, numberLabel: '03', title: 'Switching and MAC Addresses', summary: 'Follow source learning, table lookups, targeted forwarding, and two different reasons for flooding.',
  lessons: chapterThreeLessons, quiz: chapterThreeQuiz, flashcards: chapterThreeFlashcards,
  lab: { id: 'switch-decision-desk', title: 'Operate the switch desk', detail: 'Predict four source-learning and forwarding decisions' },
  recap: { built: 'A learned MAC address table', learned: 'MAC roles, source learning, known forwarding, unknown flooding, and broadcasts', next: 'How IPv4 gives interfaces logical network identities' },
};
