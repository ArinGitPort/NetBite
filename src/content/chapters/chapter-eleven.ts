import { createAdvancedChapter } from '@/content/advanced-content-helpers';

export const chapterEleven = createAdvancedChapter({
  id: 11, title: 'OSI and TCP/IP Models', summary: 'Use layered responsibilities to organize concepts and narrow troubleshooting questions.',
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
        { heading: 'Real stacks do not always expose it separately', body: 'Internet applications often implement session behavior inside application libraries or protocols rather than through one visible universal Session-layer protocol.' },
      ],
      example: { label: 'CONCEPTUAL SESSION', setup: 'Two application entities maintain a coordinated conversation after transport is available.', result: 'The conversation-management responsibility is classified at OSI Session, even if the software combines it elsewhere.' },
      takeaway: 'Session organizes and coordinates application conversations above transport.',
    },
    {
      id: 'osi-presentation-layer', title: 'Layer 6: Presentation', illustration: 'osi-presentation',
      body: 'The Presentation layer groups how information is represented so application entities can interpret it consistently. Encoding, data-format translation, serialization, compression, and encryption-related representation are common teaching examples.',
      sections: [
        { heading: 'Meaningful representation', body: 'Two applications must agree on how bytes represent text, images, numbers, or structured records. Presentation responsibilities bridge application meaning and transferable representation.' },
        { heading: 'Not every transformation is a separate layer program', body: 'Modern applications frequently use libraries and application protocols for these functions. The OSI model classifies responsibility rather than dictating one software package.' },
      ],
      example: { label: 'SAME DATA / AGREED FORM', setup: 'A sender serializes structured information into an agreed encoded form.', result: 'The receiver reverses the representation so its application can interpret the same information.' },
      takeaway: 'Presentation handles how application information is represented and transformed.',
    },
    {
      id: 'osi-application-layer', title: 'Layer 7: Application', illustration: 'osi-application',
      body: 'The Application layer provides network services and protocol behavior directly used by application processes. It is the highest OSI layer, but it is not the entire visible user interface or the human user.',
      sections: [
        { heading: 'Application protocols', body: 'Protocols for web access, naming, email, and file services are commonly classified here because they define application-level requests, responses, and data meaning.' },
        { heading: 'Depends on every lower responsibility', body: 'An application exchange still needs representation, conversation and transport services, logical routing, local delivery, and physical connectivity as appropriate.' },
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
      example: { label: 'END-TO-END REVIEW', setup: 'A user opens a web page carried through TCP, IPv4, Ethernet, and a copper link.', steps: [
        { id: 'application', label: 'APPLICATION MEANING', explanation: 'The application protocol defines the request and response.' },
        { id: 'transport', label: 'TRANSPORT SERVICE', explanation: 'TCP provides the application’s transport service.' },
        { id: 'network', label: 'NETWORK DELIVERY', explanation: 'IPv4 supplies logical endpoint addressing and routed forwarding.' },
        { id: 'link', label: 'LOCAL DELIVERY', explanation: 'Ethernet frames and MAC addresses handle each local link.' },
        { id: 'physical', label: 'PHYSICAL SIGNAL', explanation: 'The copper medium carries the current link’s bits as signals.' },
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
    { lessonId: 'seven-osi-layers', prompt: 'Which order is correct from Layer 1 upward?', answers: ['Physical, Data Link, Network, Transport', 'Application, Physical, Session, Network', 'Network, Data Link, Physical, Transport'], correctAnswerIndex: 0, explanation: 'The lower four begin Physical, Data Link, Network, Transport.' },
    { lessonId: 'osi-physical-layer', prompt: 'A port has no physical link. Which OSI layer is the first focus?', answers: ['Physical', 'Session', 'Application'], correctAnswerIndex: 0, explanation: 'Media, signals, and link establishment are Physical responsibilities.' },
    { lessonId: 'osi-data-link-layer', prompt: 'Where do Ethernet frames and MAC switching belong?', answers: ['Data Link', 'Transport', 'Presentation'], correctAnswerIndex: 0, explanation: 'They provide local Layer 2 delivery.' },
    { lessonId: 'osi-network-layer', prompt: 'Where do IPv4 addressing and routing belong?', answers: ['Network', 'Physical', 'Session'], correctAnswerIndex: 0, explanation: 'Logical addressing and routing are Network responsibilities.' },
    { lessonId: 'osi-transport-layer', prompt: 'Where should TCP and UDP be classified?', answers: ['Transport', 'Data Link', 'Presentation'], correctAnswerIndex: 0, explanation: 'TCP and UDP provide transport services.' },
    { lessonId: 'osi-session-layer', prompt: 'Which layer conceptually organizes application conversations?', answers: ['Session', 'Physical', 'Network'], correctAnswerIndex: 0, explanation: 'Session groups dialogue and conversation coordination.' },
    { lessonId: 'mapping-concepts', prompt: 'Where does IPv4 fit in the four-layer TCP/IP model?', answers: ['Internet', 'Application', 'Network Access only'], correctAnswerIndex: 0, explanation: 'IP and ICMP belong to the TCP/IP Internet layer.' },
  ],
  cards: [
    ['Layered Model', 'A grouping of networking responsibilities and services.', 'Use layers to narrow a fault.'], ['Physical', 'OSI Layer 1: signals, media, and physical connections.', 'Copper link state.'],
    ['Data Link', 'OSI Layer 2: frames and local MAC delivery.', 'Ethernet switching.'], ['Network', 'OSI Layer 3: logical addressing and routing.', 'IPv4 and ICMP.'],
    ['Transport', 'OSI Layer 4: end-to-end application transport services.', 'TCP and UDP.'], ['Session', 'OSI Layer 5: application-conversation coordination.', 'Dialogue management.'],
    ['Presentation', 'OSI Layer 6: information representation and transformation.', 'Encoding and serialization.'], ['Application', 'OSI Layer 7: network services used by applications.', 'A web application protocol.'],
    ['TCP/IP Application', 'The broad top TCP/IP group for application-support responsibilities.', 'Web, naming, and email protocols.'], ['TCP/IP Internet', 'The TCP/IP group containing IP, ICMP, and routing.', 'IPv4 forwarding.'],
    ['Network Access / Link', 'The TCP/IP bottom group for local access and transmission.', 'Ethernet over copper.'],
  ],
  lab: ['layer-sorting-desk', 'Sort the network stack', 'Classify learned concepts in OSI and TCP/IP layers'],
  recap: ['A complete layered concept map', 'Every OSI layer, the TCP/IP groups, and responsibility-based mapping', 'Revisit any chapter and use the models to connect its concepts'],
});
