import {
  allocateDhcpLease,
  buildOspfTopology,
  calculateOspfRoutes,
  calculateSpanningTree,
  evaluateIpv4Acl,
  negotiateEtherChannel,
  parseIPv6Address,
  relayDhcpMessage,
  resolveDnsQuery,
  resolveIPv6Neighbor,
  selectRouteSource,
  simulateTransportExchange,
  traceIPv6Path,
  translateNatFlow,
  validateOperationsCapstone,
  type SimulationExplanation,
} from '@/core/network/operations-simulation';
import type { ModuleReleaseState } from '@/content/types';

export type SimulationValue = string | number | boolean;
export type SimulationFieldKind = 'text' | 'number' | 'select' | 'toggle';

export interface SimulationFieldOption {
  label: string;
  value: SimulationValue;
  command?: string;
}

export interface SimulationFieldDefinition {
  id: string;
  label: string;
  kind: SimulationFieldKind;
  expected: SimulationValue;
  placeholder?: string;
  options?: SimulationFieldOption[];
  format?: 'ipv4' | 'ipv6' | 'port' | 'prefix4' | 'prefix6' | 'positive' | 'csv-vlan' | 'text';
  incorrectFeedback: string;
}

export interface GuidedSimulationStage {
  id: string;
  actionLabel: string;
  fields: SimulationFieldDefinition[];
  hints: string[];
}

export interface GuidedSimulationDefinition {
  labId: string;
  releaseState: ModuleReleaseState;
  cliEnabled: boolean;
  stages: GuidedSimulationStage[];
}

export interface SimulationEvidence {
  id: string;
  text: string;
  tone: 'neutral' | 'success' | 'warning';
}

export interface ObjectiveResult {
  accepted: boolean;
  passed: boolean;
  message: string;
  evidence: SimulationEvidence[];
  tableRows: string[];
  explanation: SimulationExplanation;
}

export interface OperationsSimulationSession {
  version: 2;
  stageIndex: number;
  completedObjectiveIds: string[];
  configuration: Record<string, SimulationValue>;
  evidence: SimulationEvidence[];
  tables: Record<string, string[]>;
  traceIndex: number;
  hints: string[];
  lastResult?: ObjectiveResult;
  updatedAt: string;
}

const select = (id: string, label: string, expected: SimulationValue, values: SimulationFieldOption[], incorrectFeedback: string): SimulationFieldDefinition => ({ id, label, kind: 'select', expected, options: values, incorrectFeedback });
const text = (id: string, label: string, expected: string, format: SimulationFieldDefinition['format'], incorrectFeedback: string, placeholder?: string): SimulationFieldDefinition => ({ id, label, kind: 'text', expected, format, incorrectFeedback, placeholder });
const number = (id: string, label: string, expected: number, format: SimulationFieldDefinition['format'], incorrectFeedback: string): SimulationFieldDefinition => ({ id, label, kind: 'number', expected, format, incorrectFeedback });
const toggle = (id: string, expected: boolean, incorrectFeedback: string, command?: string): SimulationFieldDefinition => ({ id, label: id.split('.').at(-1)?.replace(/([A-Z])/g, ' $1').toUpperCase() ?? id, kind: 'toggle', expected, incorrectFeedback, options: command ? [{ label: expected ? 'ENABLE' : 'DISABLE', value: expected, command }] : undefined });
const option = (label: string, value: SimulationValue, command?: string): SimulationFieldOption => ({ label, value, command });
const stage = (id: string, actionLabel: string, fields: SimulationFieldDefinition[], hints: string[]): GuidedSimulationStage => ({ id, actionLabel, fields, hints });

const definitions: GuidedSimulationDefinition[] = [
  { labId: 'transport-service-desk', releaseState: 'released', cliEnabled: false, stages: [
    stage('endpoint', 'Save endpoint configuration', [select('transport.protocol', 'Transport protocol', 'tcp', [option('TCP', 'tcp'), option('UDP', 'udp')], 'HTTPS in this exercise listens with TCP.'), number('transport.sourcePort', 'Client source port', 49152, 'port', 'Use a valid ephemeral client port.'), number('transport.destinationPort', 'Server destination port', 443, 'port', 'The destination port must identify the HTTPS service.'), number('transport.listeningPort', 'Server listening port', 443, 'port', 'The server must listen on the same destination port.')], ['A socket endpoint combines an IP address, transport protocol, and port.', 'HTTPS is modeled on TCP destination port 443; the client may use ephemeral port 49152.']),
    stage('handshake', 'Initiate TCP handshake', [select('transport.event', 'Next transport event', 'handshake', [option('Send SYN / SYN-ACK / ACK', 'handshake'), option('Send application data immediately', 'data-first')], 'TCP must establish connection state before this modeled application data.')], ['The client begins by synchronizing sequence state.', 'The bounded exchange is SYN, SYN-ACK, then ACK.']),
    stage('recovery', 'Recover missing data', [toggle('transport.drop', true, 'Inject the missing segment before testing TCP recovery.'), select('transport.recovery', 'Recovery action', 'retransmit', [option('Retransmit unacknowledged data', 'retransmit'), option('Open another server port', 'new-port')], 'A missing TCP segment is recovered from acknowledgment state, not by changing the service port.')], ['Inspect which data remains unacknowledged.', 'Retransmit the unacknowledged segment and then observe its ACK.']),
    stage('udp', 'Send UDP datagram', [select('transport.protocol', 'Transport protocol', 'udp', [option('UDP', 'udp'), option('TCP', 'tcp')], 'The final comparison must use UDP.'), number('transport.destinationPort', 'DNS-style destination port', 53, 'port', 'This comparison uses destination port 53.'), number('transport.listeningPort', 'Server listening port', 53, 'port', 'The UDP service must listen on the selected destination port.'), select('transport.udpConclusion', 'No-reply conclusion', 'no-confirmation', [option('No transport delivery confirmation', 'no-confirmation'), option('The server is definitely offline', 'offline')], 'No UDP reply does not prove one universal failure cause.')], ['UDP has no TCP handshake or acknowledgment state.', 'Conclude only that this datagram has no transport-layer delivery confirmation.']),
  ]},
  { labId: 'dhcp-lease-desk', releaseState: 'released', cliEnabled: false, stages: [
    stage('pool', 'Save DHCP pool', [text('dhcp.network', 'Pool network', '192.168.10.0', 'ipv4', 'The pool must describe the client subnet.'), number('dhcp.prefix', 'Prefix', 24, 'prefix4', 'Use the /24 client subnet.'), text('dhcp.start', 'First pool address', '192.168.10.100', 'ipv4', 'Start the bounded pool at 192.168.10.100.'), text('dhcp.end', 'Last pool address', '192.168.10.102', 'ipv4', 'End the bounded pool at 192.168.10.102.'), text('dhcp.excluded', 'Excluded address', '192.168.10.100', 'ipv4', 'Exclude the gateway-reserved first pool address.')], ['Pool boundaries must be usable addresses inside the configured network.', 'With 192.168.10.100 excluded, the first offer is 192.168.10.101.']),
    stage('dora', 'Request client lease', [text('dhcp.client', 'Client identifier', 'PC-A', 'text', 'Use the fixed client PC-A so its binding can be inspected.')], ['The client starts without an IPv4 lease.', 'Run Discover, Offer, Request, and ACK for PC-A.']),
    stage('exhaust', 'Request until exhausted', [number('dhcp.requestCount', 'Additional client requests', 2, 'positive', 'Two more requests demonstrate one final binding followed by exhaustion.')], ['Only two usable pool addresses remain after the exclusion.', 'PC-A uses one; another client uses the second; the following request receives no offer.']),
    stage('relay', 'Verify DHCP relay', [text('dhcp.relay', 'Relay interface address', '192.168.20.1', 'ipv4', 'The relay must identify the remote client subnet gateway.'), toggle('dhcp.serverReachable', true, 'A relay cannot reach an unavailable DHCP server.')], ['A router does not forward the original client broadcast unchanged.', 'Configure 192.168.20.1 as relay context and verify a routed server path.']),
  ]},
  { labId: 'dns-resolution-desk', releaseState: 'released', cliEnabled: false, stages: [
    stage('stub', 'Save resolver settings', [text('dns.resolver', 'Configured resolver', '192.168.10.53', 'ipv4', 'The client must send its stub query to the configured resolver.'), toggle('dns.reachable', true, 'The resolver path must be reachable before DNS records can be checked.')], ['The application asks its local stub resolver.', 'The stub sends the query to 192.168.10.53 rather than walking the hierarchy itself.']),
    stage('hierarchy', 'Resolve authoritative answer', [text('dns.name', 'Record name', 'server.netbite.test', 'text', 'The query name must match the authoritative record.'), text('dns.value', 'A record value', '192.168.10.20', 'ipv4', 'The A record must contain the server IPv4 address.'), number('dns.ttl', 'TTL steps', 60, 'positive', 'Use a positive TTL so the answer can enter cache.')], ['A cache miss moves from recursive resolver toward authority.', 'Create server.netbite.test A 192.168.10.20 with TTL 60, then query it.']),
    stage('cache', 'Query cached record', [select('dns.queryMode', 'Query mode', 'reuse', [option('Repeat same A query', 'reuse'), option('Ask for unrelated name', 'other')], 'Only the same name and type can reuse this cache entry.')], ['Cache keys include the name and record type.', 'Repeat the same A query before the TTL reaches zero.']),
    stage('expiry', 'Advance logical time', [number('dns.advance', 'Logical steps', 60, 'positive', 'Advance through the record TTL to expire it.')], ['TTL limits reuse; it is not a permanent record lifetime.', 'Advance 60 learner-controlled steps, then resolve again from authority.']),
  ]},
  { labId: 'acl-policy-desk', releaseState: 'released', cliEnabled: true, stages: [
    stage('tuple', 'Save test flow', [select('acl.protocol', 'Protocol', 'tcp', [option('TCP', 'tcp', 'test-flow tcp'), option('UDP', 'udp', 'test-flow udp')], 'The required service uses TCP.'), text('acl.source', 'Source IPv4', '192.168.10.10', 'ipv4', 'Use the authorized source host.'), text('acl.destination', 'Destination IPv4', '192.168.20.20', 'ipv4', 'Use the protected server address.'), number('acl.port', 'Destination port', 443, 'port', 'The required HTTPS service uses port 443.')], ['An extended rule can inspect protocol, source, destination, and service port.', 'Build TCP 192.168.10.10 to 192.168.20.20 destination port 443.']),
    stage('wildcard', 'Save source wildcard', [text('acl.network', 'Source network', '192.168.10.0', 'ipv4', 'Use the complete /24 network address.'), text('acl.wildcard', 'Source wildcard', '0.0.0.255', 'ipv4', 'The final octet may vary for this /24 match.')], ['Wildcard zero bits must match; one bits may vary.', '192.168.10.0 with 0.0.0.255 selects the full /24.']),
    stage('match', 'Install and test ACL', [select('acl.action', 'Rule action', 'permit', [option('Permit', 'permit', 'permit tcp 192.168.10.0 0.0.0.255 host 192.168.20.20 eq 443'), option('Deny', 'deny', 'deny tcp 192.168.10.0 0.0.0.255 host 192.168.20.20 eq 443')], 'The required HTTPS flow must be explicitly permitted.'), number('acl.sequence', 'Rule sequence', 10, 'positive', 'Place the specific permit before the implicit deny.')], ['ACL evaluation stops at the first matching entry.', 'Install the specific HTTPS permit as sequence 10, then test the flow.']),
    stage('direction', 'Apply and verify ACL', [text('acl.interface', 'Interface', 'G0/0', 'text', 'Apply the policy where the source traffic enters.'), select('acl.direction', 'Direction', 'in', [option('Inbound', 'in', 'ip access-group NETBITE-IN in'), option('Outbound', 'out', 'ip access-group NETBITE-IN out')], 'Direction is relative to the selected router interface.')], ['The modeled source traffic enters G0/0.', 'Apply NETBITE-IN inbound on G0/0, then test permitted and denied flows.']),
  ]},
  { labId: 'nat-translation-desk', releaseState: 'released', cliEnabled: true, stages: [
    stage('roles', 'Save NAT interface roles', [toggle('nat.insideUp', true, 'The inside interface must be active.', 'ip nat inside'), toggle('nat.outsideUp', true, 'The outside interface must be active.', 'ip nat outside')], ['Translation needs a defined inside-to-outside boundary.', 'Mark and enable both boundary interfaces.']),
    stage('selection', 'Save inside selection', [text('nat.network', 'Inside network', '192.168.10.0', 'ipv4', 'Select the intended inside /24.'), number('nat.prefix', 'Prefix', 24, 'prefix4', 'The exercise uses 192.168.10.0/24.')], ['PAT applies only to traffic selected by its rule.', 'Select the full 192.168.10.0/24 inside network.']),
    stage('pat', 'Generate translated flows', [text('nat.global', 'Global IPv4 address', '203.0.113.10', 'ipv4', 'Use the documented public example address.'), number('nat.flowCount', 'Simultaneous flows', 2, 'positive', 'Generate two flows to see distinct translated source ports.')], ['PAT shares one global IPv4 address by allocating distinct transport ports.', 'Generate two eligible inside flows through 203.0.113.10.']),
    stage('return', 'Verify reverse translation', [select('nat.returnCheck', 'Return tuple check', 'table', [option('Use translation table', 'table', 'show ip nat translations'), option('Send directly to private address', 'private')], 'The outside reply targets the global tuple and must be reversed through current translation state.')], ['The outside host does not address the private endpoint directly.', 'Match the reply against the created global address and port entry.']),
  ]},
  { labId: 'ipv6-address-desk', releaseState: 'released', cliEnabled: false, stages: [
    stage('parse', 'Parse IPv6 address', [text('ipv6.address', 'IPv6 address', '2001:db8:10::10', 'ipv6', 'Enter one valid address with at most one double colon.')], ['IPv6 contains eight 16-bit hexadecimal groups.', 'Expand 2001:db8:10::10 by inserting zero groups until there are eight.']),
    stage('compress', 'Verify canonical form', [text('ipv6.compressed', 'Compressed form', '2001:db8:10::10', 'ipv6', 'Compress the longest zero run once and remove leading group zeroes.')], ['Compression changes notation, not the 128-bit value.', 'Use one :: for the longest run of consecutive zero groups.']),
    stage('scope', 'Classify address scope', [select('ipv6.scope', 'FE80::1 scope', 'link-local', [option('Link-local', 'link-local'), option('Global unicast', 'global'), option('Multicast', 'multicast')], 'FE80::/10 is link-local unicast scope.')], ['Scope determines where an address is meaningful.', 'FE80::1 is valid only on its attached link.']),
    stage('prefix', 'Save interface addresses', [text('ipv6.hostA', 'PC-A address', '2001:db8:10::10', 'ipv6', 'PC-A must use the shared prefix.'), text('ipv6.hostB', 'PC-B address', '2001:db8:10::20', 'ipv6', 'PC-B must use the shared prefix.'), number('ipv6.prefix', 'Prefix', 64, 'prefix6', 'Use the standard /64 exercise boundary.')], ['Both hosts must share the first 64 prefix bits.', 'Configure 2001:db8:10::10/64 and 2001:db8:10::20/64.']),
  ]},
  { labId: 'ipv6-neighbor-desk', releaseState: 'released', cliEnabled: true, stages: [
    stage('ns', 'Resolve local neighbor', [text('nd.target', 'Neighbor target', '2001:db8:10::20', 'ipv6', 'Solicit the local destination address.'), text('nd.ownerMac', 'Owner MAC', '02:00:00:00:00:0B', 'text', 'The owner advertisement supplies its link-layer address.')], ['IPv6 uses ICMPv6 Neighbor Discovery, not ARP.', 'Send Neighbor Solicitation for 2001:db8:10::20 and accept the owner advertisement.']),
    stage('ra', 'Learn default router', [text('nd.router', 'Router link-local address', 'fe80::1', 'ipv6', 'A local IPv6 next hop normally uses a link-local address.'), toggle('nd.ra', true, 'Router Advertisement must be available for this guided host.', 'ipv6 enable')], ['Router Advertisements supply router and prefix information.', 'Select FE80::1 as the local router learned from RA.']),
    stage('route', 'Install IPv6 static route', [text('nd.routePrefix', 'Destination prefix', '2001:db8:20::', 'ipv6', 'Install the remote branch prefix.'), number('nd.routeLength', 'Prefix length', 64, 'prefix6', 'The remote branch uses /64.'), text('nd.nextHop', 'Next hop', 'fe80::2', 'ipv6', 'Use the adjacent router link-local next hop.')], ['IPv6 route lookup still uses longest-prefix match.', 'Install 2001:db8:20::/64 via FE80::2.']),
    stage('return', 'Verify IPv6 round trip', [toggle('nd.forwardRoute', true, 'The request requires a usable forward route.'), toggle('nd.returnRoute', true, 'The reply requires its own return route.')], ['A forward route does not imply a reverse route.', 'Enable and verify both /64 directions before declaring ping success.']),
  ]},
  { labId: 'spanning-tree-desk', releaseState: 'released', cliEnabled: false, stages: [
    stage('root', 'Calculate root bridge', [number('stp.priorityA', 'SW-A priority', 32768, 'positive', 'Keep SW-A at the default exercise priority.'), number('stp.priorityB', 'SW-B priority', 24576, 'positive', 'Give SW-B the lowest bridge priority.'), number('stp.priorityC', 'SW-C priority', 32768, 'positive', 'Keep SW-C at the default exercise priority.')], ['Bridge priority is compared before the MAC-derived identifier.', 'Set SW-B to 24576 while SW-A and SW-C remain 32768.']),
    stage('ports', 'Calculate port roles', [number('stp.costAB', 'SW-A–SW-B cost', 4, 'positive', 'Use cost 4 for the direct link.'), number('stp.costBC', 'SW-B–SW-C cost', 4, 'positive', 'Use cost 4 for the direct link.'), number('stp.costAC', 'SW-A–SW-C cost', 8, 'positive', 'Use cost 8 for the redundant link.')], ['Each non-root switch selects its lowest-cost path to the root.', 'Calculate using costs 4, 4, and 8 before reading every role.']),
    stage('block', 'Verify loop-free tree', [select('stp.redundantRole', 'Inferior redundant role', 'alternate', [option('Alternate / discarding', 'alternate'), option('Designated / forwarding', 'designated')], 'One inferior redundant port must discard ordinary frames.')], ['All physical links remain present.', 'Verify that the inferior redundant path becomes alternate/discarding.']),
    stage('change', 'Fail link and recalculate', [select('stp.failedLink', 'Failed active link', 'AB', [option('SW-A—SW-B', 'AB'), option('No failure', 'none')], 'Disable an active link to test the redundant topology.')], ['STP recalculates from the current graph.', 'Fail AB and verify that a surviving redundant link can enter the forwarding tree.']),
  ]},
  { labId: 'etherchannel-desk', releaseState: 'released', cliEnabled: true, stages: [
    stage('mode', 'Save LACP modes', [select('lacp.modeA', 'SW-A mode', 'active', [option('Active', 'active', 'channel-group 1 mode active'), option('Passive', 'passive', 'channel-group 1 mode passive')], 'At least one endpoint must actively initiate.'), select('lacp.modeB', 'SW-B mode', 'passive', [option('Passive', 'passive', 'channel-group 1 mode passive'), option('Active', 'active', 'channel-group 1 mode active')], 'Active/passive is the guided pairing.')], ['Passive/passive does not initiate LACP in this model.', 'Configure SW-A active and SW-B passive.']),
    stage('members', 'Save member compatibility', [number('lacp.speedA', 'SW-A member speed', 1000, 'positive', 'Use matching 1 Gbit/s members.'), number('lacp.speedB', 'SW-B member speed', 1000, 'positive', 'Both endpoints need the same member speed.'), select('lacp.switchportMode', 'Switchport mode', 'trunk', [option('Trunk', 'trunk', 'switchport mode trunk'), option('Access', 'access', 'switchport mode access')], 'The inter-switch bundle must be a trunk.')], ['Bundle members must describe the same logical service.', 'Match speed and trunk mode on both endpoints.']),
    stage('bundle', 'Form port-channel', [text('lacp.channel', 'Logical interface', 'Port-channel1', 'text', 'Use the fixed Port-channel1 interface.'), toggle('lacp.membersUp', true, 'Both physical members must be active.')], ['A formed bundle becomes one logical switching interface.', 'Assign compatible active members to Port-channel1.']),
    stage('reach', 'Verify trunk VLANs', [text('lacp.vlans', 'Allowed VLANs', '10,20', 'csv-vlan', 'The logical trunk must carry both VLAN 10 and 20.')], ['A formed bundle does not automatically permit every VLAN.', 'Allow VLAN 10 and 20 on the logical trunk, then test both contexts.']),
  ]},
  { labId: 'route-source-desk', releaseState: 'released', cliEnabled: false, stages: [
    stage('sources', 'Load route candidates', [toggle('route.connected', true, 'Include connected routes as one source.'), toggle('route.static', true, 'Include the static candidate.'), toggle('route.ospf', true, 'Include the OSPF candidate.')], ['Route source describes how a candidate was learned.', 'Load connected, static, and OSPF candidates before comparing them.']),
    stage('prefix', 'Run prefix matching', [text('route.destination', 'Destination', '192.168.20.20', 'ipv4', 'Use the target host in the remote /24.'), number('route.prefix', 'Specific route prefix', 24, 'prefix4', 'The /24 is more specific than the default route.')], ['Destination matching occurs before route-source preference.', 'Compare 192.168.20.0/24 with 0.0.0.0/0 for 192.168.20.20.']),
    stage('ad', 'Resolve equal-prefix sources', [number('route.staticAd', 'Static administrative distance', 1, 'positive', 'The bounded static candidate uses AD 1.'), number('route.ospfAd', 'OSPF administrative distance', 110, 'positive', 'The bounded OSPF candidate uses AD 110.')], ['Administrative distance compares different sources for the same prefix.', 'For equal /24 candidates, AD 1 is preferred over AD 110.']),
    stage('withdraw', 'Withdraw preferred route', [toggle('route.staticAvailable', false, 'Withdraw the preferred static candidate to expose the fallback.')], ['The table is recalculated from currently eligible candidates.', 'Remove the static /24 and verify that the OSPF /24 becomes installed.']),
  ]},
  { labId: 'ospf-area-desk', releaseState: 'released', cliEnabled: true, stages: [
    stage('identity', 'Save router IDs', [text('ospf.r1', 'R1 router ID', '1.1.1.1', 'ipv4', 'Router IDs must be unique.', '1.1.1.1'), text('ospf.r2', 'R2 router ID', '2.2.2.2', 'ipv4', 'Router IDs must be unique.', '2.2.2.2'), text('ospf.r3', 'R3 router ID', '3.3.3.3', 'ipv4', 'Router IDs must be unique.', '3.3.3.3')], ['Router IDs identify routers in OSPF state.', 'Configure three unique identifiers: 1.1.1.1, 2.2.2.2, and 3.3.3.3.']),
    stage('neighbor', 'Form OSPF neighbors', [number('ospf.area12', 'R1–R2 area', 0, 'positive', 'Both ends must use area 0.'), number('ospf.area23', 'R2–R3 area', 0, 'positive', 'Both links belong to the same single area.'), toggle('ospf.linksUp', true, 'OSPF cannot form neighbors across disabled links.', 'no shutdown')], ['Hello compatibility is required before adjacency.', 'Place both active links in area 0.']),
    stage('spf', 'Calculate SPF routes', [number('ospf.cost12', 'R1–R2 cost', 10, 'positive', 'Use the fixed link cost 10.'), number('ospf.cost23', 'R2–R3 cost', 10, 'positive', 'Use the fixed link cost 10.'), toggle('ospf.advertise', true, 'R3 must advertise its destination prefix.', 'network 192.168.30.0 0.0.0.255 area 0')], ['SPF uses synchronized topology state and accumulated cost.', 'Advertise the R3 LAN and calculate the two-link cost from R1.']),
    stage('failure', 'Fail link and recover', [select('ospf.failedLink', 'Link state', 'r2-r3-down', [option('R2–R3 down', 'r2-r3-down', 'shutdown'), option('All links up', 'up', 'no shutdown')], 'Inject the R2–R3 failure before recalculation.'), select('ospf.response', 'Required response', 'recalculate', [option('Rebuild topology and run SPF', 'recalculate', 'show ip ospf database'), option('Keep stale route installed', 'stale')], 'Unavailable adjacency state must be removed before SPF is recalculated.')], ['A failed adjacency changes the current topology graph.', 'Remove R2–R3, rebuild LSDB state, and rerun SPF without inventing a delay.']),
  ]},
  { labId: 'network-operations-capstone', releaseState: 'released', cliEnabled: true, stages: [
    stage('office-l2', 'Verify resilient Layer 2', [text('cap.vlans', 'Trunk VLAN list', '10,20', 'csv-vlan', 'The office trunk must carry VLAN 10 and 20.'), select('cap.lacp', 'LACP endpoint modes', 'active-passive', [option('Active / passive', 'active-passive', 'channel-group 1 mode active'), option('Passive / passive', 'passive-passive')], 'At least one LACP endpoint must initiate.'), text('cap.stp', 'Expected root bridge', 'SW-B', 'text', 'The configured bridge priority makes SW-B the root.')], ['Build VLAN context before testing services.', 'Allow VLAN 10 and 20, form active/passive LACP, and verify SW-B as root.']),
    stage('office-services', 'Verify office services', [text('cap.dhcp', 'DHCP first available lease', '192.168.10.101', 'ipv4', 'The excluded gateway leaves 192.168.10.101 as the first lease.'), text('cap.dns', 'server.netbite.test A record', '192.168.20.20', 'ipv4', 'The service name must resolve to the server address.')], ['Address assignment and name resolution are independent.', 'Create lease 192.168.10.101 and map server.netbite.test to 192.168.20.20.']),
    stage('office-routing', 'Verify OSPF paths', [text('cap.ospfForward', 'Installed server route', '192.168.20.0/24', 'text', 'Install the complete server prefix.'), text('cap.ospfReturn', 'Installed client route', '192.168.10.0/24', 'text', 'Install the complete client return prefix.')], ['OSPF adjacency alone does not prove the destination prefix is installed.', 'Verify 192.168.20.0/24 forward and 192.168.10.0/24 return routes.']),
    stage('office-edge', 'Verify policy and PAT', [select('cap.acl', 'HTTPS policy result', 'permit-https-deny-other', [option('Permit HTTPS / deny unauthorized', 'permit-https-deny-other', 'show access-lists'), option('Permit all traffic', 'permit-all')], 'The policy must permit the required service without opening every flow.'), text('cap.pat', 'PAT global address', '203.0.113.10', 'ipv4', 'Eligible inside traffic must translate through the configured global address.')], ['Policy selection occurs before successful translated forwarding.', 'Permit required HTTPS, deny the unauthorized tuple, and translate through 203.0.113.10.']),
    stage('office-verify', 'Test IPv4 office', [select('cap.ipv4Forward', 'Forward service test', 'pass', [option('Pass', 'pass'), option('Fail', 'fail')], 'The required forward service path must succeed.'), select('cap.ipv4Return', 'Return service test', 'pass', [option('Pass', 'pass'), option('Fail', 'fail')], 'The reply must have a usable return path.')], ['One-way reachability is incomplete evidence.', 'Run the required service test and verify both forward and return results.']),
    stage('branch-local', 'Verify IPv6 local state', [text('cap.ipv6Address', 'Branch host address', '2001:db8:10::10', 'ipv6', 'The branch host needs a valid address in the guided /64.'), text('cap.ndp', 'Learned router', 'fe80::1', 'ipv6', 'Router Discovery and NDP must resolve the local link-local next hop.')], ['IPv6 uses ICMPv6 Neighbor Discovery rather than ARP.', 'Configure 2001:db8:10::10/64 and learn FE80::1 as the local router.']),
    stage('branch-route', 'Verify IPv6 routes', [text('cap.ipv6Forward', 'Remote branch prefix', '2001:db8:20::', 'ipv6', 'Install the remote destination /64.'), text('cap.ipv6Return', 'Return branch prefix', '2001:db8:10::', 'ipv6', 'Install the reverse /64 route.')], ['One static route does not create its reverse.', 'Install 2001:db8:20::/64 forward and 2001:db8:10::/64 return.']),
    stage('branch-fault', 'Repair IPv6 branch', [select('cap.parentUp', 'Parent interface state', 'up', [option('Administratively up', 'up', 'no shutdown'), option('Shutdown', 'down', 'shutdown')], 'Enable the physical parent interface before verification.')], ['Logical forwarding cannot use a down physical parent.', 'Enable the parent, rerun NDP, and verify both IPv6 directions.']),
  ]},
];

export const operationsSimulationDefinitions: Record<string, GuidedSimulationDefinition> = Object.fromEntries(definitions.map((definition) => [definition.labId, definition]));

export const operationsModuleReleaseStates: Record<string, ModuleReleaseState> = {
  'ops-01': 'released', 'ops-02': 'released', 'ops-03': 'released', 'ops-04': 'released', 'ops-05': 'released',
  'ops-06': 'released', 'ops-07': 'released', 'ops-08': 'released', 'ops-09': 'released', 'ops-10': 'released', 'ops-11': 'released',
};

const boundedCliCommands: Record<string, { stageId: string; command: string; updates: Record<string, SimulationValue> }[]> = {
  'acl-policy-desk': [
    { stageId: 'tuple', command: 'test-flow tcp 192.168.10.10 192.168.20.20 eq 443', updates: { 'acl.protocol': 'tcp', 'acl.source': '192.168.10.10', 'acl.destination': '192.168.20.20', 'acl.port': 443 } },
    { stageId: 'wildcard', command: 'source 192.168.10.0 0.0.0.255', updates: { 'acl.network': '192.168.10.0', 'acl.wildcard': '0.0.0.255' } },
    { stageId: 'match', command: '10 permit tcp 192.168.10.0 0.0.0.255 host 192.168.20.20 eq 443', updates: { 'acl.action': 'permit', 'acl.sequence': 10 } },
    { stageId: 'direction', command: 'interface g0/0 ip access-group netbite-in in', updates: { 'acl.interface': 'G0/0', 'acl.direction': 'in' } },
  ],
  'nat-translation-desk': [
    { stageId: 'roles', command: 'interface g0/0 ip nat inside', updates: { 'nat.insideUp': true } },
    { stageId: 'roles', command: 'interface g0/1 ip nat outside', updates: { 'nat.outsideUp': true } },
    { stageId: 'selection', command: 'ip nat select 192.168.10.0/24', updates: { 'nat.network': '192.168.10.0', 'nat.prefix': 24 } },
    { stageId: 'pat', command: 'ip nat pool netbite 203.0.113.10 overload', updates: { 'nat.global': '203.0.113.10', 'nat.flowCount': 2 } },
    { stageId: 'return', command: 'show ip nat translations', updates: { 'nat.returnCheck': 'table' } },
  ],
  'ipv6-neighbor-desk': [
    { stageId: 'ns', command: 'neighbor 2001:db8:10::20 02:00:00:00:00:0b', updates: { 'nd.target': '2001:db8:10::20', 'nd.ownerMac': '02:00:00:00:00:0B' } },
    { stageId: 'ra', command: 'ipv6 default-router fe80::1', updates: { 'nd.router': 'fe80::1', 'nd.ra': true } },
    { stageId: 'route', command: 'ipv6 route 2001:db8:20::/64 fe80::2', updates: { 'nd.routePrefix': '2001:db8:20::', 'nd.routeLength': 64, 'nd.nextHop': 'fe80::2' } },
    { stageId: 'return', command: 'verify ipv6 bidirectional', updates: { 'nd.forwardRoute': true, 'nd.returnRoute': true } },
  ],
  'etherchannel-desk': [
    { stageId: 'mode', command: 'sw-a channel-group 1 mode active', updates: { 'lacp.modeA': 'active' } },
    { stageId: 'mode', command: 'sw-b channel-group 1 mode passive', updates: { 'lacp.modeB': 'passive' } },
    { stageId: 'members', command: 'members speed 1000 switchport mode trunk', updates: { 'lacp.speedA': 1000, 'lacp.speedB': 1000, 'lacp.switchportMode': 'trunk' } },
    { stageId: 'bundle', command: 'interface port-channel1 no shutdown', updates: { 'lacp.channel': 'Port-channel1', 'lacp.membersUp': true } },
    { stageId: 'reach', command: 'switchport trunk allowed vlan 10,20', updates: { 'lacp.vlans': '10,20' } },
  ],
  'ospf-area-desk': [
    { stageId: 'identity', command: 'r1 router-id 1.1.1.1', updates: { 'ospf.r1': '1.1.1.1' } },
    { stageId: 'identity', command: 'r2 router-id 2.2.2.2', updates: { 'ospf.r2': '2.2.2.2' } },
    { stageId: 'identity', command: 'r3 router-id 3.3.3.3', updates: { 'ospf.r3': '3.3.3.3' } },
    { stageId: 'neighbor', command: 'links area 0 no shutdown', updates: { 'ospf.area12': 0, 'ospf.area23': 0, 'ospf.linksUp': true } },
    { stageId: 'spf', command: 'links cost 10 advertise 192.168.30.0/24', updates: { 'ospf.cost12': 10, 'ospf.cost23': 10, 'ospf.advertise': true } },
    { stageId: 'failure', command: 'link r2-r3 shutdown recalculate spf', updates: { 'ospf.failedLink': 'r2-r3-down', 'ospf.response': 'recalculate' } },
  ],
  'network-operations-capstone': [
    { stageId: 'office-l2', command: 'office l2 vlan 10,20 lacp active-passive root sw-b', updates: { 'cap.vlans': '10,20', 'cap.lacp': 'active-passive', 'cap.stp': 'SW-B' } },
    { stageId: 'office-services', command: 'office services lease 192.168.10.101 dns 192.168.20.20', updates: { 'cap.dhcp': '192.168.10.101', 'cap.dns': '192.168.20.20' } },
    { stageId: 'office-routing', command: 'office routes 192.168.20.0/24 return 192.168.10.0/24', updates: { 'cap.ospfForward': '192.168.20.0/24', 'cap.ospfReturn': '192.168.10.0/24' } },
    { stageId: 'office-edge', command: 'office edge permit-https-deny-other pat 203.0.113.10', updates: { 'cap.acl': 'permit-https-deny-other', 'cap.pat': '203.0.113.10' } },
    { stageId: 'office-verify', command: 'verify office bidirectional', updates: { 'cap.ipv4Forward': 'pass', 'cap.ipv4Return': 'pass' } },
    { stageId: 'branch-local', command: 'branch host 2001:db8:10::10 router fe80::1', updates: { 'cap.ipv6Address': '2001:db8:10::10', 'cap.ndp': 'fe80::1' } },
    { stageId: 'branch-route', command: 'branch routes 2001:db8:20::/64 return 2001:db8:10::/64', updates: { 'cap.ipv6Forward': '2001:db8:20::', 'cap.ipv6Return': '2001:db8:10::' } },
    { stageId: 'branch-fault', command: 'branch parent no shutdown', updates: { 'cap.parentUp': 'up' } },
  ],
};

export function emptyOperationsSimulationSession(): OperationsSimulationSession {
  return { version: 2, stageIndex: 0, completedObjectiveIds: [], configuration: {}, evidence: [], tables: {}, traceIndex: 0, hints: [], updatedAt: new Date().toISOString() };
}

export function validateSimulationField(field: SimulationFieldDefinition, value: SimulationValue): string | undefined {
  if (field.kind === 'toggle') return typeof value === 'boolean' ? undefined : `${field.label} must be enabled or disabled.`;
  const raw = String(value).trim();
  if (!raw) return `${field.label} is required.`;
  if (field.kind === 'select' && !field.options?.some((entry) => entry.value === value)) return `Choose one available ${field.label.toLowerCase()} option.`;
  if (field.format === 'port') { const parsed = Number(raw); if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) return `${field.label} must be a port from 1 to 65535.`; }
  if (field.format === 'prefix4') { const parsed = Number(raw); if (!Number.isInteger(parsed) || parsed < 0 || parsed > 32) return `${field.label} must be an IPv4 prefix from 0 to 32.`; }
  if (field.format === 'prefix6') { const parsed = Number(raw); if (!Number.isInteger(parsed) || parsed < 0 || parsed > 128) return `${field.label} must be an IPv6 prefix from 0 to 128.`; }
  if (field.format === 'positive' && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) return `${field.label} must be a non-negative number.`;
  if (field.format === 'ipv4' && !/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(raw)) return `${field.label} must use dotted-decimal IPv4 notation.`;
  if (field.format === 'ipv4' && raw.split('.').some((part) => Number(part) > 255)) return `${field.label} contains an octet outside 0–255.`;
  if (field.format === 'ipv6' && !parseIPv6Address(raw)) return `${field.label} is not a valid IPv6 address.`;
  if (field.format === 'csv-vlan' && (!/^\d+(,\d+)*$/.test(raw) || raw.split(',').some((item) => Number(item) < 1 || Number(item) > 4094))) return `${field.label} must be comma-separated VLAN IDs from 1 to 4094.`;
  return undefined;
}

export function applySimulationConfiguration(session: OperationsSimulationSession, stageDefinition: GuidedSimulationStage, draft: Record<string, SimulationValue>) {
  for (const field of stageDefinition.fields) {
    const error = validateSimulationField(field, draft[field.id]);
    if (error) return { accepted: false, session, error };
  }
  return { accepted: true, session: { ...session, configuration: { ...session.configuration, ...draft }, lastResult: undefined, evidence: [], traceIndex: 0 }, error: undefined };
}

function engineEvidence(labId: string, configuration: Record<string, SimulationValue>): string[] {
  if (labId === 'transport-service-desk') {
    const result = simulateTransportExchange({ protocol: String(configuration['transport.protocol'] ?? 'tcp') as 'tcp' | 'udp', source: { address: '192.168.10.10', port: Number(configuration['transport.sourcePort'] ?? 49152) }, destination: { address: '192.168.10.20', port: Number(configuration['transport.destinationPort'] ?? 443) }, listeningPorts: [Number(configuration['transport.listeningPort'] ?? 443)], dropDataUnit: Boolean(configuration['transport.drop']) });
    return result.events;
  }
  if (labId === 'dhcp-lease-desk') {
    const state = { pool: { network: String(configuration['dhcp.network'] ?? '192.168.10.0'), prefix: Number(configuration['dhcp.prefix'] ?? 24), start: String(configuration['dhcp.start'] ?? '192.168.10.100'), end: String(configuration['dhcp.end'] ?? '192.168.10.102'), excluded: [String(configuration['dhcp.excluded'] ?? '')] }, leases: [] };
    const first = allocateDhcpLease(state, String(configuration['dhcp.client'] ?? 'PC-A'));
    const relay = relayDhcpMessage({ clientNetwork: '192.168.20.0/24', relayAddress: String(configuration['dhcp.relay'] ?? ''), serverReachable: Boolean(configuration['dhcp.serverReachable']) });
    return [...first.events, `RELAY ${relay.forwarded ? 'FORWARDED' : 'STOPPED'} / ${relay.reason}`];
  }
  if (labId === 'dns-resolution-desk') {
    const state = { records: [{ name: String(configuration['dns.name'] ?? 'server.netbite.test'), type: 'A' as const, value: String(configuration['dns.value'] ?? '192.168.10.20'), ttl: Number(configuration['dns.ttl'] ?? 60), authoritativeServer: 'ns.netbite.test' }], cache: [], resolverReachable: Boolean(configuration['dns.reachable']) };
    return resolveDnsQuery(state, String(configuration['dns.name'] ?? 'server.netbite.test'), 'A').events;
  }
  if (labId === 'acl-policy-desk') {
    const result = evaluateIpv4Acl({ protocol: String(configuration['acl.protocol'] ?? 'tcp') as 'tcp', source: String(configuration['acl.source'] ?? '192.168.10.10'), destination: String(configuration['acl.destination'] ?? '192.168.20.20'), destinationPort: Number(configuration['acl.port'] ?? 443) }, [{ id: 'NETBITE-IN-10', action: String(configuration['acl.action'] ?? 'deny') as 'permit' | 'deny', protocol: 'tcp', source: String(configuration['acl.network'] ?? '192.168.10.0'), sourceWildcard: String(configuration['acl.wildcard'] ?? '0.0.0.255'), destination: '192.168.20.20', destinationWildcard: '0.0.0.0', destinationPort: 443 }]);
    return [`MATCH ${result.matchedRuleId}`, `ACTION ${result.action.toUpperCase()}`, result.reason];
  }
  if (labId === 'nat-translation-desk') {
    const result = translateNatFlow({ insideNetworks: [{ network: String(configuration['nat.network'] ?? '192.168.10.0'), prefix: Number(configuration['nat.prefix'] ?? 24) }], globalAddress: String(configuration['nat.global'] ?? '203.0.113.10'), nextPort: 40000, entries: [], insideUp: Boolean(configuration['nat.insideUp']), outsideUp: Boolean(configuration['nat.outsideUp']) }, { protocol: 'tcp', source: '192.168.10.10', sourcePort: 49152, destination: '198.51.100.20', destinationPort: 443 });
    return result.events;
  }
  if (labId === 'ipv6-address-desk') {
    const parsed = parseIPv6Address(String(configuration['ipv6.address'] ?? ''));
    return parsed ? [`EXPANDED ${parsed.expanded}`, `COMPRESSED ${parsed.compressed}`] : ['INVALID IPV6 ADDRESS'];
  }
  if (labId === 'ipv6-neighbor-desk') {
    const neighbor = resolveIPv6Neighbor([], String(configuration['nd.target'] ?? ''), String(configuration['nd.ownerMac'] ?? '') || undefined);
    const route = traceIPv6Path('2001:db8:20::20', [{ prefix: String(configuration['nd.routePrefix'] ?? '::'), prefixLength: Number(configuration['nd.routeLength'] ?? 0), nextHop: String(configuration['nd.nextHop'] ?? ''), exitInterface: 'G0/1' }]);
    return [`NDP ${neighbor.action.toUpperCase()}`, neighbor.reason, route.reason];
  }
  if (labId === 'spanning-tree-desk') {
    const tree = calculateSpanningTree([{ id: 'SW-A', priority: Number(configuration['stp.priorityA'] ?? 32768), mac: '00:00:00:00:00:0A' }, { id: 'SW-B', priority: Number(configuration['stp.priorityB'] ?? 32768), mac: '00:00:00:00:00:0B' }, { id: 'SW-C', priority: Number(configuration['stp.priorityC'] ?? 32768), mac: '00:00:00:00:00:0C' }], [{ id: 'AB', a: 'SW-A', b: 'SW-B', cost: Number(configuration['stp.costAB'] ?? 4), up: configuration['stp.failedLink'] !== 'AB' }, { id: 'BC', a: 'SW-B', b: 'SW-C', cost: Number(configuration['stp.costBC'] ?? 4), up: true }, { id: 'AC', a: 'SW-A', b: 'SW-C', cost: Number(configuration['stp.costAC'] ?? 8), up: true }]);
    return [`ROOT ${tree.rootId ?? 'NONE'}`, ...tree.roles.map((role) => `${role.switchId} ${role.linkId} / ${role.role.toUpperCase()} / ${role.forwarding ? 'FORWARDING' : 'DISCARDING'}`)];
  }
  if (labId === 'etherchannel-desk') {
    const vlans = String(configuration['lacp.vlans'] ?? '10,20').split(',').map(Number);
    const bundle = negotiateEtherChannel([{ id: 'A1', side: 'a', mode: String(configuration['lacp.modeA'] ?? 'passive') as 'active' | 'passive', up: Boolean(configuration['lacp.membersUp']), speed: Number(configuration['lacp.speedA'] ?? 1000), switchportMode: String(configuration['lacp.switchportMode'] ?? 'access') as 'access' | 'trunk', allowedVlans: vlans }, { id: 'B1', side: 'b', mode: String(configuration['lacp.modeB'] ?? 'passive') as 'active' | 'passive', up: Boolean(configuration['lacp.membersUp']), speed: Number(configuration['lacp.speedB'] ?? 1000), switchportMode: String(configuration['lacp.switchportMode'] ?? 'access') as 'access' | 'trunk', allowedVlans: vlans }]);
    return [`PORT-CHANNEL ${bundle.formed ? 'FORMED' : 'DOWN'}`, `ACTIVE ${bundle.activeMemberIds.join(', ') || 'NONE'}`, bundle.reason];
  }
  if (labId === 'route-source-desk') {
    const routes = [configuration['route.staticAvailable'] === false ? undefined : { prefix: '192.168.20.0', prefixLength: 24, source: 'static' as const, administrativeDistance: Number(configuration['route.staticAd'] ?? 1), metric: 0, nextHop: '10.0.0.2' }, { prefix: '192.168.20.0', prefixLength: Number(configuration['route.prefix'] ?? 24), source: 'ospf' as const, administrativeDistance: Number(configuration['route.ospfAd'] ?? 110), metric: 20, nextHop: '10.0.0.2' }, { prefix: '0.0.0.0', prefixLength: 0, source: 'static' as const, administrativeDistance: 1, metric: 0 }].filter(Boolean) as Parameters<typeof selectRouteSource>[1];
    const selected = selectRouteSource(String(configuration['route.destination'] ?? '192.168.20.20'), routes);
    return [selected.reason, selected.selected ? `INSTALLED ${selected.selected.source.toUpperCase()} ${selected.selected.prefix}/${selected.selected.prefixLength}` : 'NO ROUTE INSTALLED'];
  }
  if (labId === 'ospf-area-desk') {
    const topology = buildOspfTopology([{ id: 'R1', routerId: String(configuration['ospf.r1'] ?? '1.1.1.1'), advertisedPrefixes: ['192.168.10.0/24'] }, { id: 'R2', routerId: String(configuration['ospf.r2'] ?? '2.2.2.2'), advertisedPrefixes: ['10.0.12.0/30'] }, { id: 'R3', routerId: String(configuration['ospf.r3'] ?? '3.3.3.3'), advertisedPrefixes: configuration['ospf.advertise'] ? ['192.168.30.0/24'] : [] }], [{ a: 'R1', b: 'R2', cost: Number(configuration['ospf.cost12'] ?? 10), area: Number(configuration['ospf.area12'] ?? 0), up: Boolean(configuration['ospf.linksUp']), compatible: Number(configuration['ospf.area12'] ?? 0) === 0 }, { a: 'R2', b: 'R3', cost: Number(configuration['ospf.cost23'] ?? 10), area: Number(configuration['ospf.area23'] ?? 0), up: Boolean(configuration['ospf.linksUp']) && configuration['ospf.failedLink'] !== 'r2-r3-down', compatible: Number(configuration['ospf.area23'] ?? 0) === 0 }]);
    return [...topology.adjacencies.map((link) => `NEIGHBOR ${link.a}<->${link.b}`), ...calculateOspfRoutes(topology, 'R1').map((route) => `ROUTE ${route.prefix} COST ${route.cost} VIA ${route.nextHopRouterId}`)];
  }
  if (labId === 'network-operations-capstone') {
    const result = validateOperationsCapstone({
      ipv4: { vlans: configuration['cap.vlans'] === '10,20', etherChannel: configuration['cap.lacp'] === 'active-passive', spanningTree: configuration['cap.stp'] === 'SW-B', dhcp: configuration['cap.dhcp'] === '192.168.10.101', dns: configuration['cap.dns'] === '192.168.20.20', ospf: configuration['cap.ospfForward'] === '192.168.20.0/24' && configuration['cap.ospfReturn'] === '192.168.10.0/24', pat: configuration['cap.pat'] === '203.0.113.10', acl: configuration['cap.acl'] === 'permit-https-deny-other', forward: configuration['cap.ipv4Forward'] === 'pass', returnPath: configuration['cap.ipv4Return'] === 'pass' },
      ipv6: { addressing: configuration['cap.ipv6Address'] === '2001:db8:10::10', routerDiscovery: configuration['cap.ndp'] === 'fe80::1', neighborDiscovery: configuration['cap.ndp'] === 'fe80::1', staticRoutes: configuration['cap.ipv6Forward'] === '2001:db8:20::' && configuration['cap.ipv6Return'] === '2001:db8:10::', injectedFaultCorrected: configuration['cap.parentUp'] === 'up', forward: configuration['cap.ipv6Forward'] === '2001:db8:20::', returnPath: configuration['cap.ipv6Return'] === '2001:db8:10::' },
    });
    return [...result.failures, `CAPSTONE ${result.complete ? 'READY' : 'INCOMPLETE'}`];
  }
  return ['NO SIMULATION ADAPTER'];
}

export function evaluateSimulationObjective(labId: string, stageDefinition: GuidedSimulationStage, session: OperationsSimulationSession, explanation: SimulationExplanation): ObjectiveResult {
  const missing = stageDefinition.fields.find((field) => session.configuration[field.id] === undefined);
  if (missing) return { accepted: false, passed: false, message: `Save ${missing.label.toLowerCase()} before verification.`, evidence: [], tableRows: [], explanation };
  const incorrect = stageDefinition.fields.find((field) => session.configuration[field.id] !== field.expected);
  const evidence = engineEvidence(labId, session.configuration).map((line, index) => ({ id: `${stageDefinition.id}-${index}`, text: line, tone: incorrect ? 'warning' as const : 'success' as const }));
  return incorrect
    ? { accepted: true, passed: false, message: incorrect.incorrectFeedback, evidence, tableRows: evidence.map(({ text }) => text), explanation: { ...explanation, observation: evidence[0]?.text ?? 'The current configuration does not satisfy the objective.', nextCheck: `Inspect ${incorrect.label}.` } }
    : { accepted: true, passed: true, message: 'Objective satisfied from the current modeled state.', evidence, tableRows: evidence.map(({ text }) => text), explanation };
}

export function executeOperationsCliCommand(definition: GuidedSimulationDefinition, session: OperationsSimulationSession, input: string) {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ');
  const bounded = boundedCliCommands[definition.labId]?.find((entry) => entry.command === normalized);
  if (bounded) return { accepted: true, configuration: { ...session.configuration, ...bounded.updates }, output: `ACCEPTED / ${Object.keys(bounded.updates).length} MODELED SETTING${Object.keys(bounded.updates).length === 1 ? '' : 'S'} UPDATED` };
  for (const stageDefinition of definition.stages) {
    for (const field of stageDefinition.fields) {
      const match = field.options?.find((entry) => entry.command?.toLowerCase() === normalized);
      if (match) return { accepted: true, configuration: { ...session.configuration, [field.id]: match.value }, output: `ACCEPTED / ${field.label.toUpperCase()} = ${String(match.value).toUpperCase()}` };
    }
  }
  return { accepted: false, configuration: session.configuration, output: 'Unsupported NetBite command. Use a visible suggestion or the inspector.' };
}

export function getOperationsCliSuggestions(definition: GuidedSimulationDefinition, stageIndex: number) {
  const current = definition.stages[stageIndex];
  const authored = current?.fields.flatMap((field) => field.options?.flatMap((entry) => entry.command ? [entry.command] : []) ?? []) ?? [];
  const bounded = boundedCliCommands[definition.labId]?.filter((entry) => entry.stageId === current?.id).map(({ command }) => command) ?? [];
  return [...new Set([...bounded, ...authored])];
}
