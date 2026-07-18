import { buildLessons } from '@/content/lesson-builder';
import type { ChapterDefinition, Flashcard, QuizQuestion } from '@/content/types';

export const chapterTwoLessons = buildLessons('2', [
  {
    id: 'ethernet-local-link', title: 'Ethernet works across local links', illustration: 'ethernet-link',
    body: 'Ethernet is a family of technologies used to communicate across wired local network links. It defines how network interfaces represent and organize data for one link at a time; it does not by itself describe an entire route across the internet.',
    sections: [
      { heading: 'Link by link', body: 'A PC and switch can share one Ethernet link, while the switch and another device use a different link. Each link has two connected interfaces.' },
      { heading: 'Several pieces cooperate', body: 'A working link needs compatible interfaces, suitable media, and an agreed Ethernet method. Higher chapters add the addressing and forwarding decisions.' },
    ],
    example: { label: 'LOCAL SCOPE', setup: 'PC A connects to Switch 1 with one copper cable.', result: 'Ethernet describes communication over that local PC-to-switch link. Routing beyond the LAN is a separate responsibility.' },
    takeaway: 'Ethernet provides local-link communication between compatible network interfaces.',
  },
  {
    id: 'ethernet-frames', title: 'Data travels in frames', illustration: 'frame',
    body: 'Ethernet does not send an application message as an unstructured stream of symbols. It places local-link data and control information into a defined unit called a frame so receiving interfaces can interpret the transmission.',
    sections: [
      { heading: 'Delivery fields', body: 'A frame carries destination and source MAC addresses. Chapter 3 explains how switches use those addresses; for now, recognize that both identify interfaces on the local Ethernet path.' },
      { heading: 'Payload and check', body: 'The data field carries information from an upper protocol. A trailer check helps a receiver detect a damaged frame, but Ethernet does not repair the damaged data.' },
    ],
    example: { label: 'FROM DATA TO SIGNAL', setup: 'PC A needs to send IP data across its local link to a switch.', steps: [
      { id: 'data', label: 'RECEIVE THE PAYLOAD', explanation: 'The networking stack gives the NIC data that must cross this Ethernet link.' },
      { id: 'frame', label: 'BUILD THE FRAME', explanation: 'The NIC adds local destination and source MAC fields plus an error-detection check.' },
      { id: 'signal', label: 'TRANSMIT ON THE MEDIUM', explanation: 'The completed frame is represented as signals across the attached copper or fiber link.' },
    ], result: 'The frame is the structured local-link unit; it is not the cable signal or the application message by itself.' },
    takeaway: 'An Ethernet frame packages local-link delivery information, payload data, and an error check.',
    checkpoint: { prompt: 'Which frame field identifies where the frame should go on the local link?', correctChoiceId: 'destination', choices: [
      { id: 'destination', label: 'DESTINATION MAC', feedback: 'Correct. The destination MAC identifies the intended local-link interface.' },
      { id: 'source', label: 'SOURCE MAC', feedback: 'The source identifies the sender. It does not name the intended receiver.' },
      { id: 'check', label: 'ERROR CHECK', feedback: 'The check helps detect damage; it is not the delivery address.' },
    ] },
  },
  {
    id: 'network-interface-card', title: 'The network interface', illustration: 'nic',
    body: 'A network interface controller, or NIC, is the hardware interface that lets a device join an Ethernet link. The operating system and applications use the NIC, while the NIC handles the local transmission and reception of Ethernet frames.',
    sections: [
      { heading: 'One device can have several interfaces', body: 'A laptop may have wired Ethernet and Wi-Fi interfaces. Each interface is a separate attachment point and can have its own link-layer identity.' },
      { heading: 'Interface versus port', body: 'The NIC is the device-side networking interface. Its connector or transceiver attaches to compatible media leading to another interface.' },
    ],
    example: { label: 'FROM APP TO LINK', setup: 'A desktop application produces data for the network.', result: 'The networking software passes it toward the Ethernet NIC, which sends the resulting frame through its connected link.' },
    takeaway: 'A NIC is the interface that sends and receives Ethernet frames for a device.',
  },
  {
    id: 'ethernet-media', title: 'Copper and fiber carry signals', illustration: 'cables',
    body: 'Ethernet can use different physical media. Twisted-pair copper carries changing electrical signals through paired conductors, while fiber-optic media carries pulses of light through glass or plastic fiber.',
    sections: [
      { heading: 'Choose compatible endpoints', body: 'Copper and fiber connectors and transceivers are different. Both ends of a link must support the selected medium and Ethernet standard.' },
      { heading: 'Media serve different needs', body: 'Copper is common for nearby endpoint connections. Fiber is useful where distance, capacity, or resistance to electrical interference matters. Neither medium makes every network automatically faster.' },
    ],
    example: { label: 'TWO VALID LINKS', setup: 'A desk PC needs a short link; two network rooms need a longer building link.', result: 'The desk may use twisted-pair copper, while the building link may use compatible fiber equipment.' },
    takeaway: 'Copper carries electrical signals; fiber carries light, and both endpoints must support the chosen medium.',
  },
  {
    id: 'manual-copper-cabling', title: 'Straight-through, crossover, and auto-MDIX', illustration: 'cabling-rule',
    body: 'Older manual copper links required the transmit and receive wire pairs to line up correctly. Traditionally, unlike port roles such as a PC or router connected to a switch used straight-through wiring, while two switches used crossover wiring.',
    sections: [
      { heading: 'Why crossover existed', body: 'A crossover cable swaps the relevant transmit and receive pairs so two similar legacy port roles can hear each other. The lesson diagram shows the relationship, not a connector pinout.' },
      { heading: 'Modern auto-MDIX', body: 'A capable auto-MDIX port detects the required pair arrangement and adjusts automatically. The manual rule explains the underlying relationship without claiming every modern link needs special cable selection.' },
    ],
    example: { label: 'LEGACY MODE', setup: 'A PC connects to Switch A, then Switch A connects directly to Switch B without auto-MDIX.', steps: [
      { id: 'first-pair', label: 'IDENTIFY PC TO SWITCH', explanation: 'These are unlike legacy port roles.', value: 'STRAIGHT-THROUGH' },
      { id: 'second-pair', label: 'IDENTIFY SWITCH TO SWITCH', explanation: 'These are like legacy port roles whose transmit and receive pairs must cross.', value: 'CROSSOVER' },
      { id: 'modern-check', label: 'CHECK FOR AUTO-MDIX', explanation: 'If both links use capable modern ports, the ports can correct pair orientation automatically.' },
    ], result: 'The manual rule explains pair alignment; auto-MDIX removes the need to choose by device pair on capable ports.' },
    takeaway: 'Manual unlike-role links use straight-through and like-role links use crossover; auto-MDIX can correct either arrangement.',
    fieldNote: { label: 'MANUAL CABLING RULE', text: 'Match the device pair to the cable. These are simplified transmit and receive paths, not an Ethernet connector pinout.', visual: 'manual-cabling' },
    termNote: { term: 'AUTO-MDIX', definition: 'Automatic medium-dependent interface crossover: a capable port detects whether transmit and receive pairs need to cross and adjusts automatically.' },
    checkpoint: { prompt: 'In the lab’s manual legacy mode, which cable connects Switch A directly to Switch B?', correctChoiceId: 'cross', choices: [
      { id: 'cross', label: 'CROSSOVER', feedback: 'Correct. Two like legacy port roles require the transmit and receive pairs to cross.' },
      { id: 'straight', label: 'STRAIGHT-THROUGH', feedback: 'Straight-through is the manual rule for unlike roles such as PC-to-switch.' },
      { id: 'either', label: 'EITHER WITHOUT AUTO-MDIX', feedback: 'Either may work only when auto-MDIX or equivalent correction is available.' },
    ] },
  },
  {
    id: 'ethernet-ports', title: 'Ports, link, and activity', illustration: 'ports',
    body: 'A cable connects two compatible Ethernet ports, but the cable’s presence alone does not prove that the link is operating. Network equipment commonly reports a link state after the two interfaces establish physical connectivity.',
    sections: [
      { heading: 'Link indication', body: 'A lit link indicator normally confirms the local physical Ethernet link. It does not prove that IPv4 settings, gateways, remote routes, or applications are correct.' },
      { heading: 'Activity indication', body: 'A blinking activity indicator commonly means frames are being sent or received. No blinking does not necessarily mean failure; an idle link may simply have no current traffic.' },
    ],
    example: { label: 'TROUBLESHOOT FROM THE BOTTOM', setup: 'A PC cannot reach anything and its switch port has no link indication.', result: 'Check the local port, cable, interface, and compatibility before investigating IP addresses or remote routes.' },
    takeaway: 'Link state confirms local physical connectivity; activity suggests frame transmission, not end-to-end success.',
  },
]);

export const chapterTwoQuiz: QuizQuestion[] = [
  { id: 'ethernet-scope', lessonId: 'ethernet-local-link', prompt: 'What scope does this chapter assign to Ethernet?', answers: ['Communication across a local link', 'A complete route across every network', 'Application login and permissions'], correctAnswerIndex: 0, explanation: 'Ethernet provides local-link communication; routing and applications have other responsibilities.' },
  { id: 'frame-purpose', lessonId: 'ethernet-frames', prompt: 'Why does Ethernet use frames?', answers: ['To organize local delivery information, payload, and a check', 'To assign every router a route', 'To replace the physical medium'], correctAnswerIndex: 0, explanation: 'A frame is Ethernet’s structured transmission unit.' },
  { id: 'nic-purpose', lessonId: 'network-interface-card', prompt: 'What sends and receives Ethernet frames for a PC?', answers: ['Its NIC', 'A remote router table', 'The application window alone'], correctAnswerIndex: 0, explanation: 'The NIC is the PC’s Ethernet interface.' },
  { id: 'fiber-signal', lessonId: 'ethernet-media', prompt: 'What carries information through fiber-optic Ethernet media?', answers: ['Light', 'Electrical current in copper pairs', 'A MAC table'], correctAnswerIndex: 0, explanation: 'Fiber carries information using pulses of light.' },
  { id: 'media-compatibility', lessonId: 'ethernet-media', prompt: 'A copper port is cabled directly to a fiber-only port with no converter. What is the problem?', answers: ['The endpoints do not support the same medium', 'The frame has too many MAC addresses', 'The LAN needs a second name'], correctAnswerIndex: 0, explanation: 'Both endpoints must support compatible media and connectors.' },
  { id: 'legacy-cabling', lessonId: 'manual-copper-cabling', prompt: 'Without auto-MDIX, which cable traditionally connects two switches?', answers: ['Crossover', 'Straight-through', 'Fiber only'], correctAnswerIndex: 0, explanation: 'Two similar legacy copper port roles use crossover wiring.' },
  { id: 'link-light', lessonId: 'ethernet-ports', prompt: 'What does an active link indicator usually confirm?', answers: ['The local physical link is established', 'Every remote application is reachable', 'The IP configuration is correct'], correctAnswerIndex: 0, explanation: 'Link state concerns the local physical connection, not higher-layer reachability.' },
];

export const chapterTwoFlashcards: Flashcard[] = [
  { id: 'ethernet', term: 'Ethernet', definition: 'A family of technologies for wired local-link communication.', example: 'A PC-to-switch copper link.' },
  { id: 'frame', term: 'Ethernet Frame', definition: 'Ethernet’s structured local-link transmission unit.', example: 'Destination, source, payload, and check regions.' },
  { id: 'nic', term: 'NIC', definition: 'A network interface that sends and receives frames for a device.', example: 'A desktop Ethernet adapter.' },
  { id: 'port', term: 'Ethernet Port', definition: 'An interface connection for compatible Ethernet media.', example: 'A numbered copper switch port.' },
  { id: 'twisted-pair', term: 'Twisted-Pair Copper', definition: 'Paired copper conductors carrying electrical Ethernet signals.', example: 'A short PC-to-switch link.' },
  { id: 'fiber-optic', term: 'Fiber-Optic', definition: 'Media carrying Ethernet information as light.', example: 'A link between network rooms.' },
  { id: 'crossover', term: 'Crossover Cable', definition: 'Legacy copper wiring that crosses transmit and receive pairs.', example: 'A manual switch-to-switch link.' },
  { id: 'auto-mdix', term: 'Auto-MDIX', definition: 'A port feature that detects and corrects copper pair orientation.', example: 'Modern switches accepting either cable arrangement.' },
  { id: 'link-state', term: 'Link State', definition: 'Whether two local Ethernet interfaces have established physical connectivity.', example: 'A switch port link indicator is lit.' },
];

export const chapterTwo: ChapterDefinition = {
  id: '2', contentVersion: 2, numberLabel: '02', title: 'Ethernet', summary: 'See how frames, interfaces, media, and port state create a working local Ethernet link.',
  lessons: chapterTwoLessons, quiz: chapterTwoQuiz, flashcards: chapterTwoFlashcards,
  lab: { id: 'ethernet-cables', title: 'Manual copper cabling practice', detail: 'Focused practice for straight-through and crossover rules' },
  recap: { built: 'A set of working Ethernet links', learned: 'Frames, NICs, media, cabling roles, ports, and link state', next: 'How switches identify interfaces and forward frames' },
};
