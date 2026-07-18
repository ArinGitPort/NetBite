import type { LessonIllustration } from '@/content/types';

export type EducationAssetName =
  | 'server-terminal' | 'ethernet-frame' | 'ipv4-datagram' | 'arp-request' | 'arp-reply'
  | 'arp-cache' | 'icmp-echo-request' | 'icmp-echo-reply' | 'route-table'
  | 'vlan-tagged-frame' | 'transport-channel' | 'session-handshake'
  | 'presentation-encoding' | 'application-window';

export type DiagramTone = 'neutral' | 'red' | 'orange' | 'sage' | 'blue' | 'violet' | 'gold';
export type VisualToken = 'pc' | 'switch' | 'router' | 'copper-cable' | EducationAssetName;
export type IllustrationFamily = 'legacy' | 'topology' | 'sequence' | 'comparison' | 'address-range' | 'table' | 'stack' | 'mapping' | 'bit-strip' | 'subnet-map';
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
  footer?: string;
}

const legacy = (id: LessonIllustration, title: string, accessibilityLabel: string, sourceIds: string[]): EducationalIllustrationSpec => ({
  id, family: 'legacy', title, accessibilityLabel, sourceIds,
});

const spec = (definition: EducationalIllustrationSpec) => definition;

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
  frame: legacy('frame', 'ETHERNET FRAME STRUCTURE', 'An Ethernet frame with destination, source, data, and check regions in transmission order.', ['IEEE-802.3']),
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
  ], footer: 'ONE LOGICAL ADDRESS / FOUR OCTETS' }),
  'ipv4-octets': spec({ id: 'ipv4-octets', family: 'table', title: 'DOTTED DECIMAL', accessibilityLabel: 'Each IPv4 octet contains eight bits and has a decimal range from zero through 255.', sourceIds: ['RFC-791'], headers: ['OCTET', 'BITS', 'DECIMAL RANGE'], rows: [['1', '8', '0–255'], ['2', '8', '0–255'], ['3', '8', '0–255'], ['4', '8', '0–255']], footer: '192 . 168 . 10 . 25' }),
  'ipv4-prefix': spec({ id: 'ipv4-prefix', family: 'address-range', title: '192.168.10.25 /24', accessibilityLabel: 'In 192.168.10.25 slash 24, the first 24 bits identify the network and the final eight bits identify the host.', sourceIds: ['RFC-4632'], segments: [
    { label: 'NETWORK', value: '192.168.10', detail: '24 BITS', tone: 'sage', weight: 3 }, { label: 'HOST', value: '25', detail: '8 BITS', tone: 'orange' },
  ], footer: 'NETWORK 192.168.10.0 / HOST INTERFACE 192.168.10.25' }),
  'private-ipv4': spec({ id: 'private-ipv4', family: 'comparison', title: 'PRIVATE HOST SETTINGS', accessibilityLabel: 'A valid private IPv4 host is unique and usable; network, broadcast, duplicate, and off-network addresses are rejected.', sourceIds: ['RFC-1918', 'RFC-4632'], nodes: [
    { label: 'VALID HOST', detail: '192.168.10.25/24 / UNIQUE / USABLE', token: 'ipv4-datagram', tone: 'sage' },
    { label: 'REJECT', detail: 'NETWORK / BROADCAST / DUPLICATE / WRONG SUBNET', token: 'ipv4-datagram', tone: 'red' },
  ] }),
  'octet-bits': spec({ id: 'octet-bits', family: 'table', title: 'EIGHT BINARY PLACE VALUES', accessibilityLabel: 'An octet has bit place values 128, 64, 32, 16, 8, 4, 2, and 1; binary 11000000 equals decimal 192.', sourceIds: ['RFC-791'], headers: ['BIT', '128', '64', '32', '16', '8', '4', '2', '1'], rows: [['11000000', '1', '1', '0', '0', '0', '0', '0', '0']], footer: '128 + 64 = 192' }),
  'network-host': spec({ id: 'network-host', family: 'address-range', title: 'PREFIX DEFINES THE BOUNDARY', accessibilityLabel: 'In 192.168.10.25 slash 24, the first three octets are the shared network portion and final octet 25 is the host portion.', sourceIds: ['RFC-4632'], segments: [
    { label: 'NETWORK PORTION', value: '192.168.10', detail: 'SHARED / 24 BITS', tone: 'sage', weight: 3 }, { label: 'HOST PORTION', value: '25', detail: 'UNIQUE / 8 BITS', tone: 'orange' },
  ] }),
  'private-ranges': spec({ id: 'private-ranges', family: 'table', title: 'RFC 1918 PRIVATE BLOCKS', accessibilityLabel: 'The three private IPv4 blocks are 10.0.0.0 slash 8, 172.16.0.0 slash 12, and 192.168.0.0 slash 16.', sourceIds: ['RFC-1918'], headers: ['BLOCK', 'FULL RANGE'], rows: [['10.0.0.0/8', '10.0.0.0 – 10.255.255.255'], ['172.16.0.0/12', '172.16.0.0 – 172.31.255.255'], ['192.168.0.0/16', '192.168.0.0 – 192.168.255.255']] }),
  'subnet-purpose': spec({ id: 'subnet-purpose', family: 'comparison', title: 'DIVIDE ONE /24', accessibilityLabel: 'The 192.168.10.0 slash 24 block is divided into two smaller slash 25 subnets.', sourceIds: ['RFC-950', 'RFC-4632'], nodes: [
    { label: 'SUBNET A', detail: '192.168.10.0–192.168.10.127', token: 'router', tone: 'blue' },
    { label: 'SUBNET B', detail: '192.168.10.128–192.168.10.255', token: 'router', tone: 'sage' },
  ], footer: 'SEPARATE NETWORK AND BROADCAST BOUNDARIES' }),
  'subnet-mask': spec({ id: 'subnet-mask', family: 'table', title: 'PREFIX / MASK / BLOCK', accessibilityLabel: 'A table compares slash 24 through slash 27 masks, block sizes, and usable host counts.', sourceIds: ['RFC-950', 'RFC-4632'], headers: ['PREFIX', 'MASK', 'BLOCK', 'USABLE'], rows: [['/24', '255.255.255.0', '256', '254'], ['/25', '255.255.255.128', '128', '126'], ['/26', '255.255.255.192', '64', '62'], ['/27', '255.255.255.224', '32', '30']], footer: 'LONGER PREFIX / SMALLER SUBNET' }),
  'subnet-boundaries': spec({ id: 'subnet-boundaries', family: 'address-range', presentation: 'full-address', title: 'LOCATE 192.168.10.70 /26', accessibilityLabel: 'Host 192.168.10.70 lies between full slash 26 network starts 192.168.10.64 and 192.168.10.128.', sourceIds: ['RFC-950'], segments: [
    { label: 'CURRENT START', value: '192.168.10.64', tone: 'sage' }, { label: 'HOST', value: '192.168.10.70', tone: 'gold' }, { label: 'NEXT START', value: '192.168.10.128', tone: 'orange' },
  ], footer: '70 IS AT LEAST 64 AND BELOW 128' }),
  'subnet-range': spec({ id: 'subnet-range', family: 'address-range', presentation: 'full-address', title: '192.168.10.64 /26', accessibilityLabel: 'The slash 26 subnet begins at network address 192.168.10.64, has usable hosts 192.168.10.65 through 192.168.10.126, and ends at broadcast 192.168.10.127.', sourceIds: ['RFC-950'], segments: [
    { label: 'NETWORK', value: '192.168.10.64', tone: 'blue' }, { label: 'USABLE HOSTS', value: '192.168.10.65–192.168.10.126', valueLines: [{ label: 'FIRST', value: '192.168.10.65' }, { label: 'LAST', value: '192.168.10.126' }], tone: 'sage', weight: 4 }, { label: 'BROADCAST', value: '192.168.10.127', tone: 'orange' },
  ], footer: 'FIRST AND LAST ADDRESSES ARE RESERVED' }),
  'host-bits': spec({ id: 'host-bits', family: 'table', title: 'HOST BITS CONTROL SIZE', accessibilityLabel: 'Slash 24 through slash 27 leave eight through five host bits and produce 256 through 32 total addresses.', sourceIds: ['RFC-950', 'RFC-4632'], headers: ['PREFIX', 'HOST BITS', 'TOTAL', 'USABLE'], rows: [['/24', '8', '256', '254'], ['/25', '7', '128', '126'], ['/26', '6', '64', '62'], ['/27', '5', '32', '30']] }),
  'block-size': spec({ id: 'block-size', family: 'address-range', title: 'BOUNDARIES ADVANCE BY BLOCK SIZE', accessibilityLabel: 'For slash 27, network boundaries advance by block size 32 at zero, 32, 64, 96, 128, 160, 192, and 224.', sourceIds: ['RFC-950'], segments: [
    { label: '/24', value: '256', tone: 'blue' }, { label: '/25', value: '128', tone: 'sage' }, { label: '/26', value: '64', tone: 'gold' }, { label: '/27', value: '32', tone: 'orange' },
  ], footer: 'BLOCK SIZE = DISTANCE BETWEEN NETWORK STARTS' }),
  'subnet-method': spec({ id: 'subnet-method', family: 'sequence', title: 'REPEATABLE SUBNET WORKFLOW', accessibilityLabel: 'Subnet workflow proceeds from prefix to host bits, block size, boundaries, and finally network, usable, and broadcast range.', sourceIds: ['RFC-950'], nodes: [
    { label: 'PREFIX', detail: '/24–/27', token: 'ipv4-datagram', tone: 'blue' }, { label: 'HOST BITS', detail: '32 − PREFIX', token: 'route-table', tone: 'sage' }, { label: 'BLOCK + BOUNDARIES', detail: 'LOCATE ADDRESS', token: 'route-table', tone: 'gold' }, { label: 'FULL RANGE', detail: 'NETWORK / HOSTS / BROADCAST', token: 'ipv4-datagram', tone: 'orange' },
  ] }),
  'subnet-borrowed-bits': spec({ id: 'subnet-borrowed-bits', family: 'bit-strip', title: '/27 BORROWS THREE POSITIONS', accessibilityLabel: 'The final mask octet for slash 27 uses network bits in the 128, 64, and 32 positions, producing binary 11100000 and decimal 224.', sourceIds: ['RFC-950', 'RFC-1878'], bits: [
    { place: '128', bit: '1', role: 'network' }, { place: '64', bit: '1', role: 'network' }, { place: '32', bit: '1', role: 'network' }, { place: '16', bit: '0', role: 'host' },
    { place: '8', bit: '0', role: 'host' }, { place: '4', bit: '0', role: 'host' }, { place: '2', bit: '0', role: 'host' }, { place: '1', bit: '0', role: 'host' },
  ], footer: '128 + 64 + 32 = 224 / MASK 255.255.255.224' }),
  'subnet-map': spec({ id: 'subnet-map', family: 'subnet-map', title: 'COMPLETE /26 MAP', accessibilityLabel: 'Four slash 26 subnets display full network, usable host, and broadcast addresses inside 192.168.10.0 slash 24.', sourceIds: ['RFC-950', 'RFC-1878'], subnets: [
    { network: '192.168.10.0', firstUsable: '192.168.10.1', lastUsable: '192.168.10.62', broadcast: '192.168.10.63' },
    { network: '192.168.10.64', firstUsable: '192.168.10.65', lastUsable: '192.168.10.126', broadcast: '192.168.10.127' },
    { network: '192.168.10.128', firstUsable: '192.168.10.129', lastUsable: '192.168.10.190', broadcast: '192.168.10.191' },
    { network: '192.168.10.192', firstUsable: '192.168.10.193', lastUsable: '192.168.10.254', broadcast: '192.168.10.255' },
  ], footer: 'EVERY ROW CONTAINS 64 TOTAL ADDRESSES' }),

  'router-interfaces': spec({ id: 'router-interfaces', family: 'topology', title: 'ROUTER JOINS TWO LANS', accessibilityLabel: 'A router connects LAN A and LAN B using one separately addressed interface in each subnet.', sourceIds: ['RFC-1812'], nodes: [
    { label: 'LAN A', detail: '192.168.10.0/24', token: 'pc', tone: 'blue' }, { label: 'ROUTER', detail: '192.168.10.1 / 192.168.20.1', token: 'router', tone: 'orange' }, { label: 'LAN B', detail: '192.168.20.0/24', token: 'pc', tone: 'sage' },
  ], footer: 'ONE ADDRESSED ROUTER INTERFACE PER ATTACHED NETWORK' }),
  'local-remote': spec({ id: 'local-remote', family: 'comparison', title: 'COMPARE NETWORK IDENTITIES', accessibilityLabel: 'A host delivers directly to a destination in its own subnet and uses its gateway for a remote subnet.', sourceIds: ['RFC-1122'], nodes: [
    { label: 'LOCAL', detail: 'SAME PREFIX / DELIVER DIRECTLY', token: 'pc', tone: 'sage' }, { label: 'REMOTE', detail: 'DIFFERENT PREFIX / USE GATEWAY', token: 'router', tone: 'orange' },
  ] }),
  'default-gateway': spec({ id: 'default-gateway', family: 'sequence', title: 'REMOTE NEXT HOP', accessibilityLabel: 'PC A sends a remote destination toward gateway 192.168.10.1, which is reachable on PC A’s local subnet.', sourceIds: ['RFC-1122'], nodes: [
    { label: 'PC A', detail: '192.168.10.10/24', token: 'pc', tone: 'blue' }, { label: 'DEFAULT GATEWAY', detail: '192.168.10.1 / LOCAL', token: 'router', tone: 'orange' }, { label: 'REMOTE LAN', detail: '192.168.20.0/24', token: 'pc', tone: 'sage' },
  ], footer: 'AN OFF-SUBNET GATEWAY IS NOT DIRECTLY REACHABLE' }),
  'routed-frame': spec({ id: 'routed-frame', family: 'sequence', title: 'ROUTER FORWARDS THE IP DATAGRAM', accessibilityLabel: 'A host sends an Ethernet frame to a router; the router forwards the same IP endpoints inside a new link-layer frame on the next LAN.', sourceIds: ['RFC-1122', 'RFC-1812'], nodes: [
    { label: 'FRAME / LAN A', detail: 'LOCAL MAC DELIVERY', token: 'ethernet-frame', tone: 'blue' }, { label: 'IP DATAGRAM', detail: 'SOURCE AND DESTINATION IP REMAIN', token: 'ipv4-datagram', tone: 'orange' }, { label: 'FRAME / LAN B', detail: 'NEW LOCAL MAC DELIVERY', token: 'ethernet-frame', tone: 'sage' },
  ] }),
  'same-subnet': spec({ id: 'same-subnet', family: 'comparison', title: 'COMPARE PREFIX-DEFINED NETWORKS', accessibilityLabel: 'A host compares its own and destination network identities: matching prefixes mean local, different prefixes mean remote.', sourceIds: ['RFC-1122'], nodes: [
    { label: 'SAME /24', detail: '192.168.10.25 + 192.168.10.80 / LOCAL', token: 'pc', tone: 'sage' }, { label: 'DIFFERENT /24', detail: '192.168.10.25 + 192.168.20.80 / REMOTE', token: 'router', tone: 'orange' },
  ] }),
  'gateway-requirements': spec({ id: 'gateway-requirements', family: 'comparison', title: 'GATEWAY MUST BE LOCAL', accessibilityLabel: 'For host 192.168.10.25 slash 24, gateway 192.168.10.1 is locally reachable while 192.168.20.1 is off-subnet.', sourceIds: ['RFC-1122'], nodes: [
    { label: 'VALID GATEWAY', detail: '192.168.10.1 / SAME /24', token: 'router', tone: 'sage' }, { label: 'INVALID GATEWAY', detail: '192.168.20.1 / DIFFERENT /24', token: 'router', tone: 'red' },
  ] }),

  'arp-mapping': spec({ id: 'arp-mapping', family: 'sequence', title: 'RESOLVE LOCAL NEXT HOP', accessibilityLabel: 'ARP maps the local next-hop IPv4 address 192.168.10.20 to MAC address 02:00:00:00:00:0B.', sourceIds: ['RFC-826'], nodes: [
    { label: 'NEXT-HOP IPv4', detail: '192.168.10.20', token: 'ipv4-datagram', tone: 'blue' }, { label: 'ARP', detail: 'LOCAL RESOLUTION', token: 'arp-request', tone: 'orange' }, { label: 'DESTINATION MAC', detail: '02:00:00:00:00:0B', token: 'arp-reply', tone: 'sage' },
  ] }),
  'arp-request': spec({ id: 'arp-request', family: 'topology', title: 'ARP REQUEST / BROADCAST', accessibilityLabel: 'PC A broadcasts an ARP request to all other interfaces on the local LAN asking who owns 192.168.10.20.', sourceIds: ['RFC-826'], nodes: [
    { label: 'PC A / REQUESTER', detail: 'WHO OWNS 192.168.10.20?', token: 'pc', tone: 'orange' }, { label: 'SWITCH / FLOOD', detail: 'EVERY OTHER ACTIVE PORT', token: 'switch', tone: 'red' }, { label: 'LOCAL HOSTS', detail: 'ONLY THE OWNER SHOULD REPLY', token: 'arp-request', tone: 'sage' },
  ] }),
  'arp-reply': spec({ id: 'arp-reply', family: 'sequence', title: 'ARP REPLY / CACHE UPDATE', accessibilityLabel: 'The owner normally unicasts an ARP reply to PC A, which stores the IPv4-to-MAC mapping in its ARP cache.', sourceIds: ['RFC-826'], nodes: [
    { label: 'OWNER REPLIES', detail: '192.168.10.20 IS AT 02:00:…:0B', token: 'arp-reply', tone: 'sage' }, { label: 'UNICAST TO PC A', detail: 'DIRECT LOCAL RESPONSE', token: 'pc', tone: 'blue' }, { label: 'CACHE ENTRY', detail: 'IPv4 ↔ MAC', token: 'arp-cache', tone: 'gold' },
  ] }),
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
  'echo-exchange': spec({ id: 'echo-exchange', family: 'sequence', title: 'ICMP ECHO EXCHANGE', accessibilityLabel: 'The source sends an ICMP Echo Request to the destination, which returns an Echo Reply to the source.', sourceIds: ['RFC-792'], nodes: [
    { label: 'ECHO REQUEST', detail: 'SOURCE → DESTINATION', token: 'icmp-echo-request', tone: 'orange' }, { label: 'DESTINATION', detail: 'RECEIVES REQUEST', token: 'server-terminal', tone: 'blue' }, { label: 'ECHO REPLY', detail: 'DESTINATION → SOURCE', token: 'icmp-echo-reply', tone: 'sage' },
  ], footer: 'REQUEST OUT / REPLY BACK' }),
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
  ] }),
  'route-purpose': spec({ id: 'route-purpose', family: 'sequence', title: 'DESTINATION LOOKUP', accessibilityLabel: 'A router compares the destination IPv4 address with route-table prefixes, selects the longest usable match, and forwards through its path.', sourceIds: ['RFC-1812'], nodes: [
    { label: 'DESTINATION IPv4', detail: 'ADDRESS TO MATCH', token: 'ipv4-datagram', tone: 'blue' }, { label: 'ROUTE TABLE', detail: 'PREFIX LOOKUP', token: 'route-table', tone: 'gold' }, { label: 'FORWARDING PATH', detail: 'NEXT HOP / EXIT', token: 'router', tone: 'sage' },
  ] }),
  'route-next-hop': spec({ id: 'route-next-hop', family: 'topology', title: 'STATIC NEXT HOP', accessibilityLabel: 'Router R1 uses a static route for remote LAN C through reachable neighboring router 10.0.12.2.', sourceIds: ['RFC-1812', 'CISCO-STATIC'], nodes: [
    { label: 'R1', detail: 'STATIC 192.168.30.0/24', token: 'router', tone: 'blue' }, { label: 'NEXT HOP', detail: '10.0.12.2 / REACHABLE', token: 'router', tone: 'orange' }, { label: 'LAN C', detail: 'REMOTE PREFIX', token: 'pc', tone: 'sage' },
  ] }),
  'default-route': spec({ id: 'default-route', family: 'comparison', title: 'SPECIFIC ROUTE BEFORE DEFAULT', accessibilityLabel: 'A specific slash 24 route wins when it matches; default 0.0.0.0 slash 0 is used only when no more-specific usable route matches.', sourceIds: ['RFC-1812', 'RFC-4632'], nodes: [
    { label: 'SPECIFIC /24', detail: 'SELECT WHEN MATCHED', token: 'route-table', tone: 'sage' }, { label: 'DEFAULT /0', detail: 'FALLBACK ONLY', token: 'route-table', tone: 'neutral' },
  ] }),
  'route-match-test': spec({ id: 'route-match-test', family: 'table', title: 'MATCH BEFORE SELECTING', accessibilityLabel: 'For destination 192.168.10.25, routes 192.168.10.0 slash 24 and 192.168.0.0 slash 16 match, while 10.0.0.0 slash 8 does not.', sourceIds: ['RFC-1812', 'RFC-4632'], headers: ['ROUTE', 'DESTINATION IN RANGE?'], rows: [['192.168.10.0/24', 'YES'], ['192.168.0.0/16', 'YES'], ['10.0.0.0/8', 'NO']] }),

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
  'dot1q-tag': spec({ id: 'dot1q-tag', family: 'sequence', title: 'VLAN IDENTITY ON A SHARED LINK', accessibilityLabel: 'An 802.1Q-tagged frame identifies its VLAN on a shared link so the receiving switch preserves VLAN separation.', sourceIds: ['IEEE-802.1Q'], nodes: [
    { label: 'SWITCH A', detail: 'VLAN 10 OR 20', token: 'switch', tone: 'blue' }, { label: '802.1Q FRAME', detail: 'VLAN IDENTIFIER', token: 'vlan-tagged-frame', tone: 'orange' }, { label: 'SWITCH B', detail: 'RESTORE VLAN CONTEXT', token: 'switch', tone: 'sage' },
  ] }),

  'model-purpose': spec({ id: 'model-purpose', family: 'sequence', title: 'MODELS ORGANIZE RESPONSIBILITY', accessibilityLabel: 'Layered models organize network responsibilities from physical signals through delivery and transport to application services.', sourceIds: ['ISO-7498-1', 'RFC-1122'], nodes: [
    { label: 'SIGNALS + MEDIA', detail: 'LOWER RESPONSIBILITIES', token: 'copper-cable', tone: 'neutral' }, { label: 'DELIVERY + TRANSPORT', detail: 'NETWORK RESPONSIBILITIES', token: 'transport-channel', tone: 'orange' }, { label: 'APPLICATION SERVICES', detail: 'USER-FACING RESPONSIBILITIES', token: 'application-window', tone: 'violet' },
  ], footer: 'A MODEL IS A REFERENCE / NOT A LITERAL MACHINE SEQUENCE' }),
  'osi-stack': spec({ id: 'osi-stack', family: 'stack', title: 'OSI REFERENCE MODEL', accessibilityLabel: 'The seven OSI layers from top to bottom are Layer 7 Application, Layer 6 Presentation, Layer 5 Session, Layer 4 Transport, Layer 3 Network, Layer 2 Data Link, and Layer 1 Physical.', sourceIds: ['ISO-7498-1', 'CISCO-OSI'], layers: OSI_LAYERS, footer: 'APPLICATION AT TOP / PHYSICAL AT BOTTOM' }),
  'tcp-ip-stack': spec({ id: 'tcp-ip-stack', family: 'stack', title: 'FOUR-LAYER TCP/IP VIEW', accessibilityLabel: 'The four TCP/IP layers from top to bottom are Application, Transport, Internet, and Network Access or Link.', sourceIds: ['RFC-1122'], layers: TCP_IP_LAYERS, footer: 'RFC 1122 NAMES APPLICATION / TRANSPORT / INTERNET / LINK' }),
  'concept-layer-map': spec({ id: 'concept-layer-map', family: 'mapping', title: 'MAP CONCEPTS BETWEEN MODELS', accessibilityLabel: 'OSI Application, Presentation, and Session map to TCP/IP Application; OSI Transport maps to Transport; OSI Network maps to Internet; OSI Data Link and Physical map to Network Access or Link.', sourceIds: ['ISO-7498-1', 'RFC-1122', 'CISCO-OSI'], layers: OSI_LAYERS, rightLayers: TCP_IP_LAYERS, mappings: [['APPLICATION + PRESENTATION + SESSION', 'APPLICATION'], ['TRANSPORT', 'TRANSPORT'], ['NETWORK', 'INTERNET'], ['DATA LINK + PHYSICAL', 'NETWORK ACCESS / LINK']], footer: 'CABLE / L1 • ETHERNET + MAC / L2 • IPv4 + ICMP / L3 • TCP + UDP / L4' }),
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
};

export const educationalIllustrationIds = Object.keys(educationalIllustrations) as LessonIllustration[];

export function isEducationalIllustration(id: LessonIllustration) {
  return educationalIllustrations[id].family !== 'legacy';
}
