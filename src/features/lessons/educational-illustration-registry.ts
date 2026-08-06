import type { LessonIllustration } from '@/content/types';

export type EducationAssetName =
  | 'server-terminal' | 'ethernet-frame' | 'ipv4-datagram' | 'arp-request' | 'arp-reply'
  | 'arp-cache' | 'icmp-echo-request' | 'icmp-echo-reply' | 'route-table'
  | 'vlan-tagged-frame' | 'transport-channel' | 'session-handshake'
  | 'presentation-encoding' | 'application-window';

export type DiagramTone = 'neutral' | 'red' | 'orange' | 'sage' | 'blue' | 'violet' | 'gold';
export type VisualToken = 'pc' | 'switch' | 'router' | 'copper-cable' | EducationAssetName;
export type IllustrationFamily = 'legacy' | 'topology' | 'sequence' | 'comparison' | 'address-range' | 'table' | 'stack' | 'mapping' | 'bit-strip' | 'subnet-map' | 'number-line' | 'prefix-ladder' | 'packet-fields';
export type IllustrationPresentation = 'auto' | 'full-address';

export interface DiagramValueLine {
  label?: string;
  value: string;
}

export interface DiagramBit {
  place: string;
  bit: '0' | '1';
  role: 'network' | 'host';
}

export interface DiagramSubnetRow {
  network: string;
  firstUsable: string;
  lastUsable: string;
  broadcast: string;
}

export interface DiagramMarker {
  label: string;
  value: string;
  detail?: string;
  tone?: DiagramTone;
}

export interface DiagramPrefixRow {
  prefix: string;
  mask: string;
  networkBits: string;
  hostBits: string;
  blockSize: string;
}

export interface DiagramProtocolField {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone?: DiagramTone;
}

export interface DiagramProtocolGroup {
  id: string;
  label: string;
  detail?: string;
  fields: DiagramProtocolField[];
}

export interface EducationalIllustrationStage {
  id: string;
  title?: string;
  accessibilityLabel: string;
  activeIndices?: number[];
  callouts?: DiagramSegment[];
  footer?: string;
  activeFieldIds?: string[];
}

export interface DiagramNode {
  label: string;
  detail?: string;
  token?: VisualToken;
  tone?: DiagramTone;
}

export interface DiagramSegment {
  label: string;
  value: string;
  detail?: string;
  valueLines?: DiagramValueLine[];
  tone?: DiagramTone;
  weight?: number;
}

export interface EducationalIllustrationSpec {
  id: LessonIllustration;
  family: IllustrationFamily;
  title: string;
  accessibilityLabel: string;
  sourceIds: string[];
  presentation?: IllustrationPresentation;
  nodes?: DiagramNode[];
  segments?: DiagramSegment[];
  headers?: string[];
  rows?: string[][];
  layers?: DiagramSegment[];
  rightLayers?: DiagramSegment[];
  mappings?: [leftLayer: string, rightLayer: string][];
  bits?: DiagramBit[];
  subnets?: DiagramSubnetRow[];
  markers?: DiagramMarker[];
  prefixRows?: DiagramPrefixRow[];
  protocolGroups?: DiagramProtocolGroup[];
  stages?: EducationalIllustrationStage[];
  footer?: string;
}

const legacy = (id: LessonIllustration, title: string, accessibilityLabel: string, sourceIds: string[]): EducationalIllustrationSpec => ({
  id, family: 'legacy', title, accessibilityLabel, sourceIds,
});

const spec = (definition: EducationalIllustrationSpec) => definition;
const guidedStages = (labels: Record<string, string>): EducationalIllustrationStage[] =>
  Object.entries(labels).map(([id, title]) => ({
    id,
    title,
    accessibilityLabel: `Guided visual stage: ${title}.`,
  }));

export const OSI_LAYERS: DiagramSegment[] = [
  { label: 'L7', value: 'APPLICATION', detail: 'Network services for applications', tone: 'violet' },
  { label: 'L6', value: 'PRESENTATION', detail: 'Representation, encoding, transformation', tone: 'blue' },
  { label: 'L5', value: 'SESSION', detail: 'Organizes application conversations', tone: 'sage' },
  { label: 'L4', value: 'TRANSPORT', detail: 'End-to-end transport services', tone: 'gold' },
  { label: 'L3', value: 'NETWORK', detail: 'Logical addressing and routing', tone: 'orange' },
  { label: 'L2', value: 'DATA LINK', detail: 'Frames and local MAC delivery', tone: 'red' },
  { label: 'L1', value: 'PHYSICAL', detail: 'Signals, media, and connectors', tone: 'neutral' },
];

export const TCP_IP_LAYERS: DiagramSegment[] = [
  { label: '4', value: 'APPLICATION', detail: 'Application support and services', tone: 'violet' },
  { label: '3', value: 'TRANSPORT', detail: 'TCP and UDP', tone: 'gold' },
  { label: '2', value: 'INTERNET', detail: 'IPv4, ICMP, and routing', tone: 'orange' },
  { label: '1', value: 'NETWORK ACCESS / LINK', detail: 'Ethernet, MAC, media, and signals', tone: 'sage' },
];

export const educationalIllustrations: Record<LessonIllustration, EducationalIllustrationSpec> = {
  network: legacy('network', 'ONE LOCAL NETWORK', 'Two PCs connected through one switch to form a local network.', ['C1-CISCO-NETWORK']),
  purpose: legacy('purpose', 'NETWORKS SHARE SERVICES', 'Two computers communicate through network infrastructure to share information and services.', ['C1-CISCO-NETWORK']),
  devices: legacy('devices', 'COMMON NETWORK DEVICES', 'A PC, switch, and router shown as distinct network device roles.', ['C1-CISCO-DEVICES']),
  connection: legacy('connection', 'PHYSICAL LAN LINKS', 'Two PCs use physical links to reach the same Ethernet switch.', ['C1-CISCO-LAN']),
  frame: spec({ id: 'frame', family: 'packet-fields', title: 'ETHERNET FRAME / OPERATIONAL FIELDS', accessibilityLabel: 'An Ethernet frame in transmission order contains destination MAC, source MAC, EtherType, payload, and frame check sequence fields.', sourceIds: ['IEEE-802.3', 'C2-CISCO-ETHERNET'], protocolGroups: [
    { id: 'ethernet-frame', label: 'ETHERNET FRAME', detail: 'FIELDS SHOWN IN TRANSMISSION ORDER', fields: [
      { id: 'destination-mac', label: 'DESTINATION MAC', value: '6 BYTES', detail: 'Names the local receiver or group.', tone: 'red' },
      { id: 'source-mac', label: 'SOURCE MAC', value: '6 BYTES', detail: 'Names the sending interface.', tone: 'blue' },
      { id: 'ethertype', label: 'ETHERTYPE', value: '2 BYTES', detail: 'Identifies the contained upper protocol.', tone: 'gold' },
      { id: 'payload', label: 'PAYLOAD', value: 'DATA', detail: 'Carries an upper-layer packet or message.', tone: 'sage' },
      { id: 'fcs', label: 'FRAME CHECK SEQUENCE', value: '4 BYTES', detail: 'Detects corruption; it does not repair data.', tone: 'orange' },
    ] },
  ], stages: [
    { id: 'payload', title: 'START WITH UPPER-LAYER DATA', accessibilityLabel: 'The Ethernet payload carries an upper-layer packet or message.', activeFieldIds: ['payload'] },
    { id: 'addresses', title: 'ADD LOCAL SOURCE AND DESTINATION', accessibilityLabel: 'The source and destination MAC fields identify interfaces on this local Ethernet path.', activeFieldIds: ['destination-mac', 'source-mac'] },
    { id: 'type', title: 'IDENTIFY THE PAYLOAD PROTOCOL', accessibilityLabel: 'EtherType tells the receiver which upper protocol is carried in the payload.', activeFieldIds: ['ethertype'] },
    { id: 'check', title: 'ADD THE ERROR-DETECTION CHECK', accessibilityLabel: 'The Frame Check Sequence lets a receiver detect corruption but does not repair it.', activeFieldIds: ['fcs'] },
  ], footer: 'PREAMBLE AND PHYSICAL TIMING ARE OUTSIDE THIS BEGINNER VIEW' }),
  nic: legacy('nic', 'NETWORK INTERFACE', 'A network interface controller provides an Ethernet connection for a host.', ['IEEE-802.3']),
  cables: legacy('cables', 'ETHERNET MEDIA', 'Copper carries electrical signals while fiber carries light signals.', ['IEEE-802.3']),
  ports: legacy('ports', 'PORT AND LINK STATE', 'An Ethernet port with link and activity indicators.', ['IEEE-802.3']),
  'mac-address': legacy('mac-address', '48-BIT MAC ADDRESS', 'A six-byte MAC address assigned to a network interface.', ['IEEE-802.3', 'IEEE-RA']),
  'mac-learning': legacy('mac-learning', 'SOURCE ADDRESS LEARNING', 'A switch records a frame source MAC address on the ingress port.', ['CISCO-MAC-LEARNING']),
  'switch-forwarding': legacy('switch-forwarding', 'UNICAST FORWARDING', 'Known unicast uses one learned port while unknown unicast floods every other active port.', ['CISCO-MAC-LEARNING']),
  broadcast: legacy('broadcast', 'LOCAL BROADCAST', 'A switch floods a broadcast through every active port except the ingress port.', ['IEEE-802.3', 'CISCO-MAC-LEARNING']),

  'device-types': spec({ id: 'device-types', family: 'comparison', title: 'ENDPOINTS AND INTERMEDIARIES', accessibilityLabel: 'PC and server are end devices, while switch and router are intermediary devices along the communication path.', sourceIds: ['C1-CISCO-DEVICES'], nodes: [
    { label: 'END DEVICES', detail: 'PC / SERVER / PRINTER', token: 'pc', tone: 'sage' }, { label: 'INTERMEDIARY DEVICES', detail: 'SWITCH / ROUTER', token: 'switch', tone: 'orange' },
  ] }),
  'ethernet-link': spec({ id: 'ethernet-link', family: 'topology', title: 'ONE LOCAL ETHERNET LINK', accessibilityLabel: 'A PC network interface and switch port form the two endpoints of one local Ethernet link.', sourceIds: ['IEEE-802.3'], nodes: [
    { label: 'PC NIC', detail: 'LINK ENDPOINT', token: 'pc', tone: 'blue' }, { label: 'ETHERNET MEDIA', detail: 'LOCAL SIGNAL PATH', token: 'copper-cable', tone: 'neutral' }, { label: 'SWITCH PORT', detail: 'LINK ENDPOINT', token: 'switch', tone: 'sage' },
  ] }),
  'cabling-rule': spec({ id: 'cabling-rule', family: 'comparison', title: 'MANUAL COPPER PAIRING', accessibilityLabel: 'In legacy manual copper cabling, unlike port roles use straight-through and like switch roles use crossover; auto-MDIX can correct the arrangement.', sourceIds: ['IEEE-802.3', 'C2-CISCO-MDIX'], nodes: [
    { label: 'UNLIKE ROLES', detail: 'PC OR ROUTER → SWITCH / STRAIGHT-THROUGH', token: 'copper-cable', tone: 'sage' }, { label: 'LIKE ROLES', detail: 'SWITCH → SWITCH / CROSSOVER', token: 'copper-cable', tone: 'orange' },
  ], footer: 'AUTO-MDIX CAN ADJUST A CAPABLE PORT AUTOMATICALLY' }),
  'mac-fields': spec({ id: 'mac-fields', family: 'sequence', title: 'SOURCE LEARNS / DESTINATION FORWARDS', accessibilityLabel: 'The source MAC identifies where a frame came from and is learned on ingress; the destination MAC is looked up to choose forwarding.', sourceIds: ['IEEE-802.3', 'CISCO-MAC-LEARNING'], nodes: [
    { label: 'SOURCE MAC', detail: 'LEARN ON INGRESS', token: 'ethernet-frame', tone: 'sage' }, { label: 'SWITCH TABLE', detail: 'SOURCE → PORT', token: 'switch', tone: 'orange' }, { label: 'DESTINATION MAC', detail: 'LOOK UP OUTPUT', token: 'ethernet-frame', tone: 'blue' },
  ] }),
  'unknown-unicast': spec({ id: 'unknown-unicast', family: 'topology', title: 'UNKNOWN DESTINATION FLOODING', accessibilityLabel: 'An unknown unicast entering port 1 is flooded through active ports 2 and 3, never back through ingress port 1.', sourceIds: ['CISCO-MAC-LEARNING'], nodes: [
    { label: 'INGRESS P1', detail: 'SOURCE LEARNED', token: 'pc', tone: 'orange' }, { label: 'SWITCH', detail: 'DESTINATION NOT IN TABLE', token: 'switch', tone: 'red' }, { label: 'OUTPUT P2 + P3', detail: 'EVERY OTHER ACTIVE PORT', token: 'pc', tone: 'sage' },
  ] }),

  'ipv4-address': spec({ id: 'ipv4-address', family: 'address-range', title: 'IPv4 / 32 BITS', accessibilityLabel: 'IPv4 address 192.168.10.25 divided into four eight-bit octets.', sourceIds: ['RFC-791'], segments: [
    { label: 'OCTET 1', value: '192', detail: '8 BITS', tone: 'blue' }, { label: 'OCTET 2', value: '168', detail: '8 BITS', tone: 'sage' },
    { label: 'OCTET 3', value: '10', detail: '8 BITS', tone: 'gold' }, { label: 'OCTET 4', value: '25', detail: '8 BITS', tone: 'orange' },
  ], stages: guidedStages({ 'ip-endpoints': 'SET THE SOURCE AND DESTINATION IP ENDPOINTS', 'first-link': 'ENCAPSULATE FOR THE FIRST LOCAL LINK', router: 'REMOVE THE FRAME AND INSPECT DESTINATION IP', 'second-link': 'ENCAPSULATE WITH NEW MAC ADDRESSES' }), footer: 'IP ENDPOINTS PERSIST / LOCAL-LINK MAC ADDRESSES CHANGE' }),
  'ipv4-octets': spec({ id: 'ipv4-octets', family: 'table', title: 'DOTTED DECIMAL', accessibilityLabel: 'Each IPv4 octet contains eight bits and has a decimal range from zero through 255.', sourceIds: ['RFC-791'], headers: ['OCTET', 'BITS', 'DECIMAL RANGE'], rows: [['1', '8', '0–255'], ['2', '8', '0–255'], ['3', '8', '0–255'], ['4', '8', '0–255']], footer: '192 . 168 . 10 . 25' }),
  'ipv4-prefix': spec({ id: 'ipv4-prefix', family: 'address-range', title: '192.168.10.25 /24', accessibilityLabel: 'In 192.168.10.25 slash 24, the first 24 bits identify the network and the final eight bits identify the host.', sourceIds: ['RFC-4632'], segments: [
    { label: 'NETWORK', value: '192.168.10', detail: '24 BITS', tone: 'sage', weight: 3 }, { label: 'HOST', value: '25', detail: '8 BITS', tone: 'orange' },
  ], stages: guidedStages({ 'host-network': 'DERIVE THE SOURCE NETWORK', 'destination-network': 'DERIVE THE DESTINATION NETWORK', compare: 'COMPARE THE TWO NETWORK IDENTITIES' }), footer: 'NETWORK 192.168.10.0 / HOST INTERFACE 192.168.10.25' }),
  'private-ipv4': spec({ id: 'private-ipv4', family: 'comparison', title: 'PRIVATE HOST SETTINGS', accessibilityLabel: 'A valid private IPv4 host is unique and usable; network, broadcast, duplicate, and off-network addresses are rejected.', sourceIds: ['RFC-1918', 'RFC-4632'], nodes: [
    { label: 'VALID HOST', detail: '192.168.10.25/24 / UNIQUE / USABLE', token: 'ipv4-datagram', tone: 'sage' },
    { label: 'REJECT', detail: 'NETWORK / BROADCAST / DUPLICATE / WRONG SUBNET', token: 'ipv4-datagram', tone: 'red' },
  ] }),
  'octet-bits': spec({ id: 'octet-bits', family: 'table', title: 'EIGHT BINARY PLACE VALUES', accessibilityLabel: 'An octet has bit place values 128, 64, 32, 16, 8, 4, 2, and 1; binary 11000000 equals decimal 192.', sourceIds: ['RFC-791'], headers: ['BIT', '128', '64', '32', '16', '8', '4', '2', '1'], rows: [['11000000', '1', '1', '0', '0', '0', '0', '0', '0']], stages: guidedStages({ positions: 'LABEL EACH PLACE VALUE', active: 'KEEP VALUES WHOSE BIT IS 1', sum: 'ADD 128 + 64' }), footer: '128 + 64 = 192' }),
  'network-host': spec({ id: 'network-host', family: 'address-range', title: 'PREFIX DEFINES THE BOUNDARY', accessibilityLabel: 'In 192.168.10.25 slash 24, the first three octets are the shared network portion and final octet 25 is the host portion.', sourceIds: ['RFC-4632'], segments: [
    { label: 'NETWORK PORTION', value: '192.168.10', detail: 'SHARED / 24 BITS', tone: 'sage', weight: 3 }, { label: 'HOST PORTION', value: '25', detail: 'UNIQUE / 8 BITS', tone: 'orange' },
  ] }),
  'private-ranges': spec({ id: 'private-ranges', family: 'table', title: 'RFC 1918 PRIVATE BLOCKS', accessibilityLabel: 'The three private IPv4 blocks are 10.0.0.0 slash 8, 172.16.0.0 slash 12, and 192.168.0.0 slash 16.', sourceIds: ['RFC-1918'], headers: ['BLOCK', 'FULL RANGE'], rows: [['10.0.0.0/8', '10.0.0.0 – 10.255.255.255'], ['172.16.0.0/12', '172.16.0.0 – 172.31.255.255'], ['192.168.0.0/16', '192.168.0.0 – 192.168.255.255']] }),
  'subnet-purpose': spec({ id: 'subnet-purpose', family: 'address-range', presentation: 'full-address', title: 'DIVIDE ONE ADDRESS SPACE', accessibilityLabel: 'The complete 192.168.10.0 slash 24 address space is divided into two slash 25 ranges, each with its own network and broadcast endpoints.', sourceIds: ['RFC-950', 'RFC-4632'], segments: [
    { label: 'FIRST /25', value: '192.168.10.0–192.168.10.127', valueLines: [{ label: 'NETWORK', value: '192.168.10.0' }, { label: 'BROADCAST', value: '192.168.10.127' }], tone: 'blue' },
    { label: 'SECOND /25', value: '192.168.10.128–192.168.10.255', valueLines: [{ label: 'NETWORK', value: '192.168.10.128' }, { label: 'BROADCAST', value: '192.168.10.255' }], tone: 'sage' },
  ], stages: guidedStages({ start: 'START WITH THE COMPLETE /24', split: 'SPLIT IT INTO TWO 128-ADDRESS RANGES', separate: 'EACH RANGE HAS ITS OWN ENDPOINTS' }), footer: 'THESE ARE ADDRESS RANGES, NOT PHYSICAL ROUTERS' }),
  'subnet-mask': spec({ id: 'subnet-mask', family: 'prefix-ladder', title: '/24 TO /27 BOUNDARY COMPARISON', accessibilityLabel: 'A vertical comparison shows slash 24 through slash 27 masks, network bits, host bits, and distance between network starts.', sourceIds: ['RFC-950', 'RFC-4632', 'RFC-1878'], prefixRows: [
    { prefix: '/24', mask: '255.255.255.0', networkBits: '24', hostBits: '8', blockSize: '256' },
    { prefix: '/25', mask: '255.255.255.128', networkBits: '25', hostBits: '7', blockSize: '128' },
    { prefix: '/26', mask: '255.255.255.192', networkBits: '26', hostBits: '6', blockSize: '64' },
    { prefix: '/27', mask: '255.255.255.224', networkBits: '27', hostBits: '5', blockSize: '32' },
  ], stages: guidedStages({ prefix: 'COUNT THE 26 NETWORK BITS', 'full-octets': 'THE FIRST 24 BITS FILL THREE OCTETS', remaining: 'TWO MORE NETWORK BITS MAKE 192' }), footer: 'A LONGER PREFIX LEAVES FEWER HOST BITS' }),
  'subnet-boundaries': spec({ id: 'subnet-boundaries', family: 'address-range', presentation: 'full-address', title: 'LOCATE 192.168.10.70 /26', accessibilityLabel: 'Host 192.168.10.70 lies between full slash 26 network starts 192.168.10.64 and 192.168.10.128.', sourceIds: ['RFC-950'], segments: [
    { label: 'CURRENT START', value: '192.168.10.64', tone: 'sage' }, { label: 'HOST', value: '192.168.10.70', tone: 'gold' }, { label: 'NEXT START', value: '192.168.10.128', tone: 'orange' },
  ], stages: guidedStages({ starts: 'FIND THE TWO NEIGHBORING STARTS', compare: 'PLACE 192.168.10.70 BETWEEN THEM', choose: 'THE LOWER START NAMES THE SUBNET' }), footer: '70 IS AT LEAST 64 AND BELOW 128' }),
  'subnet-range': spec({ id: 'subnet-range', family: 'address-range', presentation: 'full-address', title: '192.168.10.64 /26', accessibilityLabel: 'The slash 26 subnet begins at network address 192.168.10.64, has usable hosts 192.168.10.65 through 192.168.10.126, and ends at broadcast 192.168.10.127.', sourceIds: ['RFC-950'], segments: [
    { label: 'NETWORK', value: '192.168.10.64', tone: 'blue' }, { label: 'USABLE HOSTS', value: '192.168.10.65–192.168.10.126', valueLines: [{ label: 'FIRST', value: '192.168.10.65' }, { label: 'LAST', value: '192.168.10.126' }], tone: 'sage', weight: 4 }, { label: 'BROADCAST', value: '192.168.10.127', tone: 'orange' },
  ], stages: guidedStages({ network: 'MARK THE FIRST ADDRESS AS NETWORK', broadcast: 'MARK THE LAST ADDRESS AS BROADCAST', usable: 'THE ADDRESSES BETWEEN ARE USABLE' }), footer: 'FIRST AND LAST ADDRESSES ARE RESERVED' }),
  'host-bits': spec({ id: 'host-bits', family: 'table', title: 'HOST BITS CONTROL SIZE', accessibilityLabel: 'Slash 24 through slash 27 leave eight through five host bits and produce 256 through 32 total addresses.', sourceIds: ['RFC-950', 'RFC-4632'], headers: ['PREFIX', 'HOST BITS', 'TOTAL', 'USABLE'], rows: [['/24', '8', '256', '254'], ['/25', '7', '128', '126'], ['/26', '6', '64', '62'], ['/27', '5', '32', '30']], stages: guidedStages({ remaining: 'COUNT THE SIX HOST BITS LEFT BY /26', total: 'SIX BITS MAKE 64 ADDRESS COMBINATIONS', usable: 'REMOVE NETWORK AND BROADCAST' }) }),
  'block-size': spec({ id: 'block-size', family: 'number-line', title: '/26 NETWORK STARTS ADVANCE BY 64', accessibilityLabel: 'A full-address number line begins at 192.168.10.0 and repeatedly adds 64 to reach 192.168.10.64, 192.168.10.128, and 192.168.10.192.', sourceIds: ['RFC-950', 'RFC-1878'], markers: [
    { label: 'START', value: '192.168.10.0', detail: '0', tone: 'blue' },
    { label: 'ADD 64', value: '192.168.10.64', detail: '0 + 64', tone: 'sage' },
    { label: 'ADD 64', value: '192.168.10.128', detail: '64 + 64', tone: 'gold' },
    { label: 'ADD 64', value: '192.168.10.192', detail: '128 + 64', tone: 'orange' },
  ], stages: guidedStages({ size: 'A /26 CONTAINS 64 ADDRESSES', start: 'BEGIN AT 192.168.10.0', add: 'ADD 64 FOR EACH NEXT START' }), footer: '64, 128, AND 192 COME FROM REPEATEDLY ADDING THE 64-ADDRESS BLOCK SIZE' }),
  'subnet-method': spec({ id: 'subnet-method', family: 'sequence', title: 'REPEATABLE SUBNET WORKFLOW', accessibilityLabel: 'Subnet workflow proceeds from prefix to host bits, block size, boundaries, and finally network, usable, and broadcast range.', sourceIds: ['RFC-950'], nodes: [
    { label: 'PREFIX', detail: '/24–/27', token: 'ipv4-datagram', tone: 'blue' }, { label: 'HOST BITS', detail: '32 − PREFIX', token: 'route-table', tone: 'sage' }, { label: 'BLOCK + BOUNDARIES', detail: 'LOCATE ADDRESS', token: 'route-table', tone: 'gold' }, { label: 'FULL RANGE', detail: 'NETWORK / HOSTS / BROADCAST', token: 'ipv4-datagram', tone: 'orange' },
  ], stages: guidedStages({ bits: 'COUNT THE HOST BITS', block: 'TURN HOST BITS INTO BLOCK SIZE', starts: 'LIST EVERY FULL NETWORK START', locate: 'FIND THE CONTAINING INTERVAL', label: 'LABEL THE RESERVED ENDPOINTS' }) }),
  'subnet-borrowed-bits': spec({ id: 'subnet-borrowed-bits', family: 'bit-strip', title: '/26 USES TWO FINAL-OCTET NETWORK POSITIONS', accessibilityLabel: 'The final mask octet for slash 26 uses network bits in the 128 and 64 positions, producing binary 11000000 and decimal 192.', sourceIds: ['RFC-950', 'RFC-1878'], bits: [
    { place: '128', bit: '1', role: 'network' }, { place: '64', bit: '1', role: 'network' }, { place: '32', bit: '0', role: 'host' }, { place: '16', bit: '0', role: 'host' },
    { place: '8', bit: '0', role: 'host' }, { place: '4', bit: '0', role: 'host' }, { place: '2', bit: '0', role: 'host' }, { place: '1', bit: '0', role: 'host' },
  ], stages: guidedStages({ borrow: 'USE THE 128 AND 64 POSITIONS', add: 'ADD 128 + 64', write: 'WRITE THE COMPLETE MASK' }), footer: '128 + 64 = 192 / MASK 255.255.255.192' }),
  'subnet-map': spec({ id: 'subnet-map', family: 'subnet-map', title: 'COMPLETE /26 MAP', accessibilityLabel: 'Four slash 26 subnets display full network, usable host, and broadcast addresses inside 192.168.10.0 slash 24.', sourceIds: ['RFC-950', 'RFC-1878'], subnets: [
    { network: '192.168.10.0', firstUsable: '192.168.10.1', lastUsable: '192.168.10.62', broadcast: '192.168.10.63' },
    { network: '192.168.10.64', firstUsable: '192.168.10.65', lastUsable: '192.168.10.126', broadcast: '192.168.10.127' },
    { network: '192.168.10.128', firstUsable: '192.168.10.129', lastUsable: '192.168.10.190', broadcast: '192.168.10.191' },
    { network: '192.168.10.192', firstUsable: '192.168.10.193', lastUsable: '192.168.10.254', broadcast: '192.168.10.255' },
  ], stages: guidedStages({ current: 'SELECT THE SECOND NETWORK START', next: 'ADD 64 TO FIND THE NEXT START', end: 'END ONE ADDRESS BEFORE IT' }), footer: 'EVERY ROW CONTAINS 64 TOTAL ADDRESSES' }),

  'router-interfaces': spec({ id: 'router-interfaces', family: 'topology', title: 'ROUTER JOINS TWO LANS', accessibilityLabel: 'A router connects LAN A and LAN B using one separately addressed interface in each subnet.', sourceIds: ['RFC-1812'], nodes: [
    { label: 'LAN A', detail: '192.168.10.0/24', token: 'pc', tone: 'blue' }, { label: 'ROUTER', detail: '192.168.10.1 / 192.168.20.1', token: 'router', tone: 'orange' }, { label: 'LAN B', detail: '192.168.20.0/24', token: 'pc', tone: 'sage' },
  ], footer: 'ONE ADDRESSED ROUTER INTERFACE PER ATTACHED NETWORK' }),
  'local-remote': spec({ id: 'local-remote', family: 'comparison', title: 'COMPARE NETWORK IDENTITIES', accessibilityLabel: 'A host delivers directly to a destination in its own subnet and uses its gateway for a remote subnet.', sourceIds: ['RFC-1122'], nodes: [
    { label: 'LOCAL', detail: 'SAME PREFIX / DELIVER DIRECTLY', token: 'pc', tone: 'sage' }, { label: 'REMOTE', detail: 'DIFFERENT PREFIX / USE GATEWAY', token: 'router', tone: 'orange' },
  ] }),
  'default-gateway': spec({ id: 'default-gateway', family: 'sequence', title: 'REMOTE NEXT HOP', accessibilityLabel: 'PC A sends a remote destination toward gateway 192.168.10.1, which is reachable on PC A’s local subnet.', sourceIds: ['RFC-1122'], nodes: [
    { label: 'PC A', detail: '192.168.10.10/24', token: 'pc', tone: 'blue' }, { label: 'DEFAULT GATEWAY', detail: '192.168.10.1 / LOCAL', token: 'router', tone: 'orange' }, { label: 'REMOTE LAN', detail: '192.168.20.0/24', token: 'pc', tone: 'sage' },
  ], stages: guidedStages({ compare: 'COMPARE SOURCE AND DESTINATION NETWORKS', 'next-hop': 'SELECT THE LOCAL DEFAULT GATEWAY', frame: 'ADDRESS ETHERNET TO THE GATEWAY', ip: 'KEEP THE REMOTE IP DESTINATION' }), footer: 'AN OFF-SUBNET GATEWAY IS NOT DIRECTLY REACHABLE' }),
  'routed-frame': spec({ id: 'routed-frame', family: 'sequence', title: 'ROUTER FORWARDS THE IP DATAGRAM', accessibilityLabel: 'A host sends an Ethernet frame to a router; the router forwards the same IP endpoints inside a new link-layer frame on the next LAN.', sourceIds: ['RFC-1122', 'RFC-1812'], nodes: [
    { label: 'FRAME / LAN A', detail: 'LOCAL MAC DELIVERY', token: 'ethernet-frame', tone: 'blue' }, { label: 'IP DATAGRAM', detail: 'SOURCE AND DESTINATION IP REMAIN', token: 'ipv4-datagram', tone: 'orange' }, { label: 'FRAME / LAN B', detail: 'NEW LOCAL MAC DELIVERY', token: 'ethernet-frame', tone: 'sage' },
  ], stages: guidedStages({ first: 'BUILD THE FRAME FOR LAN A', remove: 'ROUTER REMOVES THE RECEIVED FRAME', second: 'BUILD A NEW FRAME FOR LAN B', endpoints: 'IP ENDPOINTS REMAIN THE SAME' }) }),
  'same-subnet': spec({ id: 'same-subnet', family: 'comparison', title: 'COMPARE PREFIX-DEFINED NETWORKS', accessibilityLabel: 'A host compares its own and destination network identities: matching prefixes mean local, different prefixes mean remote.', sourceIds: ['RFC-1122'], nodes: [
    { label: 'SAME /24', detail: '192.168.10.25 + 192.168.10.80 / LOCAL', token: 'pc', tone: 'sage' }, { label: 'DIFFERENT /24', detail: '192.168.10.25 + 192.168.20.80 / REMOTE', token: 'router', tone: 'orange' },
  ] }),
  'gateway-requirements': spec({ id: 'gateway-requirements', family: 'comparison', title: 'GATEWAY MUST BE LOCAL', accessibilityLabel: 'For host 192.168.10.25 slash 24, gateway 192.168.10.1 is locally reachable while 192.168.20.1 is off-subnet.', sourceIds: ['RFC-1122'], nodes: [
    { label: 'VALID GATEWAY', detail: '192.168.10.1 / SAME /24', token: 'router', tone: 'sage' }, { label: 'INVALID GATEWAY', detail: '192.168.20.1 / DIFFERENT /24', token: 'router', tone: 'red' },
  ] }),

  'arp-mapping': spec({ id: 'arp-mapping', family: 'sequence', title: 'RESOLVE LOCAL NEXT HOP', accessibilityLabel: 'ARP maps the local next-hop IPv4 address 192.168.10.20 to MAC address 02:00:00:00:00:0B.', sourceIds: ['RFC-826'], nodes: [
    { label: 'NEXT-HOP IPv4', detail: '192.168.10.20', token: 'ipv4-datagram', tone: 'blue' }, { label: 'ARP', detail: 'LOCAL RESOLUTION', token: 'arp-request', tone: 'orange' }, { label: 'DESTINATION MAC', detail: '02:00:00:00:00:0B', token: 'arp-reply', tone: 'sage' },
  ] }),
  'arp-request': spec({ id: 'arp-request', family: 'packet-fields', title: 'ARP REQUEST INSIDE ETHERNET', accessibilityLabel: 'PC A sends an ARP Request in an Ethernet broadcast frame. The Ethernet destination is FF:FF:FF:FF:FF:FF, EtherType is 0x0806, and the ARP message asks for the MAC owning 192.168.10.20.', sourceIds: ['RFC-826', 'IANA-ETHERTYPES'], protocolGroups: [
    { id: 'ethernet-envelope', label: 'OUTER ETHERNET FRAME', detail: 'DELIVERS THE QUESTION LOCALLY', fields: [
      { id: 'arp-eth-destination', label: 'DESTINATION MAC', value: 'FF:FF:FF:FF:FF:FF', detail: 'Broadcast to every interface in this VLAN.', tone: 'red' },
      { id: 'arp-eth-source', label: 'SOURCE MAC', value: '02:00:00:00:00:0A', detail: 'PC-A sent this frame.', tone: 'blue' },
      { id: 'arp-ethertype', label: 'ETHERTYPE', value: '0x0806', detail: 'The payload contains ARP.', tone: 'gold' },
    ] },
    { id: 'arp-message', label: 'ARP REQUEST PAYLOAD', detail: 'ASSERTION ABOUT A / QUESTION ABOUT B', fields: [
      { id: 'arp-operation', label: 'OPERATION', value: 'REQUEST (1)', detail: 'This message asks for a mapping.', tone: 'orange' },
      { id: 'arp-sender', label: 'SENDER IPv4 + MAC', value: '192.168.10.10 / 02:00:00:00:00:0A', detail: 'PC-A identifies itself so peers can learn it.', tone: 'blue' },
      { id: 'arp-target-ip', label: 'TARGET IPv4', value: '192.168.10.20', detail: 'Only the owner of this address should answer normally.', tone: 'sage' },
      { id: 'arp-target-mac', label: 'TARGET HARDWARE', value: 'UNKNOWN / UNUSED', detail: 'This is the missing value; it is not the Ethernet broadcast field.', tone: 'neutral' },
    ] },
  ], stages: [
    { id: 'build', title: 'BUILD THE ARP QUESTION', accessibilityLabel: 'PC A supplies its own IPv4 and MAC plus target IPv4 192.168.10.20.', activeFieldIds: ['arp-operation', 'arp-sender', 'arp-target-ip', 'arp-target-mac'] },
    { id: 'broadcast', title: 'BROADCAST THE ETHERNET FRAME', accessibilityLabel: 'The unknown target MAC causes PC A to use Ethernet destination FF:FF:FF:FF:FF:FF with EtherType 0x0806.', activeFieldIds: ['arp-eth-destination', 'arp-eth-source', 'arp-ethertype'] },
    { id: 'flood', title: 'SWITCH FLOODS WITHIN VLAN 1', accessibilityLabel: 'The switch floods the broadcast through every other active VLAN 1 port and excludes ingress.', activeFieldIds: ['arp-eth-destination'] },
    { id: 'inspect', title: 'ONLY THE IPv4 OWNER ANSWERS NORMALLY', accessibilityLabel: 'Every local interface may inspect the request, but only the owner of 192.168.10.20 normally answers.', activeFieldIds: ['arp-target-ip'] },
  ], footer: 'CISCO DISPLAY FORMAT FOR THE SAME BROADCAST MAC: FFFF.FFFF.FFFF' }),
  'arp-reply': spec({ id: 'arp-reply', family: 'packet-fields', title: 'ARP REPLY AND CACHE UPDATE', accessibilityLabel: 'PC B normally sends a unicast ARP Reply to PC A, identifying 192.168.10.20 as MAC 02:00:00:00:00:0B, and PC A stores the mapping.', sourceIds: ['RFC-826'], protocolGroups: [
    { id: 'reply-frame', label: 'OUTER ETHERNET FRAME', detail: 'DIRECT RESPONSE TO THE REQUESTER', fields: [
      { id: 'reply-eth-destination', label: 'DESTINATION MAC', value: '02:00:00:00:00:0A', detail: 'Normally unicast to PC-A.', tone: 'blue' },
      { id: 'reply-eth-source', label: 'SOURCE MAC', value: '02:00:00:00:00:0B', detail: 'PC-B owns the requested address.', tone: 'sage' },
      { id: 'reply-ethertype', label: 'ETHERTYPE', value: '0x0806', detail: 'The payload still contains ARP.', tone: 'gold' },
    ] },
    { id: 'reply-message', label: 'ARP REPLY PAYLOAD', fields: [
      { id: 'reply-operation', label: 'OPERATION', value: 'REPLY (2)', detail: 'This message supplies the mapping.', tone: 'orange' },
      { id: 'reply-mapping', label: 'SENDER MAPPING', value: '192.168.10.20 / 02:00:00:00:00:0B', detail: 'The fact PC-A needed to build its data frame.', tone: 'sage' },
      { id: 'reply-target', label: 'REQUESTER', value: '192.168.10.10 / 02:00:00:00:00:0A', detail: 'The response is directed back to PC-A.', tone: 'blue' },
    ] },
  ], stages: [
    { id: 'learn-requester', title: 'PC-B CAN LEARN PC-A FROM THE REQUEST', accessibilityLabel: 'The original request carried PC A sender IPv4 and MAC, allowing PC B to learn that mapping.', activeFieldIds: ['reply-target'] },
    { id: 'build-reply', title: 'PC-B BUILDS THE REPLY', accessibilityLabel: 'PC B sets operation Reply and supplies its own IPv4 to MAC mapping.', activeFieldIds: ['reply-operation', 'reply-mapping'] },
    { id: 'unicast', title: 'REPLY NORMALLY RETURNS BY UNICAST', accessibilityLabel: 'PC B normally sends the Ethernet frame directly to PC A MAC.', activeFieldIds: ['reply-eth-destination', 'reply-eth-source', 'reply-ethertype'] },
    { id: 'cache', title: 'PC-A STORES THE MAPPING', accessibilityLabel: 'PC A stores 192.168.10.20 mapped to 02:00:00:00:00:0B for later frame delivery.', activeFieldIds: ['reply-mapping'] },
  ], footer: 'RFC 826 DESCRIBES THE NORMAL DIRECT REPLY; OTHER SPECIFIED CASES MAY USE BROADCAST REPLIES' }),
  'arp-next-hop': spec({ id: 'arp-next-hop', family: 'comparison', title: 'WHAT DOES ARP RESOLVE?', accessibilityLabel: 'For local delivery ARP resolves the destination host; for remote delivery ARP resolves the local default gateway, not the remote host.', sourceIds: ['RFC-826', 'RFC-1122'], nodes: [
    { label: 'LOCAL DESTINATION', detail: 'RESOLVE DESTINATION HOST MAC', token: 'pc', tone: 'sage' }, { label: 'REMOTE DESTINATION', detail: 'RESOLVE LOCAL GATEWAY MAC', token: 'router', tone: 'orange' },
  ] }),
  'arp-cache': spec({ id: 'arp-cache', family: 'sequence', title: 'CACHE BEFORE BROADCAST', accessibilityLabel: 'A host checks its ARP cache first; a usable mapping builds the frame immediately, while a missing mapping triggers a local request.', sourceIds: ['RFC-826'], nodes: [
    { label: 'NEXT-HOP IPv4', detail: 'ALREADY SELECTED', token: 'ipv4-datagram', tone: 'blue' }, { label: 'ARP CACHE', detail: 'LOOK FOR USABLE ENTRY', token: 'arp-cache', tone: 'gold' }, { label: 'HIT OR REQUEST', detail: 'USE MAC / BROADCAST', token: 'arp-request', tone: 'orange' },
  ] }),
  'arp-local-sequence': spec({ id: 'arp-local-sequence', family: 'sequence', title: 'LOCAL DESTINATION RESOLUTION', accessibilityLabel: 'For a local destination, the sender resolves the destination host IPv4 address, learns its MAC, then sends the frame to that MAC.', sourceIds: ['RFC-826', 'RFC-1122'], nodes: [
    { label: 'COMPARE PREFIX', detail: 'DESTINATION IS LOCAL', token: 'ipv4-datagram', tone: 'blue' }, { label: 'RESOLVE HOST', detail: 'ARP FOR DESTINATION IPv4', token: 'arp-request', tone: 'orange' }, { label: 'SEND FRAME', detail: 'DESTINATION HOST MAC', token: 'ethernet-frame', tone: 'sage' },
  ] }),

  'icmp-role': spec({ id: 'icmp-role', family: 'stack', title: 'ICMP / INTERNET LAYER', accessibilityLabel: 'ICMP is an Internet-layer control protocol carried using IP; it reports conditions and supports diagnostics.', sourceIds: ['RFC-792', 'RFC-1122'], layers: [
    { label: 'APPLICATION', value: 'USER SERVICES', tone: 'violet' }, { label: 'TRANSPORT', value: 'TCP / UDP', tone: 'gold' }, { label: 'INTERNET', value: 'IPv4 + ICMP', detail: 'CONTROL AND ERROR REPORTING', tone: 'orange' }, { label: 'LINK', value: 'LOCAL DELIVERY', tone: 'sage' },
  ], footer: 'ICMP SUPPORTS IP / IT DOES NOT REPAIR THE PATH' }),
  'echo-exchange': spec({ id: 'echo-exchange', family: 'packet-fields', title: 'ICMP ECHO REQUEST AND REPLY', accessibilityLabel: 'An IPv4 ICMP Echo Request uses Type 8 Code 0. Its Echo Reply uses Type 0 Code 0 and returns the same identifier and sequence number.', sourceIds: ['RFC-792'], protocolGroups: [
    { id: 'echo-request', label: 'ECHO REQUEST', detail: 'SOURCE TO DESTINATION', fields: [
      { id: 'echo-request-type', label: 'TYPE / CODE', value: '8 / 0', detail: 'Identifies an IPv4 Echo Request.', tone: 'orange' },
      { id: 'echo-request-id', label: 'IDENTIFIER', value: 'SESSION MATCH', detail: 'Helps the sender associate the reply with this test.', tone: 'blue' },
      { id: 'echo-request-sequence', label: 'SEQUENCE', value: 'REQUEST NUMBER', detail: 'Distinguishes requests in the same test.', tone: 'gold' },
    ] },
    { id: 'echo-reply', label: 'ECHO REPLY', detail: 'DESTINATION BACK TO SOURCE', fields: [
      { id: 'echo-reply-type', label: 'TYPE / CODE', value: '0 / 0', detail: 'Identifies an IPv4 Echo Reply.', tone: 'sage' },
      { id: 'echo-reply-match', label: 'RETURNED VALUES', value: 'SAME ID + SEQUENCE', detail: 'Lets the source match the response to its request.', tone: 'blue' },
    ] },
  ], stages: [
    { id: 'request', title: 'SEND TYPE 8 / CODE 0', accessibilityLabel: 'The source sends an IPv4 ICMP Echo Request using Type 8 Code 0 with an identifier and sequence number.', activeFieldIds: ['echo-request-type', 'echo-request-id', 'echo-request-sequence'] },
    { id: 'reply', title: 'RETURN TYPE 0 / CODE 0', accessibilityLabel: 'The destination returns an IPv4 ICMP Echo Reply using Type 0 Code 0.', activeFieldIds: ['echo-reply-type'] },
    { id: 'match', title: 'MATCH ID AND SEQUENCE', accessibilityLabel: 'The reply returns the same identifier and sequence number so the source can match it to the request.', activeFieldIds: ['echo-request-id', 'echo-request-sequence', 'echo-reply-match'] },
  ], footer: 'THE REPLY NEEDS A VALID RETURN PATH' }),
  'ping-boundary': spec({ id: 'ping-boundary', family: 'comparison', title: 'PING IS EVIDENCE', accessibilityLabel: 'An Echo Reply supports round-trip IP reachability for that test; no reply requires further checks and does not identify one certain fault.', sourceIds: ['RFC-792', 'CISCO-PING'], nodes: [
    { label: 'REPLY RECEIVED', detail: 'ROUND-TRIP IP REACHABILITY FOR THIS TEST', token: 'icmp-echo-reply', tone: 'sage' }, { label: 'NO REPLY', detail: 'CHECK LINK / CONFIG / PATH / DESTINATION / FILTERING', token: 'icmp-echo-request', tone: 'red' },
  ] }),
  'diagnostic-path': spec({ id: 'diagnostic-path', family: 'sequence', title: 'CHECK DEPENDENCIES IN ORDER', accessibilityLabel: 'Troubleshooting checks the local link, host address and prefix, default gateway for remote traffic, then remote path, destination, or filtering.', sourceIds: ['RFC-1122', 'CISCO-PING'], nodes: [
    { label: '1 / LINK', detail: 'MEDIA AND PORT STATE', token: 'copper-cable', tone: 'neutral' }, { label: '2 / ADDRESS', detail: 'HOST IPv4 AND PREFIX', token: 'ipv4-datagram', tone: 'blue' }, { label: '3 / GATEWAY', detail: 'REMOTE DESTINATIONS', token: 'router', tone: 'orange' }, { label: '4 / REMOTE PATH', detail: 'DESTINATION OR FILTERING', token: 'server-terminal', tone: 'sage' },
  ] }),
  'ping-outcomes': spec({ id: 'ping-outcomes', family: 'comparison', title: 'OBSERVE THE ECHO RESULT', accessibilityLabel: 'Ping may show a reply, a timeout with no expected reply in time, or an explicit reported error; each is evidence rather than a complete diagnosis.', sourceIds: ['RFC-792', 'CISCO-PING'], nodes: [
    { label: 'REPLY', detail: 'ROUND TRIP COMPLETED', token: 'icmp-echo-reply', tone: 'sage' }, { label: 'TIMEOUT / ERROR', detail: 'RECORD THEN INVESTIGATE', token: 'icmp-echo-request', tone: 'orange' },
  ] }),
  'ping-failure': spec({ id: 'ping-failure', family: 'comparison', title: 'ONE SYMPTOM / MANY POSSIBILITIES', accessibilityLabel: 'A missing Echo Reply can involve link, addressing, gateway, route, destination, congestion, or filtering and does not prove one cause.', sourceIds: ['RFC-792', 'CISCO-PING'], nodes: [
    { label: 'NEAR-SIDE CHECKS', detail: 'LINK / ADDRESS / GATEWAY', token: 'pc', tone: 'orange' }, { label: 'FAR-SIDE CHECKS', detail: 'ROUTE / DESTINATION / FILTERING', token: 'server-terminal', tone: 'red' },
  ] }),

  'connected-routes': spec({ id: 'connected-routes', family: 'topology', title: 'CONNECTED AND REMOTE NETWORKS', accessibilityLabel: 'A router knows active directly attached networks as connected routes; another network needs a learned or configured route.', sourceIds: ['RFC-1812'], nodes: [
    { label: 'CONNECTED LAN', detail: 'ACTIVE LOCAL INTERFACE', token: 'pc', tone: 'sage' }, { label: 'ROUTER', detail: 'ROUTE TABLE', token: 'router', tone: 'orange' }, { label: 'REMOTE LAN', detail: 'NEEDS ANOTHER PATH', token: 'pc', tone: 'blue' },
  ] }),
  'route-entry': spec({ id: 'route-entry', family: 'table', title: 'READ ONE ROUTE ENTRY', accessibilityLabel: 'A route entry contains a destination prefix, route source, next hop when required, and exit interface.', sourceIds: ['RFC-1812', 'CISCO-STATIC'], headers: ['DESTINATION', 'SOURCE', 'NEXT HOP', 'EXIT'], rows: [['192.168.10.0/24', 'CONNECTED', '—', 'LAN A'], ['192.168.30.0/24', 'STATIC', '10.0.12.2', 'P2'], ['0.0.0.0/0', 'DEFAULT', '10.0.12.2', 'P2']], footer: 'MATCH DESTINATION / THEN FORWARD' }),
  'static-route': spec({ id: 'static-route', family: 'topology', title: 'FORWARD AND RETURN ROUTES', accessibilityLabel: 'LAN A and LAN C communicate across three routers only when both the forward and return paths have routes.', sourceIds: ['RFC-1812', 'CISCO-STATIC'], nodes: [
    { label: 'LAN A / R1', detail: '192.168.10.0/24', token: 'router', tone: 'blue' }, { label: 'R2 / TRANSIT', detail: 'FORWARD + RETURN', token: 'router', tone: 'orange' }, { label: 'R3 / LAN C', detail: '192.168.30.0/24', token: 'router', tone: 'sage' },
  ], footer: 'OUTBOUND PATH ALONE IS NOT ENOUGH' }),
  'longest-prefix': spec({ id: 'longest-prefix', family: 'comparison', title: 'LONGEST MATCH WINS', accessibilityLabel: 'When slash 24, slash 16, and default slash zero routes match, the router selects slash 24 because it is most specific.', sourceIds: ['RFC-1812', 'RFC-4632'], nodes: [
    { label: '/24 SELECTED', detail: '192.168.10.0/24 / MOST SPECIFIC', token: 'route-table', tone: 'sage' }, { label: '/16 THEN /0', detail: 'LESS SPECIFIC / DEFAULT FALLBACK', token: 'route-table', tone: 'neutral' },
  ], stages: guidedStages({ candidates: 'KEEP ONLY ROUTES THAT MATCH', lengths: 'COMPARE THEIR PREFIX LENGTHS', winner: 'SELECT THE LONGEST MATCH' }) }),
  'route-purpose': spec({ id: 'route-purpose', family: 'sequence', title: 'DESTINATION LOOKUP', accessibilityLabel: 'A router compares the destination IPv4 address with route-table prefixes, selects the longest usable match, and forwards through its path.', sourceIds: ['RFC-1812'], nodes: [
    { label: 'DESTINATION IPv4', detail: 'ADDRESS TO MATCH', token: 'ipv4-datagram', tone: 'blue' }, { label: 'ROUTE TABLE', detail: 'PREFIX LOOKUP', token: 'route-table', tone: 'gold' }, { label: 'FORWARDING PATH', detail: 'NEXT HOP / EXIT', token: 'router', tone: 'sage' },
  ], stages: guidedStages({ read: 'READ THE DESTINATION IPv4 ADDRESS', match: 'FIND ALL MATCHING ROUTES', select: 'SELECT THE MOST SPECIFIC MATCH', update: 'REDUCE TTL AND UPDATE THE IPv4 HEADER', forward: 'RESOLVE THE NEXT HOP AND BUILD A NEW FRAME' }) }),
  'route-next-hop': spec({ id: 'route-next-hop', family: 'topology', title: 'STATIC NEXT HOP', accessibilityLabel: 'Router R1 uses a static route for remote LAN C through reachable neighboring router 10.0.12.2.', sourceIds: ['RFC-1812', 'CISCO-STATIC'], nodes: [
    { label: 'R1', detail: 'STATIC 192.168.30.0/24', token: 'router', tone: 'blue' }, { label: 'NEXT HOP', detail: '10.0.12.2 / REACHABLE', token: 'router', tone: 'orange' }, { label: 'LAN C', detail: 'REMOTE PREFIX', token: 'pc', tone: 'sage' },
  ] }),
  'default-route': spec({ id: 'default-route', family: 'comparison', title: 'SPECIFIC ROUTE BEFORE DEFAULT', accessibilityLabel: 'A specific slash 24 route wins when it matches; default 0.0.0.0 slash 0 is used only when no more-specific usable route matches.', sourceIds: ['RFC-1812', 'RFC-4632'], nodes: [
    { label: 'SPECIFIC /24', detail: 'SELECT WHEN MATCHED', token: 'route-table', tone: 'sage' }, { label: 'DEFAULT /0', detail: 'FALLBACK ONLY', token: 'route-table', tone: 'neutral' },
  ] }),
  'route-match-test': spec({ id: 'route-match-test', family: 'table', title: 'MATCH BEFORE SELECTING', accessibilityLabel: 'For destination 192.168.10.25, routes 192.168.10.0 slash 24 and 192.168.0.0 slash 16 match, while 10.0.0.0 slash 8 does not.', sourceIds: ['RFC-1812', 'RFC-4632'], headers: ['ROUTE', 'DESTINATION IN RANGE?'], rows: [['192.168.10.0/24', 'YES'], ['192.168.0.0/16', 'YES'], ['10.0.0.0/8', 'NO']], stages: [
    { id: '24', title: 'TEST DESTINATION AGAINST THE /24 RANGE', accessibilityLabel: 'Guided visual stage: test the destination against the slash 24 range.' },
    { id: '16', title: 'TEST DESTINATION AGAINST THE /16 RANGE', accessibilityLabel: 'Guided visual stage: test the destination against the slash 16 range.' },
    { id: '8', title: 'REJECT THE NONMATCHING /8 RANGE', accessibilityLabel: 'Guided visual stage: reject the nonmatching slash 8 range.' },
  ] }),

  'vlan-segments': spec({ id: 'vlan-segments', family: 'comparison', title: 'ONE SWITCH / TWO LOGICAL LANS', accessibilityLabel: 'VLAN 10 and VLAN 20 form separate Layer 2 broadcast domains on the same physical switch.', sourceIds: ['IEEE-802.1Q'], nodes: [
    { label: 'VLAN 10', detail: 'SEPARATE BROADCAST DOMAIN', token: 'pc', tone: 'blue' }, { label: 'VLAN 20', detail: 'SEPARATE BROADCAST DOMAIN', token: 'pc', tone: 'gold' },
  ], footer: 'A VLAN IS LOGICAL LAYER 2 SEPARATION' }),
  'access-port': spec({ id: 'access-port', family: 'sequence', title: 'ACCESS PORT MEMBERSHIP', accessibilityLabel: 'A PC attaches to one switch access port assigned to VLAN 10; the endpoint traffic is associated with that VLAN.', sourceIds: ['IEEE-802.1Q', 'CISCO-VLAN'], nodes: [
    { label: 'PC A', detail: 'ENDPOINT', token: 'pc', tone: 'blue' }, { label: 'ACCESS PORT', detail: 'ONE ASSIGNED VLAN', token: 'switch', tone: 'sage' }, { label: 'VLAN 10', detail: 'PORT MEMBERSHIP', token: 'vlan-tagged-frame', tone: 'blue' },
  ] }),
  'vlan-reachability': spec({ id: 'vlan-reachability', family: 'comparison', title: 'SAME VLAN OR DIFFERENT VLAN?', accessibilityLabel: 'Endpoints in the same VLAN can use a Layer 2 switching path; endpoints in different VLANs require Layer 3 routing.', sourceIds: ['IEEE-802.1Q', 'CISCO-VLAN'], nodes: [
    { label: 'SAME VLAN', detail: 'LAYER 2 SWITCHING PATH', token: 'switch', tone: 'sage' }, { label: 'DIFFERENT VLAN', detail: 'LAYER 3 ROUTING REQUIRED', token: 'router', tone: 'orange' },
  ] }),
  'vlan-trunk': spec({ id: 'vlan-trunk', family: 'topology', title: '802.1Q INTER-SWITCH TRUNK', accessibilityLabel: 'A trunk between two switches carries allowed traffic for VLAN 10 and VLAN 20 without merging their broadcast domains.', sourceIds: ['IEEE-802.1Q', 'CISCO-VLAN'], nodes: [
    { label: 'SWITCH A', detail: 'ACCESS VLANS 10 + 20', token: 'switch', tone: 'blue' }, { label: 'TRUNK', detail: 'ALLOW VLAN 10 + 20', token: 'vlan-tagged-frame', tone: 'orange' }, { label: 'SWITCH B', detail: 'ACCESS VLANS 10 + 20', token: 'switch', tone: 'sage' },
  ], footer: 'THE TRUNK CARRIES VLANS / IT DOES NOT COMBINE THEM' }),
  'vlan-purpose': spec({ id: 'vlan-purpose', family: 'comparison', title: 'ONE CHASSIS / SEPARATE LOGICAL LANS', accessibilityLabel: 'Ports on one physical switch are configured into VLAN 10 and VLAN 20 as separate logical Layer 2 networks.', sourceIds: ['IEEE-802.1Q', 'CISCO-VLAN'], nodes: [
    { label: 'PHYSICAL SWITCH', detail: 'SHARED HARDWARE', token: 'switch', tone: 'neutral' }, { label: 'LOGICAL MEMBERSHIP', detail: 'VLAN 10 / VLAN 20', token: 'vlan-tagged-frame', tone: 'orange' },
  ] }),
  'same-vlan': spec({ id: 'same-vlan', family: 'topology', title: 'SAME-VLAN LAYER 2 PATH', accessibilityLabel: 'Two PCs in VLAN 10 can use a Layer 2 switching path when access membership and every link carrying VLAN 10 are valid.', sourceIds: ['IEEE-802.1Q', 'CISCO-VLAN'], nodes: [
    { label: 'PC A / VLAN 10', token: 'pc', tone: 'blue' }, { label: 'SWITCHING PATH', detail: 'VLAN 10', token: 'switch', tone: 'sage' }, { label: 'PC B / VLAN 10', token: 'pc', tone: 'blue' },
  ] }),
  'dot1q-tag': spec({ id: 'dot1q-tag', family: 'packet-fields', title: '802.1Q TAG INSIDE AN ETHERNET FRAME', accessibilityLabel: 'A four-byte 802.1Q tag appears after the source MAC and before EtherType. TPID 0x8100 marks the tag and the twelve-bit VLAN identifier carries VLAN context.', sourceIds: ['IEEE-802.1Q', 'CISCO-8021Q-FRAME'], protocolGroups: [
    { id: 'tagged-frame', label: 'TRANSMISSION ORDER', detail: 'DESTINATION / SOURCE / 802.1Q TAG / ETHERTYPE / PAYLOAD / FCS', fields: [
      { id: 'tag-destination', label: 'DESTINATION MAC', value: '6 BYTES', detail: 'Local Layer 2 receiver.', tone: 'red' },
      { id: 'tag-source', label: 'SOURCE MAC', value: '6 BYTES', detail: 'Local Layer 2 sender.', tone: 'blue' },
      { id: 'tag-tpid', label: 'TPID', value: '0x8100 / 16 BITS', detail: 'Marks the presence of an IEEE 802.1Q tag.', tone: 'orange' },
      { id: 'tag-pcp-dei', label: 'PCP + DEI', value: '3 + 1 BITS', detail: 'Priority and drop eligibility; not configured in this course.', tone: 'neutral' },
      { id: 'tag-vid', label: 'VLAN ID', value: '12 BITS', detail: 'Preserves VLAN context on the shared link.', tone: 'gold' },
      { id: 'tag-ethertype', label: 'ETHERTYPE', value: '2 BYTES', detail: 'Identifies the payload protocol after the tag.', tone: 'sage' },
    ] },
  ], footer: 'THE FOUR-BYTE TAG IS INSERTED AFTER SOURCE MAC; THE FCS IS RECALCULATED' }),
  'inter-vlan-boundary': spec({ id: 'inter-vlan-boundary', family: 'sequence', title: 'CROSS A VLAN BOUNDARY', accessibilityLabel: 'PC-A in VLAN 10 reaches PC-B in VLAN 20 only through a Layer 3 router; the two Layer 2 broadcast domains remain separate.', sourceIds: ['IEEE-802.1Q', 'RFC-1812', 'CISCO-INTER-VLAN'], nodes: [
    { label: 'PC-A / VLAN 10', detail: '192.168.10.10/24', token: 'pc', tone: 'blue' }, { label: 'R-1 / LAYER 3', detail: 'ROUTES BETWEEN NETWORKS', token: 'router', tone: 'orange' }, { label: 'PC-B / VLAN 20', detail: '192.168.20.20/24', token: 'pc', tone: 'gold' },
  ], footer: 'ROUTING CROSSES THE BOUNDARY / IT DOES NOT MERGE THE VLANS' }),
  'vlan-gateway': spec({ id: 'vlan-gateway', family: 'comparison', title: 'ONE LOCAL GATEWAY PER VLAN', accessibilityLabel: 'VLAN 10 host PC-A uses gateway 192.168.10.1 while VLAN 20 host PC-B uses gateway 192.168.20.1; each gateway is in its host local subnet.', sourceIds: ['RFC-1122', 'RFC-1812', 'CISCO-INTER-VLAN'], nodes: [
    { label: 'VLAN 10 GATEWAY', detail: '192.168.10.1/24', token: 'router', tone: 'blue' }, { label: 'VLAN 20 GATEWAY', detail: '192.168.20.1/24', token: 'router', tone: 'gold' },
  ] }),
  'router-on-stick': spec({ id: 'router-on-stick', family: 'topology', title: 'ROUTER-ON-A-STICK', accessibilityLabel: 'PC-A and PC-B use separate access VLANs on one switch. Switch port F0/24 is an 802.1Q trunk to one physical router interface G0/0.', sourceIds: ['IEEE-802.1Q', 'CISCO-INTER-VLAN'], nodes: [
    { label: 'VLAN 10 ACCESS', detail: 'PC-A / F0/1', token: 'pc', tone: 'blue' }, { label: 'SW-1', detail: 'F0/24 TRUNK / ALLOW 10,20', token: 'switch', tone: 'sage' }, { label: 'R-1 G0/0', detail: 'ONE PHYSICAL LINK', token: 'router', tone: 'orange' }, { label: 'VLAN 20 ACCESS', detail: 'PC-B / F0/2', token: 'pc', tone: 'gold' },
  ] }),
  'router-subinterface': spec({ id: 'router-subinterface', family: 'table', title: 'LOGICAL ROUTER INTERFACES', accessibilityLabel: 'Physical router interface G0/0 owns one trunk cable. Logical G0/0.10 terminates VLAN 10 at 192.168.10.1 slash 24 and G0/0.20 terminates VLAN 20 at 192.168.20.1 slash 24.', sourceIds: ['IEEE-802.1Q', 'RFC-1812', 'CISCO-INTER-VLAN'], headers: ['INTERFACE', '802.1Q VLAN', 'IPv4 GATEWAY'], rows: [
    ['G0/0.10', '10', '192.168.10.1/24'], ['G0/0.20', '20', '192.168.20.1/24'],
  ], stages: guidedStages({ select: 'SELECT G0/0.10', tag: 'ASSOCIATE VLAN 10', address: 'ASSIGN 192.168.10.1/24', enable: 'VERIFY PHYSICAL G0/0' }) }),
  'inter-vlan-forwarding': spec({ id: 'inter-vlan-forwarding', family: 'sequence', title: 'FRAME REPLACEMENT ACROSS VLANs', accessibilityLabel: 'PC-A selects its VLAN 10 gateway, the tagged frame reaches R-1, R-1 routes to connected VLAN 20, creates new Ethernet framing, and PC-B returns through its VLAN 20 gateway.', sourceIds: ['RFC-826', 'RFC-1812', 'IEEE-802.1Q'], nodes: [
    { label: 'PC-A', detail: 'DESTINATION IP 192.168.20.20', token: 'pc', tone: 'blue' }, { label: 'VLAN 10 TRUNK FRAME', detail: 'NEXT HOP 192.168.10.1', token: 'vlan-tagged-frame', tone: 'blue' }, { label: 'R-1 ROUTES', detail: 'MATCH 192.168.20.0/24', token: 'router', tone: 'orange' }, { label: 'VLAN 20 DELIVERY', detail: 'NEW ETHERNET FRAME', token: 'vlan-tagged-frame', tone: 'gold' }, { label: 'PC-B REPLIES', detail: 'RETURN VIA 192.168.20.1', token: 'pc', tone: 'gold' },
  ], stages: guidedStages({ gateway: 'CHOOSE THE VLAN 10 GATEWAY', 'tag-in': 'CARRY VLAN 10 TO R-1', route: 'SELECT THE VLAN 20 ROUTE', 'tag-out': 'BUILD VLAN 20 DELIVERY', reply: 'VERIFY THE RETURN PATH' }) }),
  'inter-vlan-config': spec({ id: 'inter-vlan-config', family: 'table', title: 'CONFIGURE THEN VERIFY', accessibilityLabel: 'A four-stage checklist verifies the switch trunk, router subinterfaces, connected routes, and successful tests in both directions.', sourceIds: ['CISCO-INTER-VLAN', 'RFC-1812'], headers: ['STAGE', 'REQUIRED EVIDENCE'], rows: [
    ['TRUNK', 'F0/24 ALLOWS 10,20'], ['SUBINTERFACES', 'TAGS + GATEWAY ADDRESSES'], ['ROUTES', 'BOTH /24 NETWORKS CONNECTED'], ['TEST', 'FORWARD + RETURN SUCCEED'],
  ], stages: guidedStages({ trunk: 'VERIFY THE SWITCH TRUNK', subinterfaces: 'CONFIGURE BOTH ROUTER SUBINTERFACES', routes: 'READ BOTH CONNECTED ROUTES', test: 'TEST BOTH DIRECTIONS' }) }),
  'inter-vlan-troubleshooting': spec({ id: 'inter-vlan-troubleshooting', family: 'sequence', title: 'CHECK THE FIRST FAILED DEPENDENCY', accessibilityLabel: 'Troubleshooting proceeds from host address and gateway through access VLAN, trunk allowance, matching router tag and address, physical parent, route, and return path.', sourceIds: ['RFC-1122', 'RFC-1812', 'CISCO-INTER-VLAN'], nodes: [
    { label: 'HOST + GATEWAY', detail: 'CORRECT LOCAL /24?', token: 'pc', tone: 'blue' }, { label: 'ACCESS + TRUNK', detail: 'VLAN ALLOWED?', token: 'switch', tone: 'sage' }, { label: 'TAG + SUBINTERFACE', detail: 'MATCHING VLAN + ADDRESS?', token: 'router', tone: 'orange' }, { label: 'ROUTE + RETURN', detail: 'BOTH DIRECTIONS?', token: 'route-table', tone: 'gold' },
  ] }),

  'model-purpose': spec({ id: 'model-purpose', family: 'sequence', title: 'MODELS ORGANIZE RESPONSIBILITY', accessibilityLabel: 'Layered models organize network responsibilities from physical signals through delivery and transport to application services.', sourceIds: ['ISO-7498-1', 'RFC-1122'], nodes: [
    { label: 'SIGNALS + MEDIA', detail: 'LOWER RESPONSIBILITIES', token: 'copper-cable', tone: 'neutral' }, { label: 'DELIVERY + TRANSPORT', detail: 'NETWORK RESPONSIBILITIES', token: 'transport-channel', tone: 'orange' }, { label: 'APPLICATION SERVICES', detail: 'USER-FACING RESPONSIBILITIES', token: 'application-window', tone: 'violet' },
  ], footer: 'A MODEL IS A REFERENCE / NOT A LITERAL MACHINE SEQUENCE' }),
  'osi-stack': spec({ id: 'osi-stack', family: 'stack', title: 'OSI REFERENCE MODEL', accessibilityLabel: 'The seven OSI layers from top to bottom are Layer 7 Application, Layer 6 Presentation, Layer 5 Session, Layer 4 Transport, Layer 3 Network, Layer 2 Data Link, and Layer 1 Physical.', sourceIds: ['ISO-7498-1', 'CISCO-OSI'], layers: OSI_LAYERS, footer: 'APPLICATION AT TOP / PHYSICAL AT BOTTOM' }),
  'tcp-ip-stack': spec({ id: 'tcp-ip-stack', family: 'stack', title: 'FOUR-LAYER TCP/IP VIEW', accessibilityLabel: 'The four TCP/IP layers from top to bottom are Application, Transport, Internet, and Network Access or Link.', sourceIds: ['RFC-1122'], layers: TCP_IP_LAYERS, footer: 'RFC 1122 NAMES APPLICATION / TRANSPORT / INTERNET / LINK' }),
  'concept-layer-map': spec({ id: 'concept-layer-map', family: 'mapping', title: 'FOLLOW ONE APPLICATION EXCHANGE', accessibilityLabel: 'One application exchange is classified by responsibility. OSI Application, Presentation, and Session map to TCP/IP Application; Transport maps to Transport; Network maps to Internet; Data Link and Physical map to Network Access or Link.', sourceIds: ['ISO-7498-1', 'RFC-1122', 'CISCO-OSI'], layers: OSI_LAYERS, rightLayers: TCP_IP_LAYERS, mappings: [['APPLICATION + PRESENTATION + SESSION', 'APPLICATION'], ['TRANSPORT', 'TRANSPORT'], ['NETWORK', 'INTERNET'], ['DATA LINK + PHYSICAL', 'NETWORK ACCESS / LINK']], stages: guidedStages({ application: 'APPLICATION DEFINES THE MESSAGE MEANING', transport: 'TRANSPORT SERVES THE APPLICATION PROCESS', network: 'IPv4 IDENTIFIES ENDPOINTS AND ROUTES', link: 'ETHERNET HANDLES ONE LOCAL LINK', physical: 'THE MEDIUM CARRIES SIGNALS' }), footer: 'EACH LAYER HAS A RESPONSIBILITY; IT DOES NOT REPLACE THE LAYERS NEXT TO IT' }),
  'osi-physical': spec({ id: 'osi-physical', family: 'comparison', title: 'OSI L1 / PHYSICAL', accessibilityLabel: 'Physical layer examples include copper, fiber, connectors, signals, and link state; it carries bits but does not interpret MAC or IP destinations.', sourceIds: ['ISO-7498-1', 'CISCO-OSI'], nodes: [
    { label: 'RESPONSIBILITY', detail: 'SIGNALS / MEDIA / CONNECTION', token: 'copper-cable', tone: 'neutral' }, { label: 'NOT THIS LAYER', detail: 'MAC LOOKUP / IP ROUTE', token: 'route-table', tone: 'red' },
  ] }),
  'osi-data-link': spec({ id: 'osi-data-link', family: 'comparison', title: 'OSI L2 / DATA LINK', accessibilityLabel: 'Data Link includes Ethernet frames, MAC delivery, switching, and VLANs; it handles local delivery rather than end-to-end IP routing.', sourceIds: ['ISO-7498-1', 'IEEE-802.3', 'IEEE-802.1Q'], nodes: [
    { label: 'RESPONSIBILITY', detail: 'FRAMES / MAC / SWITCH / VLAN', token: 'ethernet-frame', tone: 'red' }, { label: 'BOUNDARY', detail: 'LOCAL LAYER 2 DOMAIN', token: 'switch', tone: 'neutral' },
  ] }),
  'osi-network': spec({ id: 'osi-network', family: 'comparison', title: 'OSI L3 / NETWORK', accessibilityLabel: 'Network includes IPv4 logical addressing, subnet identities, ICMP, and routing across networks; it does not prove applications are available.', sourceIds: ['ISO-7498-1', 'RFC-791', 'RFC-792', 'RFC-1812'], nodes: [
    { label: 'RESPONSIBILITY', detail: 'IPv4 / ICMP / ROUTING', token: 'ipv4-datagram', tone: 'orange' }, { label: 'PATH', detail: 'ACROSS NETWORK BOUNDARIES', token: 'router', tone: 'sage' },
  ] }),
  'osi-transport': spec({ id: 'osi-transport', family: 'comparison', title: 'OSI L4 / TRANSPORT', accessibilityLabel: 'Transport provides end-to-end application communication services such as TCP and UDP and uses transport ports, not physical switch ports.', sourceIds: ['ISO-7498-1', 'RFC-1122'], nodes: [
    { label: 'TCP', detail: 'RELIABLE ORDERED BYTE STREAM', token: 'transport-channel', tone: 'sage' }, { label: 'UDP', detail: 'DATAGRAM SERVICE', token: 'transport-channel', tone: 'gold' },
  ] }),
  'osi-session': spec({ id: 'osi-session', family: 'sequence', title: 'OSI L5 / SESSION', accessibilityLabel: 'Session groups establishing, coordinating, synchronizing, and ending application conversations above transport.', sourceIds: ['ISO-7498-1', 'CISCO-OSI'], nodes: [
    { label: 'ESTABLISH', detail: 'START CONVERSATION', token: 'session-handshake', tone: 'blue' }, { label: 'COORDINATE', detail: 'DIALOGUE / CHECKPOINT', token: 'session-handshake', tone: 'sage' }, { label: 'END', detail: 'CLOSE CONVERSATION', token: 'session-handshake', tone: 'orange' },
  ] }),
  'osi-presentation': spec({ id: 'osi-presentation', family: 'sequence', title: 'OSI L6 / PRESENTATION', accessibilityLabel: 'Presentation groups representation, encoding, serialization, compression, and transformation so applications interpret information consistently.', sourceIds: ['ISO-7498-1', 'CISCO-OSI'], nodes: [
    { label: 'APPLICATION MEANING', detail: 'STRUCTURED INFORMATION', token: 'application-window', tone: 'violet' }, { label: 'REPRESENTATION', detail: 'ENCODE / TRANSFORM', token: 'presentation-encoding', tone: 'blue' }, { label: 'AGREED FORM', detail: 'TRANSFERABLE DATA', token: 'presentation-encoding', tone: 'sage' },
  ] }),
  'osi-application': spec({ id: 'osi-application', family: 'comparison', title: 'OSI L7 / APPLICATION', accessibilityLabel: 'Application provides network protocol services used by application processes; it is not the human user or the entire visible interface.', sourceIds: ['ISO-7498-1', 'CISCO-OSI'], nodes: [
    { label: 'CLIENT PROTOCOL', detail: 'APPLICATION REQUEST', token: 'application-window', tone: 'violet' }, { label: 'SERVER SERVICE', detail: 'APPLICATION RESPONSE', token: 'server-terminal', tone: 'sage' },
  ] }),
  'transport-endpoints': spec({ id: 'transport-endpoints', family: 'sequence', title: 'APPLICATION ENDPOINT EXCHANGE', accessibilityLabel: 'A client process uses a source port and TCP or UDP to reach a listening server process at a destination address and port.', sourceIds: ['RFC-9293', 'RFC-768', 'IANA-PORTS'], nodes: [
    { label: 'CLIENT PROCESS', detail: 'SOURCE PORT 53000', token: 'application-window', tone: 'blue' }, { label: 'TCP OR UDP', detail: 'TRANSPORT STATE', token: 'transport-channel', tone: 'orange' }, { label: 'SERVER PROCESS', detail: 'DESTINATION PORT 443', token: 'server-terminal', tone: 'sage' },
  ], footer: 'PORTS IDENTIFY PROCESSES / IP ADDRESSES IDENTIFY HOST INTERFACES' }),
  'dhcp-exchange': spec({ id: 'dhcp-exchange', family: 'sequence', title: 'DHCP ADDRESS ALLOCATION', accessibilityLabel: 'A DHCP client discovers a server, receives an offer, requests one address, and installs it only after acknowledgment.', sourceIds: ['RFC-2131', 'RFC-2132'], nodes: [
    { label: 'DISCOVER', detail: 'CLIENT UDP 68 TO SERVER UDP 67', token: 'pc', tone: 'blue' }, { label: 'OFFER', detail: 'PROPOSE ADDRESS + OPTIONS', token: 'server-terminal', tone: 'orange' }, { label: 'REQUEST', detail: 'SELECT SERVER + ADDRESS', token: 'pc', tone: 'gold' }, { label: 'ACK', detail: 'COMMIT LEASE', token: 'server-terminal', tone: 'sage' },
  ] }),
  'dns-resolution': spec({ id: 'dns-resolution', family: 'sequence', title: 'DNS RESOLUTION PATH', accessibilityLabel: 'A host stub resolver asks a recursive resolver, which follows referrals to an authoritative server and caches the returned record for its TTL.', sourceIds: ['RFC-1034', 'RFC-1035'], nodes: [
    { label: 'STUB RESOLVER', detail: 'NAME + RECORD TYPE', token: 'pc', tone: 'blue' }, { label: 'RECURSIVE RESOLVER', detail: 'CACHE OR FOLLOW REFERRALS', token: 'server-terminal', tone: 'orange' }, { label: 'AUTHORITATIVE SERVER', detail: 'ZONE RECORD', token: 'server-terminal', tone: 'sage' },
  ] }),
  'acl-evaluation': spec({ id: 'acl-evaluation', family: 'table', title: 'ORDERED ACL EVALUATION', accessibilityLabel: 'IPv4 ACL rules are evaluated from top to bottom. The first matching permit or deny action wins, followed by implicit deny when no entry matches.', sourceIds: ['CISCO-IP-ACL'], headers: ['ORDER', 'MATCH', 'ACTION'], rows: [['10', 'TCP TO 192.168.20.20 PORT 443', 'PERMIT'], ['20', 'IP TO 192.168.30.0/24', 'DENY'], ['END', 'NO EXPLICIT MATCH', 'IMPLICIT DENY']] }),
  'nat-translation': spec({ id: 'nat-translation', family: 'table', title: 'PAT TRANSLATION STATE', accessibilityLabel: 'PAT maps distinct inside address and port tuples to one global address with distinct translated ports so return traffic can be reversed.', sourceIds: ['RFC-1918', 'RFC-3022'], headers: ['INSIDE LOCAL', 'INSIDE GLOBAL', 'DESTINATION'], rows: [['192.168.10.10:53000', '203.0.113.5:40001', '198.51.100.20:443'], ['192.168.10.20:53000', '203.0.113.5:40002', '198.51.100.20:443']] }),
  'ipv6-addressing': spec({ id: 'ipv6-addressing', family: 'comparison', title: 'IPv6 ADDRESS FORMS', accessibilityLabel: 'The same 128-bit IPv6 address is shown in full and compressed form with a slash 64 network prefix.', sourceIds: ['RFC-8200', 'RFC-4291', 'RFC-5952'], nodes: [
    { label: 'FULL FORM', detail: '2001:0DB8:0010:0000:0000:0000:0000:0010 /64', token: 'ipv4-datagram', tone: 'blue' }, { label: 'COMPRESSED', detail: '2001:DB8:10::10 /64', token: 'ipv4-datagram', tone: 'sage' },
  ] }),
  'ipv6-neighbor-delivery': spec({ id: 'ipv6-neighbor-delivery', family: 'sequence', title: 'IPv6 NEIGHBOR AND ROUTER DELIVERY', accessibilityLabel: 'A host uses ICMPv6 Neighbor Discovery for a local target or its selected router, then routing and a return path deliver the exchange.', sourceIds: ['RFC-4861', 'RFC-4862'], nodes: [
    { label: 'SELECT NEXT HOP', detail: 'ON-LINK OR ROUTER', token: 'pc', tone: 'blue' }, { label: 'NS / NA', detail: 'ICMPv6 NEIGHBOR DISCOVERY', token: 'transport-channel', tone: 'orange' }, { label: 'ROUTE + RETURN', detail: 'BOTH DIRECTIONS', token: 'router', tone: 'sage' },
  ] }),
  'spanning-tree': spec({ id: 'spanning-tree', family: 'topology', title: 'LOOP-FREE SPANNING TREE', accessibilityLabel: 'Three redundantly connected switches elect one root and assign root, designated, and alternate ports so only a loop-free subset forwards.', sourceIds: ['IEEE-802.1Q', 'CISCO-STP'], nodes: [
    { label: 'ROOT BRIDGE', detail: 'LOWEST BRIDGE ID', token: 'switch', tone: 'sage' }, { label: 'ROOT PATH', detail: 'FORWARDING', token: 'switch', tone: 'blue' }, { label: 'ALTERNATE PATH', detail: 'DISCARDING / AVAILABLE', token: 'switch', tone: 'orange' },
  ] }),
  etherchannel: spec({ id: 'etherchannel', family: 'comparison', title: 'LACP LOGICAL BUNDLE', accessibilityLabel: 'Compatible physical switch links negotiate through LACP and become members of one logical port-channel.', sourceIds: ['IEEE-802.1AX', 'CISCO-ETHERCHANNEL'], nodes: [
    { label: 'PHYSICAL MEMBERS', detail: 'F0/1 + F0/2 / MATCHING SETTINGS', token: 'switch', tone: 'blue' }, { label: 'PORT-CHANNEL 1', detail: 'ONE LOGICAL LINK', token: 'switch', tone: 'sage' },
  ] }),
  'dynamic-route-selection': spec({ id: 'dynamic-route-selection', family: 'table', title: 'ROUTE SOURCE SELECTION', accessibilityLabel: 'For matching prefixes, route selection compares prefix length, source preference, and then the metric within the selected routing source.', sourceIds: ['RFC-1812', 'CISCO-ROUTING'], headers: ['CANDIDATE', 'SOURCE', 'PREFERENCE / METRIC'], rows: [['192.168.30.0/24', 'STATIC', 'AD 1'], ['192.168.30.0/24', 'OSPF', 'AD 110 / COST 20'], ['0.0.0.0/0', 'STATIC DEFAULT', 'FALLBACK']] }),
  'ospf-topology': spec({ id: 'ospf-topology', family: 'sequence', title: 'SINGLE-AREA OSPF STATE', accessibilityLabel: 'Three area zero routers form compatible neighbors, synchronize link-state information, calculate shortest paths, and offer routes to the routing table.', sourceIds: ['RFC-2328', 'CISCO-OSPF'], nodes: [
    { label: 'R1 / 1.1.1.1', detail: 'HELLO + LSDB', token: 'router', tone: 'blue' }, { label: 'R2 / 2.2.2.2', detail: 'AREA 0 TRANSIT', token: 'router', tone: 'orange' }, { label: 'R3 / 3.3.3.3', detail: 'ADVERTISE 192.168.30.0/24', token: 'router', tone: 'sage' },
  ] }),
};

export const educationalIllustrationIds = Object.keys(educationalIllustrations) as LessonIllustration[];

export function isEducationalIllustration(id: LessonIllustration) {
  return educationalIllustrations[id].family !== 'legacy';
}
