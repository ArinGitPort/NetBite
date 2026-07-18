import type { ChapterDefinition, Flashcard, Lesson, QuizQuestion } from '@/content/types';

export const chapterTwoLessons: Lesson[] = [
  {
    id: 'ethernet-frames',
    chapterId: '2',
    order: 1,
    eyebrow: 'Lesson 1 of 4',
    title: 'Data travels in frames',
    body: 'Ethernet carries data across a local link inside a structured unit called a frame. Its header contains source and destination addresses, while its trailer helps detect damage during transmission. Chapter 3 explains those addresses in detail.',
    takeaway: 'An Ethernet frame packages local-link data with delivery and error-checking information.',
    illustration: 'frame',
  },
  {
    id: 'network-interface-card',
    chapterId: '2',
    order: 2,
    eyebrow: 'Lesson 2 of 4',
    title: 'The network interface',
    body: 'A network interface controller, or NIC, is the hardware interface that lets a device join an Ethernet link. It sends and receives frames through its network connection.',
    takeaway: 'The NIC is a device’s Ethernet connection point.',
    illustration: 'nic',
  },
  {
    id: 'ethernet-media',
    chapterId: '2',
    order: 3,
    eyebrow: 'Lesson 3 of 4',
    title: 'Choosing Ethernet cables',
    body: 'Ethernet can travel over twisted-pair copper or fiber. The lab focuses on the traditional copper wiring rule used when ports cannot correct the wiring automatically.',
    takeaway: 'In manual copper cabling, PC or router to switch uses straight-through; switch to switch uses crossover.',
    illustration: 'cables',
    fieldNote: {
      label: 'MANUAL CABLING RULE',
      text: 'Match the device pair to the cable. These are simplified transmit and receive paths, not an Ethernet connector pinout.',
      visual: 'manual-cabling',
    },
    termNote: {
      term: 'AUTO-MDIX',
      definition: 'Automatic medium-dependent interface crossover. A capable Ethernet port detects whether the transmit and receive wire pairs need to cross, then adjusts the port automatically so either copper cable type can establish the link.',
    },
  },
  {
    id: 'ethernet-ports',
    chapterId: '2',
    order: 4,
    eyebrow: 'Lesson 4 of 4',
    title: 'Ports and link status',
    body: 'A cable connects two compatible Ethernet ports. A link indicator shows that the physical connection is active, while a blinking activity indicator commonly means frames are being sent or received.',
    takeaway: 'Connected cable plus active ports creates an Ethernet link.',
    illustration: 'ports',
  },
];

export const chapterTwoQuiz: QuizQuestion[] = [
  {
    id: 'frame-purpose',
    lessonId: 'ethernet-frames',
    prompt: 'What does Ethernet use to carry data across a local link?',
    answers: ['A frame', 'A physical port', 'A link indicator'],
    correctAnswerIndex: 0,
    explanation: 'Ethernet organizes data and its local delivery information into a frame.',
  },
  {
    id: 'nic-purpose',
    lessonId: 'network-interface-card',
    prompt: 'What is the job of a NIC?',
    answers: ['Connect a device to a network link', 'Connect two different networks', 'Forward traffic for every device on a LAN'],
    correctAnswerIndex: 0,
    explanation: 'A network interface controller provides the interface that sends and receives network data.',
  },
  {
    id: 'fiber-signal',
    lessonId: 'ethernet-media',
    prompt: 'What carries Ethernet signals through fiber-optic cable?',
    answers: ['Electrical pulses', 'Light', 'Radio waves'],
    correctAnswerIndex: 1,
    explanation: 'Fiber-optic media carries information using pulses of light.',
  },
  {
    id: 'link-light',
    lessonId: 'ethernet-ports',
    prompt: 'What does an active link indicator usually confirm?',
    answers: ['A physical link is established', 'The internet is always reachable', 'The PC has no errors'],
    correctAnswerIndex: 0,
    explanation: 'A link indicator confirms the local physical link, not end-to-end internet connectivity.',
  },
  {
    id: 'legacy-cabling',
    lessonId: 'ethernet-media',
    prompt: 'Without auto-MDIX, which cable traditionally connects two switches?',
    answers: ['Crossover', 'Straight-through', 'Fiber only'],
    correctAnswerIndex: 0,
    explanation: 'Legacy or manual switch-to-switch copper links use a crossover cable. Auto-MDIX detects the required wiring and adjusts a capable port automatically.',
  },
];

export const chapterTwoFlashcards: Flashcard[] = [
  { id: 'ethernet', term: 'Ethernet', definition: 'A family of technologies used for wired local network communication.', example: 'A PC connected to a switch over twisted-pair copper.' },
  { id: 'frame', term: 'Ethernet Frame', definition: 'The structured unit Ethernet sends across a local link.', example: 'A frame carries local delivery information, data, and an error check.' },
  { id: 'nic', term: 'NIC', definition: 'The hardware interface that connects a device to a network.', example: 'The Ethernet adapter and port in a desktop PC.' },
  { id: 'port', term: 'Ethernet Port', definition: 'An interface where a compatible network cable or module connects.', example: 'A numbered copper port on a switch.' },
  { id: 'twisted-pair', term: 'Twisted-Pair Copper', definition: 'Copper wire pairs twisted together to carry electrical Ethernet signals.', example: 'A copper Ethernet cable connecting a PC to a switch.' },
  { id: 'fiber-optic', term: 'Fiber-Optic', definition: 'A medium that carries Ethernet data as pulses of light.', example: 'A fiber link connecting network equipment over a longer distance.' },
  { id: 'auto-mdix', term: 'Auto-MDIX', definition: 'Automatic medium-dependent interface crossover: a port feature that detects and corrects the required copper wiring arrangement.', example: 'Two modern switches establish a link without manually choosing crossover wiring.' },
];

export const chapterTwo: ChapterDefinition = {
  id: '2',
  numberLabel: '02',
  title: 'Ethernet',
  summary: 'See how NICs, cables, ports, and frames form a working Ethernet link.',
  lessons: chapterTwoLessons,
  quiz: chapterTwoQuiz,
  flashcards: chapterTwoFlashcards,
  lab: {
    id: 'ethernet-cables',
    title: 'Manual copper cabling practice',
    detail: 'Focused practice for Lesson 3',
  },
  recap: {
    built: 'A set of working Ethernet links',
    learned: 'Frames, NICs, media, ports, and link status',
    next: 'How switches identify devices with MAC addresses',
  },
};
