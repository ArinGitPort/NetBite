import { createAdvancedChapter } from '@/content/advanced-content-helpers';

export const chapterEleven = createAdvancedChapter({
  id: 11, contentVersion: 3, flashcardVersion: 4, title: 'OSI and TCP/IP Models', summary: 'Use layered responsibilities to organize concepts and narrow troubleshooting questions.',
  lessons: [
    {
      id: 'why-models', title: 'Why layered models exist', illustration: 'model-purpose',
      body: 'Networking combines physical signals, local delivery, routed delivery, transport services, representation, conversations, and applications. Layered models group these responsibilities so people can design, discuss, and troubleshoot them with shared vocabulary.',
      sections: [
        { heading: 'Reference, not a machine diagram', body: 'The OSI model describes service responsibilities and relationships. It does not require every implementation to appear as seven visible programs or seven timed animation steps.' },
        { heading: 'Layers narrow questions', body: 'A missing link, wrong IP prefix, and unavailable application can all cause communication failure, but they belong to different responsibility groups and need different evidence.' },
      ],
      example: { label: 'NARROW THE FAULT', setup: 'The cable has link, the gateway replies, but a web service does not.', result: 'Lower connectivity evidence shifts attention upward toward transport or application behavior rather than the physical link.' },
      takeaway: 'Layered models organize responsibilities and help isolate where a networking question belongs.',
    },
    {
      id: 'seven-osi-layers', title: 'Read the seven-layer OSI stack', illustration: 'osi-stack',
      body: 'The conventional OSI stack is shown vertically with Layer 7 Application at the top and Layer 1 Physical at the bottom. Between them are Presentation, Session, Transport, Network, and Data Link in that exact order.',
      sections: [
        { heading: 'Adjacent service relationship', body: 'Conceptually, each layer offers services to the layer above and uses services from the layer below. The model separates what is provided from how a particular implementation provides it.' },
        { heading: 'Follow encapsulation without forcing one name', body: 'Application data may become a TCP segment or UDP datagram, then an IPv4 datagram or packet, then an Ethernet frame, and finally transmitted bits or signals. Upper-layer names and implementations vary, so responsibility matters more than memorizing one universal label for every layer.' },
        { heading: 'Learn responsibility before memorization', body: 'The order is useful, but understanding what each layer groups makes the model valuable for design and troubleshooting. The next seven lessons examine them individually.' },
      ],
      example: { label: 'BOTTOM TO TOP', setup: 'Physical → Data Link → Network → Transport → Session → Presentation → Application.', result: 'Layer numbers rise from 1 at the physical medium to 7 near application services.' },
      takeaway: 'OSI has seven ordered responsibility layers from Physical at Layer 1 to Application at Layer 7.',
    },
    {
      id: 'osi-physical-layer', title: 'Layer 1: Physical', illustration: 'osi-physical',
      body: 'The Physical layer concerns the mechanical, electrical, optical, radio, timing, and procedural means used to carry bits across a physical medium. It makes a bit stream possible between directly connected physical interfaces.',
      sections: [
        { heading: 'NetBite examples', body: 'Copper and fiber media, connectors, signal representation, port activation, and physical link state belong here. A lit link indicator is Layer 1 evidence.' },
        { heading: 'What it does not decide', body: 'Physical does not interpret MAC destinations, choose an IP route, or identify an application service. It transports signals without owning those higher-layer meanings.' },
      ],
      example: { label: 'LAYER 1 FAULT', setup: 'A cable is disconnected and the port has no link.', result: 'Start at Physical because no higher-layer frame or packet can cross that failed local medium.' },
      takeaway: 'Physical carries bits as signals over media and establishes the physical connection.',
    },
    {
      id: 'osi-data-link-layer', title: 'Layer 2: Data Link', illustration: 'osi-data-link',
      body: 'The Data Link layer organizes delivery across a local link or Layer 2 network. In NetBite, Ethernet frames, MAC addresses, switch learning, and VLAN membership are Data Link concepts.',
      sections: [
        { heading: 'Local delivery responsibility', body: 'A frame identifies local source and destination interfaces. Switches use MAC tables and VLAN context to choose eligible output ports.' },
        { heading: 'What it does not decide', body: 'Data Link does not choose the end-to-end IPv4 route across unrelated networks. A router removes one local frame and creates another for the next link.' },
      ],
      example: { label: 'LAYER 2 DECISION', setup: 'A switch knows the destination MAC on VLAN 10 port 3.', result: 'It forwards the Ethernet frame through that local Layer 2 port.' },
      takeaway: 'Data Link handles local frames, MAC delivery, switching, and Layer 2 domains.',
      checkpoint: { prompt: 'Where do Ethernet frames and MAC learning belong?', correctChoiceId: 'l2', choices: [
        { id: 'l2', label: 'LAYER 2 / DATA LINK', feedback: 'Correct. These are local Ethernet delivery responsibilities.' },
        { id: 'l1', label: 'LAYER 1 / PHYSICAL', feedback: 'Physical carries signals but does not interpret MAC frame fields.' },
        { id: 'l3', label: 'LAYER 3 / NETWORK', feedback: 'Network handles logical addressing and routing rather than local MAC learning.' },
      ] },
    },
    {
      id: 'osi-network-layer', title: 'Layer 3: Network', illustration: 'osi-network',
      body: 'The Network layer provides logical addressing and forwarding across interconnected networks. IPv4 addresses, prefixes, subnet identities, ICMP, router interfaces, and route selection are NetBite’s principal Layer 3 concepts.',
      sections: [
        { heading: 'Across network boundaries', body: 'A router examines the destination IPv4 address, selects a route, and forwards toward another network while replacing link-specific frame information.' },
        { heading: 'What it does not guarantee', body: 'Network-layer delivery does not prove that a transport connection or application service is available. Ping evidence is useful but limited.' },
      ],
      example: { label: 'LAYER 3 DECISION', setup: 'Destination 192.168.30.25 matches a /24 route through R2.', result: 'The router selects that route and prepares forwarding onto the next link.' },
      takeaway: 'Network handles logical addresses, subnet boundaries, routing, and IP control messages.',
    },
    {
      id: 'osi-transport-layer', title: 'Layer 4: Transport', illustration: 'osi-transport',
      body: 'The Transport layer provides communication services between application endpoints. In the internet protocol suite, TCP and UDP are the familiar transport protocols, using port numbers to direct data toward the appropriate application process.',
      sections: [
        { heading: 'Different service styles', body: 'TCP provides an ordered reliable byte-stream service with connection state. UDP provides a simpler datagram service without TCP’s delivery and ordering mechanisms.' },
        { heading: 'What it does not replace', body: 'Transport still depends on IP to reach the destination host and on lower layers to cross each link. A transport port is not a physical switch port.' },
      ],
      example: { label: 'SAME SERVER / DIFFERENT SERVICE', setup: 'One server address offers web and another application service.', result: 'Transport port information helps deliver incoming data to the intended service process.' },
      takeaway: 'Transport provides end-to-end application communication services, commonly through TCP or UDP and ports.',
      checkpoint: { prompt: 'Which item belongs at Transport?', correctChoiceId: 'tcp', choices: [
        { id: 'tcp', label: 'TCP AND UDP', feedback: 'Correct. Both are transport protocols.' },
        { id: 'mac', label: 'MAC TABLE', feedback: 'MAC switching is a Data Link responsibility.' },
        { id: 'fiber', label: 'FIBER SIGNAL', feedback: 'Signals and media belong at Physical.' },
      ] },
    },
    {
      id: 'osi-session-layer', title: 'Layer 5: Session', illustration: 'osi-session',
      body: 'The Session layer groups responsibilities for establishing, managing, coordinating, and ending conversations between application entities. It provides a conceptual place for dialogue control and synchronization above transport.',
      sections: [
        { heading: 'Conversation organization', body: 'A long interaction may need checkpoints, recovery coordination, or rules about which side speaks when. OSI assigns such session-control responsibilities here.' },
        { heading: 'What it does not imply', body: 'Session does not carry bits, choose routes, or guarantee that every internet stack exposes one separate Session-layer program. Applications often implement this coordination inside their own protocols or libraries.' },
      ],
      example: { label: 'CONCEPTUAL SESSION', setup: 'Two application entities maintain a coordinated conversation after transport is available.', result: 'The conversation-management responsibility is classified at OSI Session, even if the software combines it elsewhere.' },
      takeaway: 'Session organizes and coordinates application conversations above transport.',
    },
    {
      id: 'osi-presentation-layer', title: 'Layer 6: Presentation', illustration: 'osi-presentation',
      body: 'The Presentation layer groups how information is represented so application entities can interpret it consistently. Encoding, data-format translation, serialization, compression, and encryption-related representation are common teaching examples.',
      sections: [
        { heading: 'Meaningful representation', body: 'Two applications must agree on how bytes represent text, images, numbers, or structured records. Presentation responsibilities bridge application meaning and transferable representation.' },
        { heading: 'What it does not decide', body: 'Presentation does not choose an IP route or deliver an Ethernet frame. Modern applications may perform representation work in libraries or application protocols; the model classifies the responsibility rather than dictating one software package.' },
      ],
      example: { label: 'SAME DATA / AGREED FORM', setup: 'A sender serializes structured information into an agreed encoded form.', result: 'The receiver reverses the representation so its application can interpret the same information.' },
      takeaway: 'Presentation handles how application information is represented and transformed.',
    },
    {
      id: 'osi-application-layer', title: 'Layer 7: Application', illustration: 'osi-application',
      body: 'The Application layer provides network services and protocol behavior directly used by application processes. It is the highest OSI layer, but it is not the entire visible user interface or the human user.',
      sections: [
        { heading: 'Application protocols', body: 'Protocols for web access, naming, email, and file services are commonly classified here because they define application-level requests, responses, and data meaning.' },
        { heading: 'What it does not do alone', body: 'Application rules do not carry signals, switch frames, or choose routes. An exchange still needs representation, conversation and transport services, logical routing, local delivery, and physical connectivity as appropriate.' },
      ],
      example: { label: 'NETWORK SERVICE', setup: 'A client application makes a protocol request to a server service.', result: 'The application-level rules define the request meaning while lower layers carry it.' },
      takeaway: 'Application supplies network protocol services used by application processes.',
    },
    {
      id: 'four-tcp-ip-layers', title: 'TCP/IP groups responsibilities into four layers', illustration: 'tcp-ip-stack',
      body: 'A common four-layer TCP/IP view uses Application, Transport, Internet, and Network Access or Link. It describes the practical internet protocol suite with broader groups than the seven-layer OSI reference model.',
      sections: [
        { heading: 'Four groups', body: 'Application includes application-support responsibilities; Transport includes TCP and UDP; Internet includes IP, ICMP, and routing; Link covers local network access and physical transmission.' },
        { heading: 'Names vary slightly', body: 'References may say Link, Network Access, or Network Interface for the bottom group. NetBite displays “Network Access / Link” and records the terminology instead of pretending only one label exists.' },
      ],
      example: { label: 'TCP/IP CLASSIFICATION', setup: 'Classify IPv4, TCP, Ethernet, and a web protocol.', result: 'Internet / Transport / Network Access-Link / Application.' },
      takeaway: 'TCP/IP uses four broad layers centered on the protocols used by internet hosts.',
    },
    {
      id: 'mapping-concepts', title: 'Map responsibilities, not just layer numbers', illustration: 'concept-layer-map',
      body: 'OSI Application, Presentation, and Session map broadly into TCP/IP Application. OSI Transport maps to Transport, OSI Network to Internet, and OSI Data Link plus Physical to Network Access or Link.',
      sections: [
        { heading: 'Place familiar concepts', body: 'Cables and signals belong at OSI Physical; Ethernet, MAC, switching, and VLANs at Data Link; IPv4, ICMP, ARP’s IP-support role, and routing around the Network/Link boundary as defined by their protocols; TCP and UDP at Transport.' },
        { heading: 'Use mapping for diagnosis', body: 'If link is down, start low. If IP works but one service fails, move toward transport and application evidence. Models guide questions; they do not replace actual tests.' },
      ],
      example: { label: 'END-TO-END REVIEW', setup: 'A user opens a web page carried through TCP, IPv4, Ethernet, and a copper link.', presentation: 'guided', visual: { illustration: 'concept-layer-map', stageIds: ['application', 'transport', 'network', 'link', 'physical'] }, steps: [
        { id: 'application', label: 'APPLICATION MEANING', explanation: 'The application protocol defines what the request and response mean; it does not choose the physical path.' },
        { id: 'transport', label: 'TRANSPORT SERVICE', explanation: 'TCP serves the application processes; it still relies on IP to reach the remote host.' },
        { id: 'network', label: 'NETWORK DELIVERY', explanation: 'IPv4 identifies logical endpoints and supports routed forwarding; it does not select a switch port from a MAC table.' },
        { id: 'link', label: 'LOCAL DELIVERY', explanation: 'Ethernet frames and MAC addresses handle the current local link, not the complete routed path.' },
        { id: 'physical', label: 'PHYSICAL SIGNAL', explanation: 'The copper medium carries bits as signals without interpreting the frame or application meaning.' },
      ], result: 'One communication uses several responsibility groups without turning the OSI model into a literal seven-program machine.' },
      takeaway: 'Classify each concept by responsibility, then map the responsibility group between models.',
      checkpoint: { prompt: 'Which mapping is correct?', correctChoiceId: 'map', choices: [
        { id: 'map', label: 'OSI NETWORK → TCP/IP INTERNET', feedback: 'Correct. Both group IP logical addressing and routing responsibilities.' },
        { id: 'wrong1', label: 'OSI PHYSICAL → TCP/IP APPLICATION', feedback: 'Physical maps into the TCP/IP Network Access / Link group.' },
        { id: 'wrong2', label: 'OSI TRANSPORT → TCP/IP INTERNET', feedback: 'OSI Transport maps to TCP/IP Transport.' },
      ] },
    },
  ],
  questions: [
    { lessonId: 'why-models', prompt: 'Why use a layered model?', answers: ['To organize responsibilities and troubleshooting', 'To replace every real protocol', 'To guarantee identical vendor code'], correctAnswerIndex: 0, explanation: 'Models provide shared structure and vocabulary.' },
    { lessonId: 'seven-osi-layers', prompt: 'Which encapsulation order matches a TCP application carried over IPv4 Ethernet?', answers: ['Application data → TCP segment → IPv4 packet → Ethernet frame → bits', 'Ethernet frame → application data → IPv4 packet', 'Bits → route table → user account → MAC table'], correctAnswerIndex: 0, explanation: 'Each lower responsibility adds the information needed for its scope of delivery.' },
    { lessonId: 'osi-physical-layer', prompt: 'A port has no physical link. Which OSI layer is the first focus?', answers: ['Physical', 'Session', 'Application'], correctAnswerIndex: 0, explanation: 'Media, signals, and link establishment are Physical responsibilities.' },
    { lessonId: 'osi-data-link-layer', prompt: 'Where do Ethernet frames and MAC switching belong?', answers: ['Data Link', 'Transport', 'Presentation'], correctAnswerIndex: 0, explanation: 'They provide local Layer 2 delivery.' },
    { lessonId: 'osi-network-layer', prompt: 'Where do IPv4 addressing and routing belong?', answers: ['Network', 'Physical', 'Session'], correctAnswerIndex: 0, explanation: 'Logical addressing and routing are Network responsibilities.' },
    { lessonId: 'osi-transport-layer', prompt: 'Where should TCP and UDP be classified?', answers: ['Transport', 'Data Link', 'Presentation'], correctAnswerIndex: 0, explanation: 'TCP and UDP provide transport services.' },
    { lessonId: 'osi-session-layer', prompt: 'Which layer conceptually organizes application conversations?', answers: ['Session', 'Physical', 'Network'], correctAnswerIndex: 0, explanation: 'Session groups dialogue and conversation coordination.' },
    { lessonId: 'mapping-concepts', prompt: 'Where does IPv4 fit in the four-layer TCP/IP model?', answers: ['Internet', 'Application', 'Network Access only'], correctAnswerIndex: 0, explanation: 'IP and ICMP belong to the TCP/IP Internet layer.' },
  ],
  cards: [
    ['why-models', 'Why do networking models divide communication into layers?', 'They separate responsibilities so people can describe designs, relate protocols, and troubleshoot one part of a path at a time.', 'A model is a reasoning tool, not proof that every implementation follows a literal seven-step machine sequence.'],
    ['seven-osi-layers', 'What are the seven OSI layers from Layer 7 down to Layer 1?', 'Application, Presentation, Session, Transport, Network, Data Link, Physical.', 'Remember the order and then attach each protocol or device function to its responsibility.'],
    ['osi-physical-layer', 'What does OSI Layer 1 handle, and what does it not decide?', 'It handles signals, media, connectors, and bit transmission; it does not choose IPv4 routes.', 'Cables, radio signals, and link activation are Physical-layer concerns.'],
    ['osi-data-link-layer', 'What does OSI Layer 2 handle, and what stays outside its local scope?', 'It handles frames, MAC addressing, and local-link delivery; it does not route between IPv4 networks.', 'Ethernet switching and VLAN membership are Data Link responsibilities.'],
    ['osi-network-layer', 'What does OSI Layer 3 handle?', 'Logical addressing and forwarding between networks, including IPv4, ICMP, and routing decisions.', 'Layer 3 chooses an IP path; it does not define the electrical signal on a cable.'],
    ['osi-transport-layer', 'What responsibility belongs to OSI Layer 4?', 'End-to-end transport services for applications, such as TCP reliability or UDP datagrams and port-based delivery.', 'Transport does not select the router’s next-hop Ethernet port.'],
    ['osi-session-layer', 'What responsibility is associated with OSI Layer 5?', 'Conceptual coordination and management of application conversations or sessions.', 'It does not assign MAC addresses or transmit physical bits.'],
    ['osi-presentation-layer', 'What responsibility is associated with OSI Layer 6?', 'Representing, translating, encoding, compressing, or encrypting application information.', 'It changes how information is represented, not which IP route carries it.'],
    ['osi-application-layer', 'What does OSI Layer 7 provide?', 'Network-facing services and protocols used by applications, such as web, naming, and email protocols.', 'It is about application communication services, not the physical user interface alone.'],
    ['four-tcp-ip-layers', 'What are the four TCP/IP model layers from top to bottom?', 'Application, Transport, Internet, Network Access or Link.', 'The TCP/IP model groups several upper OSI responsibilities into its Application layer.'],
    ['mapping-concepts', 'How do the OSI and TCP/IP models map at the top and bottom?', 'OSI Layers 5–7 map broadly to TCP/IP Application, while OSI Layers 1–2 map broadly to Network Access or Link.', 'OSI Transport maps to TCP/IP Transport, and OSI Network maps to TCP/IP Internet.'],
    ['mapping-concepts', 'Which OSI layers contain cables, Ethernet and MAC, IPv4 and routing, TCP or UDP, and application protocols?', 'Cables: Physical; Ethernet and MAC: Data Link; IPv4 and routing: Network; TCP or UDP: Transport; application protocols: Application.', 'Classification follows the responsibility each concept performs.'],
  ],
  lab: ['layer-sorting-desk', 'Sort the network stack', 'Classify learned concepts in OSI and TCP/IP layers'],
  recap: ['A complete layered concept map', 'Every OSI layer, the TCP/IP groups, and responsibility-based mapping', 'Revisit any chapter and use the models to connect its concepts'],
});
