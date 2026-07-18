export interface PracticeChoice { id: string; label: string }
export interface PracticeStage {
  id: string; context: string; prompt: string; choices: PracticeChoice[]; correctChoiceId: string; explanation: string; result: string;
}
export interface PracticeConfig {
  id: string; chapterId: string; eyebrow: string; title: string; objective: string; scopeNote: string; stages: PracticeStage[]; completion: string;
}

const choices = (...labels: string[]): PracticeChoice[] => labels.map((label, index) => ({ id: String(index), label }));
const stage = (id: string, context: string, prompt: string, labels: string[], correct: number, explanation: string, result: string): PracticeStage => ({
  id, context, prompt, choices: choices(...labels), correctChoiceId: String(correct), explanation, result,
});

export const practiceConfigs: Record<string, PracticeConfig> = {
  'ipv4-configurator': {
    id: 'ipv4-configurator', chapterId: '4', eyebrow: 'GUIDED PRACTICE / HOST CONFIG', title: 'CONFIGURE A /24 PC',
    objective: 'Approve only unique, usable settings on 192.168.10.0/24.', scopeNote: 'FIXED /24 CONFIGURATION / VALIDATION MODEL',
    stages: [
      stage('valid', 'PC A / 192.168.10.25 /24 / GATEWAY 192.168.10.1', 'Is this configuration valid?', ['VALID', 'INVALID OCTET', 'WRONG NETWORK'], 0, 'The address and gateway are usable members of the same /24.', 'PC A CONFIGURED'),
      stage('octet', 'PC B / 192.168.10.300 /24', 'Why must this be rejected?', ['DUPLICATE', 'OCTET ABOVE 255', 'NETWORK ADDRESS'], 1, 'Every IPv4 octet must be from 0 through 255.', 'INVALID OCTET REJECTED'),
      stage('duplicate', 'PC B / 192.168.10.25 /24 / PC A ALREADY USES .25', 'Why must this be rejected?', ['DUPLICATE ADDRESS', 'PUBLIC ADDRESS', 'PREFIX TOO LONG'], 0, 'Interfaces on the same network need unique IPv4 addresses.', 'DUPLICATE REJECTED'),
      stage('network', 'PC B / 192.168.20.25 /24 / REQUIRED LAN 192.168.10.0/24', 'What is wrong?', ['WRONG NETWORK', 'INVALID DECIMAL', 'BROADCAST MAC'], 0, 'The configured address belongs to 192.168.20.0/24, not the required LAN.', 'OFF-NETWORK SETTING REJECTED'),
    ], completion: 'You validated a usable, unique IPv4 host configuration.',
  },
  'subnet-range-desk': {
    id: 'subnet-range-desk', chapterId: '5', eyebrow: 'GUIDED PRACTICE / SUBNET DESK', title: 'CALCULATE SUBNET RANGES',
    objective: 'Find the network and broadcast boundary containing each host.', scopeNote: 'PRACTICAL /24–/27 BLOCKS / NO VLSM',
    stages: [
      stage('24', 'HOST 192.168.10.42/24', 'Choose its subnet range.', ['.0 NETWORK / .255 BROADCAST', '.0 / .127', '.32 / .63'], 0, '/24 uses one 256-address block.', 'USABLE HOSTS .1–.254'),
      stage('25', 'HOST 192.168.10.130/25', 'Choose its subnet range.', ['.0 / .127', '.128 / .255', '.128 / .191'], 1, '/25 advances by 128; .130 is in the second block.', 'USABLE HOSTS .129–.254'),
      stage('26', 'HOST 192.168.10.70/26', 'Choose its subnet range.', ['.64 / .127', '.0 / .63', '.64 / .95'], 0, '/26 advances by 64; .70 falls in the .64 block.', 'USABLE HOSTS .65–.126'),
      stage('27', 'HOST 192.168.10.190/27', 'Choose its subnet range.', ['.128 / .159', '.160 / .191', '.192 / .223'], 1, '/27 advances by 32; .190 falls in .160 through .191.', 'USABLE HOSTS .161–.190'),
    ], completion: 'You found all four network, broadcast, and usable ranges.',
  },
  'gateway-forwarding-desk': {
    id: 'gateway-forwarding-desk', chapterId: '6', eyebrow: 'GUIDED PRACTICE / FORWARDING', title: 'CHOOSE THE NEXT HOP',
    objective: 'Decide whether each destination is direct, reached through a gateway, or invalid.', scopeNote: 'TWO FIXED /24 LANS / DECISION MODEL',
    stages: [
      stage('local', 'A 192.168.10.10 → B 192.168.10.20 /24', 'How should A deliver?', ['DIRECT TO B', 'VIA 192.168.10.1', 'INVALID'], 0, 'Both hosts share 192.168.10.0/24.', 'LOCAL DELIVERY'),
      stage('remote', 'A 192.168.10.10 → C 192.168.20.10 /24', 'How should A deliver?', ['DIRECT TO C', 'VIA 192.168.10.1', 'INVALID'], 1, 'C is remote, so A uses its local router interface.', 'GATEWAY DELIVERY'),
      stage('return', 'C 192.168.20.10 → A 192.168.10.10 /24', 'How should C deliver?', ['VIA 192.168.20.1', 'VIA 192.168.10.1', 'DIRECT TO A'], 0, 'C reaches its own local gateway at 192.168.20.1.', 'RETURN THROUGH ROUTER'),
      stage('bad-gateway', 'A /24 / GATEWAY 192.168.20.1', 'Is this gateway usable by A?', ['YES', 'NO / OFF-SUBNET', 'ONLY FOR LOCAL HOSTS'], 1, 'A cannot directly reach a gateway outside 192.168.10.0/24.', 'INVALID GATEWAY DETECTED'),
    ], completion: 'You chose correct local and routed next hops.',
  },
  'arp-resolution-desk': {
    id: 'arp-resolution-desk', chapterId: '7', eyebrow: 'GUIDED PRACTICE / ARP DESK', title: 'RESOLVE THE NEXT HOP',
    objective: 'Choose the local IPv4 target to resolve and reuse learned cache entries.', scopeNote: 'DETERMINISTIC CACHE STEPS / NO AGING TIMER',
    stages: [
      stage('local', 'A SENDS TO LOCAL B / CACHE EMPTY', 'What should A do?', ['BROADCAST ARP FOR B', 'ARP FOR GATEWAY', 'SEND WITHOUT A MAC'], 0, 'For a local destination, B itself is the next hop.', 'REQUEST: WHO HAS B?'),
      stage('reply', 'B OWNS THE REQUESTED IPv4 ADDRESS', 'What follows?', ['B REPLIES / A CACHES MAPPING', 'EVERY HOST REPLIES', 'ROUTER CHANGES B ADDRESS'], 0, 'The owner replies and A records the IPv4-to-MAC mapping.', 'B MAPPING CACHED'),
      stage('remote', 'A SENDS TO REMOTE C / GATEWAY .1 / CACHE EMPTY', 'Which address should A resolve?', ['REMOTE C', 'LOCAL GATEWAY .1', 'A ITSELF'], 1, 'ARP resolves the local next hop, which is the gateway for a remote destination.', 'REQUEST: WHO HAS GATEWAY .1?'),
      stage('cache', 'A SENDS REMOTELY AGAIN / GATEWAY MAPPING CACHED', 'What should A do?', ['USE CACHED GATEWAY MAC', 'BROADCAST ARP AGAIN NOW', 'ARP FOR REMOTE C'], 0, 'A current cache entry supplies the gateway MAC immediately.', 'CACHE HIT'),
    ], completion: 'You resolved local hosts and remote gateway next hops.',
  },
  'ping-diagnostic-desk': {
    id: 'ping-diagnostic-desk', chapterId: '8', eyebrow: 'GUIDED PRACTICE / DIAGNOSTICS', title: 'DIAGNOSE THE PING PATH',
    objective: 'Identify the first known failed checkpoint without inventing a single universal cause.', scopeNote: 'KNOWN CONDITIONS / NO TIMING OR LIVE PACKETS',
    stages: [
      stage('link', 'LINK INDICATOR OFF', 'What should be checked first?', ['LOCAL LINK', 'REMOTE ROUTE', 'APPLICATION'], 0, 'IP tests depend on a working local link.', 'FIRST FAILURE / LINK'),
      stage('address', 'LINK UP / HOST SET TO 192.168.10.300', 'What should be corrected?', ['HOST IPv4 ADDRESS', 'REMOTE SWITCH NAME', 'ECHO REPLY SIZE'], 0, 'The host address contains an invalid octet.', 'FIRST FAILURE / ADDRESS'),
      stage('gateway', 'LOCAL PING WORKS / REMOTE FAILS / GATEWAY OFF-SUBNET', 'What should be corrected?', ['DEFAULT GATEWAY', 'LOCAL CABLE CATEGORY', 'DESTINATION MAC CACHE ONLY'], 0, 'Remote traffic needs a gateway reachable on the local subnet.', 'FIRST FAILURE / GATEWAY'),
      stage('success', 'LINK, ADDRESS, GATEWAY, PATH GOOD / ECHO REPLY RECEIVED', 'What is proven?', ['THIS ROUND TRIP SUCCEEDED', 'EVERY APPLICATION WORKS', 'THE NETWORK CAN NEVER FAIL'], 0, 'A reply demonstrates round-trip IP reachability for this test.', 'END-TO-END CHECK PASSED'),
    ], completion: 'You diagnosed ping evidence in dependency order.',
  },
  'static-route-board': {
    id: 'static-route-board', chapterId: '9', eyebrow: 'GUIDED PRACTICE / ROUTE BOARD', title: 'COMPLETE THE ROUTED PATH',
    objective: 'Choose four missing routes so LAN A and LAN C have forward and return paths.', scopeNote: 'FIXED THREE-ROUTER TOPOLOGY / STATIC ROUTES',
    stages: [
      stage('r1', 'R1 NEEDS LAN C 192.168.30.0/24 / R2 NEXT HOP 10.0.12.2', 'Add which route?', ['192.168.30.0/24 VIA 10.0.12.2', '192.168.10.0/24 VIA ITSELF', '0.0.0.0/24 VIA LAN A'], 0, 'R1 sends the remote LAN C prefix toward R2.', 'R1 FORWARD ROUTE ADDED'),
      stage('r2-forward', 'R2 NEEDS LAN C / R3 NEXT HOP 10.0.23.2', 'Add which route?', ['192.168.30.0/24 VIA 10.0.23.2', '10.0.12.0/24 VIA R3', '192.168.20.0/24 VIA LAN C'], 0, 'R2 forwards LAN C traffic to R3.', 'R2 FORWARD ROUTE ADDED'),
      stage('r3-return', 'R3 NEEDS LAN A 192.168.10.0/24 / R2 NEXT HOP 10.0.23.1', 'Add which return route?', ['192.168.10.0/24 VIA 10.0.23.1', '192.168.30.0/24 VIA R2', '0.0.0.0/32 VIA LAN C'], 0, 'R3 needs a return path toward R2 for LAN A.', 'R3 RETURN ROUTE ADDED'),
      stage('r2-return', 'R2 NEEDS LAN A / R1 NEXT HOP 10.0.12.1', 'Complete the return path.', ['192.168.10.0/24 VIA 10.0.12.1', '192.168.30.0/24 VIA R1', '10.0.23.0/24 VIA LAN A'], 0, 'R2 forwards returning LAN A traffic toward R1.', 'BIDIRECTIONAL PATH COMPLETE'),
    ], completion: 'You completed forward and return static routes across three routers.',
  },
  'vlan-port-desk': {
    id: 'vlan-port-desk', chapterId: '10', eyebrow: 'GUIDED PRACTICE / VLAN DESK', title: 'CONFIGURE VLAN PATHS',
    objective: 'Assign access VLANs, carry them on a trunk, and predict which endpoints can communicate.', scopeNote: 'VLAN 10 + 20 / NO STP OR INTER-VLAN CONFIG',
    stages: [
      stage('access', 'PC A / SWITCH A PORT 1 / USERS VLAN 10', 'Configure the endpoint port.', ['ACCESS VLAN 10', 'TRUNK ONLY VLAN 20', 'ACCESS VLAN 20'], 0, 'An endpoint access port joins its one assigned VLAN.', 'PORT 1 / ACCESS VLAN 10'),
      stage('second', 'PC B / SWITCH B PORT 2 / USERS VLAN 10', 'Configure the endpoint port.', ['ACCESS VLAN 20', 'ACCESS VLAN 10', 'ROUTED PORT'], 1, 'PC B must share VLAN 10 with PC A.', 'PORT 2 / ACCESS VLAN 10'),
      stage('trunk', 'SWITCH A ↔ SWITCH B / VLAN 10 + VLAN 20 REQUIRED', 'Configure the inter-switch link.', ['TRUNK ALLOW 10,20', 'ACCESS VLAN 10', 'TRUNK ALLOW 20 ONLY'], 0, 'The trunk must carry both required VLANs.', '802.1Q PATH READY'),
      stage('reach', 'PC A VLAN 10 → PC C VLAN 20 / NO ROUTER', 'Can they communicate?', ['YES / SAME SWITCHES', 'NO / ROUTING REQUIRED', 'YES / TRUNK MERGES VLANS'], 1, 'A trunk carries VLANs but does not merge their broadcast domains.', 'INTER-VLAN PATH BLOCKED WITHOUT ROUTING'),
    ], completion: 'You built a two-switch VLAN path and preserved separation.',
  },
  'layer-sorting-desk': {
    id: 'layer-sorting-desk', chapterId: '11', eyebrow: 'GUIDED PRACTICE / MODEL DESK', title: 'SORT THE NETWORK STACK',
    objective: 'Classify familiar concepts by responsibility in OSI and TCP/IP.', scopeNote: 'CONCEPT MAP / NOT A PROCESSING SIMULATOR',
    stages: [
      stage('physical', 'CONCEPTS / COPPER CABLE + SIGNAL', 'Choose the OSI layer.', ['PHYSICAL', 'DATA LINK', 'NETWORK'], 0, 'Media and signals belong to OSI Physical.', 'OSI L1 / TCP-IP NETWORK ACCESS'),
      stage('link', 'CONCEPTS / ETHERNET FRAME + MAC ADDRESS', 'Choose the OSI layer.', ['NETWORK', 'DATA LINK', 'TRANSPORT'], 1, 'Local frame delivery belongs to OSI Data Link.', 'OSI L2 / TCP-IP NETWORK ACCESS'),
      stage('network', 'CONCEPTS / IPv4 + ICMP + ROUTING', 'Choose the mapping.', ['OSI NETWORK / TCP-IP INTERNET', 'OSI TRANSPORT / TCP-IP APPLICATION', 'OSI PHYSICAL / TCP-IP TRANSPORT'], 0, 'Logical addressing and routing map to Network and Internet.', 'OSI L3 / TCP-IP INTERNET'),
      stage('upper', 'CONCEPTS / TCP + UDP + USER-FACING PROTOCOL', 'Choose the mapping.', ['ALL DATA LINK', 'TRANSPORT THEN APPLICATION', 'ALL PHYSICAL'], 1, 'TCP and UDP are Transport; user-facing protocols are Application.', 'UPPER LAYERS SORTED'),
    ], completion: 'You mapped NetBite concepts across both layered models.',
  },
};
