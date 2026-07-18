import type { ChapterDefinition, Flashcard, Lesson, QuizQuestion } from '@/content/types';

export const chapterThreeLessons: Lesson[] = [
  {
    id: 'mac-addresses',
    chapterId: '3',
    order: 1,
    eyebrow: 'Lesson 1 of 4',
    title: 'MAC addresses identify interfaces',
    body: 'A media access control address, or MAC address, identifies a network interface on an Ethernet link. It is commonly written as six hexadecimal bytes, such as 02:00:00:00:00:0A.',
    takeaway: 'A MAC address is a 48-bit identifier written as twelve hexadecimal digits.',
    illustration: 'mac-address',
    termNote: {
      term: 'HEXADECIMAL',
      definition: 'A number system that uses 0–9 and A–F. Each pair of hexadecimal digits represents one byte in the displayed MAC address.',
    },
  },
  {
    id: 'switch-source-learning',
    chapterId: '3',
    order: 2,
    eyebrow: 'Lesson 2 of 4',
    title: 'How a switch learns',
    body: 'When a frame enters a switch, the switch reads its source MAC address and records the ingress port. This source-to-port mapping is stored in the MAC address table; the destination address is used for forwarding, not learning.',
    takeaway: 'A switch learns the source MAC address on the port where the frame arrived.',
    illustration: 'mac-learning',
  },
  {
    id: 'known-unknown-unicast',
    chapterId: '3',
    order: 3,
    eyebrow: 'Lesson 3 of 4',
    title: 'Known and unknown unicast',
    body: 'If the destination MAC is already in the table, the switch forwards the frame only through that learned port. If the destination is unknown, it floods the frame through every other active port so the destination can receive it.',
    takeaway: 'Known unicast uses one learned port; unknown unicast floods every port except the ingress port.',
    illustration: 'switch-forwarding',
  },
  {
    id: 'broadcast-frames',
    chapterId: '3',
    order: 4,
    eyebrow: 'Lesson 4 of 4',
    title: 'Broadcast frames',
    body: 'The destination FF:FF:FF:FF:FF:FF means every interface on the local LAN. A switch floods a broadcast through every other active port, similar to an unknown unicast, but the broadcast is intentionally addressed to everyone.',
    takeaway: 'Broadcast and unknown-unicast frames are both flooded, but for different reasons.',
    illustration: 'broadcast',
  },
];

export const chapterThreeQuiz: QuizQuestion[] = [
  {
    id: 'mac-identifies-interface',
    lessonId: 'mac-addresses',
    prompt: 'What does a MAC address identify on an Ethernet link?',
    answers: ['A network interface', 'A complete routed path', 'A cable category'],
    correctAnswerIndex: 0,
    explanation: 'A MAC address identifies a network interface for local Ethernet delivery.',
  },
  {
    id: 'switch-learns-source',
    lessonId: 'switch-source-learning',
    prompt: 'Which frame field does a switch use to learn a MAC table entry?',
    answers: ['The source MAC address', 'The destination MAC address', 'The error check'],
    correctAnswerIndex: 0,
    explanation: 'The switch maps the frame’s source MAC address to the port where that frame arrived.',
  },
  {
    id: 'known-unicast-decision',
    lessonId: 'known-unknown-unicast',
    prompt: 'The destination MAC is known on port 2. What should the switch do?',
    answers: ['Forward only to port 2', 'Flood every port including ingress', 'Erase the MAC table'],
    correctAnswerIndex: 0,
    explanation: 'A known unicast is forwarded only through the destination’s learned port.',
  },
  {
    id: 'unknown-unicast-decision',
    lessonId: 'known-unknown-unicast',
    prompt: 'The destination MAC is not in the table. What should the switch do?',
    answers: ['Flood every other active port', 'Return the frame to its ingress port', 'Send only to the router'],
    correctAnswerIndex: 0,
    explanation: 'An unknown unicast is flooded through every active port except the port where it arrived.',
  },
  {
    id: 'broadcast-difference',
    lessonId: 'broadcast-frames',
    prompt: 'Why is a broadcast flooded even when the MAC table has learned every PC?',
    answers: ['It is intentionally addressed to every interface', 'Its source address cannot be learned', 'It always means the destination is unknown'],
    correctAnswerIndex: 0,
    explanation: 'FF:FF:FF:FF:FF:FF intentionally targets every interface on the local LAN.',
  },
];

export const chapterThreeFlashcards: Flashcard[] = [
  { id: 'mac-address', term: 'MAC Address', definition: 'A 48-bit identifier used by a network interface for local Ethernet delivery.', example: 'PC A uses 02:00:00:00:00:0A in the guided switch desk.' },
  { id: 'mac-table', term: 'MAC Address Table', definition: 'A switch table that maps learned source MAC addresses to ports.', example: '02:00:00:00:00:0A is mapped to port 1.' },
  { id: 'source-learning', term: 'Source Learning', definition: 'Recording a frame’s source MAC address on its ingress port.', example: 'A frame from PC B teaches the switch that PC B is on port 2.' },
  { id: 'known-unicast', term: 'Known Unicast', definition: 'A frame whose one-device destination already has a learned table entry.', example: 'The switch forwards a frame for PC A only to port 1.' },
  { id: 'unknown-unicast', term: 'Unknown Unicast', definition: 'A one-device destination that is not yet present in the MAC table.', example: 'The switch has not learned where PC B is, so it floods the frame.' },
  { id: 'broadcast', term: 'Broadcast', definition: 'A frame intentionally addressed to every interface on the local LAN.', example: 'The destination address is FF:FF:FF:FF:FF:FF.' },
  { id: 'flooding', term: 'Flooding', definition: 'Sending a frame through every active port except its ingress port.', example: 'Unknown unicasts and broadcasts are flooded for different reasons.' },
];

export const chapterThree: ChapterDefinition = {
  id: '3',
  numberLabel: '03',
  title: 'Switching and MAC Addresses',
  summary: 'Watch a switch learn source addresses, then decide where Ethernet frames should go.',
  lessons: chapterThreeLessons,
  quiz: chapterThreeQuiz,
  flashcards: chapterThreeFlashcards,
  lab: {
    id: 'switch-decision-desk',
    title: 'Operate the switch desk',
    detail: 'Predict four MAC forwarding decisions',
  },
  recap: {
    built: 'A learned MAC address table',
    learned: 'Source learning, forwarding, flooding, and broadcasts',
    next: 'How IPv4 gives hosts logical network identities',
  },
};
