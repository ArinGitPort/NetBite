import { StyleSheet, View } from 'react-native';

import type { LessonIllustration } from '@/content/types';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';

type AdvancedIllustration = Exclude<LessonIllustration,
  'network' | 'purpose' | 'devices' | 'connection' | 'frame' | 'nic' | 'cables' | 'ports' |
  'mac-address' | 'mac-learning' | 'switch-forwarding' | 'broadcast'>;

interface DiagramSpec { eyebrow: string; nodes: string[]; signal: string; note: string }

export const advancedIllustrationTypes: AdvancedIllustration[] = [
  'ipv4-address', 'ipv4-octets', 'ipv4-prefix', 'private-ipv4',
  'subnet-purpose', 'subnet-mask', 'subnet-boundaries', 'subnet-range',
  'router-interfaces', 'local-remote', 'default-gateway', 'routed-frame',
  'arp-mapping', 'arp-request', 'arp-reply', 'arp-next-hop',
  'icmp-role', 'echo-exchange', 'ping-boundary', 'diagnostic-path',
  'connected-routes', 'route-entry', 'static-route', 'longest-prefix',
  'vlan-segments', 'access-port', 'vlan-reachability', 'vlan-trunk',
  'model-purpose', 'osi-stack', 'tcp-ip-stack', 'concept-layer-map',
];

const specs: Record<AdvancedIllustration, DiagramSpec> = {
  'ipv4-address': { eyebrow: 'LOGICAL IDENTITY', nodes: ['INTERFACE', '192.168.10.25', '/24 NETWORK'], signal: 'IP', note: 'ONE ADDRESS / ONE INTERFACE' },
  'ipv4-octets': { eyebrow: '32 BITS / FOUR OCTETS', nodes: ['192', '168', '10', '25'], signal: '.', note: 'EACH OCTET: 0–255' },
  'ipv4-prefix': { eyebrow: 'ADDRESS / PREFIX', nodes: ['192.168.10', '25'], signal: '/', note: 'NETWORK 24 BITS / HOST 8 BITS' },
  'private-ipv4': { eyebrow: 'PRIVATE HOST CHECK', nodes: ['192.168.10.25', 'UNIQUE', 'USABLE'], signal: '✓', note: 'VALID LOCAL CONFIGURATION' },
  'subnet-purpose': { eyebrow: 'DIVIDE ONE ADDRESS BLOCK', nodes: ['192.168.10.0/24', 'SUBNET A', 'SUBNET B'], signal: '→', note: 'SEPARATE NETWORK BOUNDARIES' },
  'subnet-mask': { eyebrow: 'PREFIX / BLOCK SIZE', nodes: ['/24  256', '/25  128', '/26  64', '/27  32'], signal: '↓', note: 'LONGER PREFIX / SMALLER BLOCK' },
  'subnet-boundaries': { eyebrow: '/26 BOUNDARIES', nodes: ['0', '64', '128', '192'], signal: '+64', note: 'FIND THE BLOCK CONTAINING THE HOST' },
  'subnet-range': { eyebrow: 'SUBNET RANGE', nodes: ['NETWORK .64', 'HOSTS .65–.126', 'BROADCAST .127'], signal: '→', note: 'RESERVE BOTH ENDPOINTS' },
  'router-interfaces': { eyebrow: 'ROUTER JOINS NETWORKS', nodes: ['LAN A', 'ROUTER', 'LAN B'], signal: '↔', note: 'ONE ADDRESSED INTERFACE PER LAN' },
  'local-remote': { eyebrow: 'PREFIX COMPARISON', nodes: ['LOCAL / DIRECT', 'REMOTE / GATEWAY'], signal: 'OR', note: 'COMPARE NETWORK IDENTITIES' },
  'default-gateway': { eyebrow: 'LOCAL NEXT HOP', nodes: ['PC .10', 'GATEWAY .1', 'REMOTE LAN'], signal: '→', note: 'GATEWAY MUST SHARE THE LOCAL SUBNET' },
  'routed-frame': { eyebrow: 'TWO LOCAL LINKS', nodes: ['FRAME A', 'IP PACKET', 'FRAME B'], signal: '→', note: 'IP DESTINATION REMAINS THE SAME' },
  'arp-mapping': { eyebrow: 'LOCAL ADDRESS MAPPING', nodes: ['192.168.10.20', 'ARP', '02:00:…:0B'], signal: '→', note: 'IP NEXT HOP TO MAC ADDRESS' },
  'arp-request': { eyebrow: 'BROADCAST QUESTION', nodes: ['WHO HAS .20?', 'ALL LOCAL PORTS'], signal: '⇒', note: 'TARGET MAC IS NOT KNOWN YET' },
  'arp-reply': { eyebrow: 'OWNER REPLIES', nodes: ['.20 IS AT', '02:00:…:0B', 'CACHE'], signal: '→', note: 'STORE THE LOCAL MAPPING' },
  'arp-next-hop': { eyebrow: 'CHOOSE WHAT TO RESOLVE', nodes: ['LOCAL / HOST', 'REMOTE / GATEWAY'], signal: 'OR', note: 'ARP ONLY REACHES THE LOCAL LINK' },
  'icmp-role': { eyebrow: 'IP CONTROL MESSAGE', nodes: ['SOURCE', 'ICMP', 'DESTINATION'], signal: '→', note: 'REPORT AND DIAGNOSE' },
  'echo-exchange': { eyebrow: 'PING EXCHANGE', nodes: ['ECHO REQUEST', 'DESTINATION', 'ECHO REPLY'], signal: '↔', note: 'ONE ROUND-TRIP TEST' },
  'ping-boundary': { eyebrow: 'EVIDENCE / NOT CERTAINTY', nodes: ['REPLY', 'REACHABLE NOW', 'NO REPLY', 'CHECK MORE'], signal: '→', note: 'FAILURE CAN HAVE MANY CAUSES' },
  'diagnostic-path': { eyebrow: 'CHECKPOINT ORDER', nodes: ['LINK', 'ADDRESS', 'GATEWAY', 'PATH'], signal: '→', note: 'FIX THE FIRST FAILED DEPENDENCY' },
  'connected-routes': { eyebrow: 'ROUTE SOURCES', nodes: ['CONNECTED LAN', 'ROUTER', 'REMOTE LAN'], signal: '→', note: 'REMOTE NETWORK NEEDS A ROUTE' },
  'route-entry': { eyebrow: 'ROUTE TABLE ENTRY', nodes: ['PREFIX', 'NEXT HOP', 'EXIT PORT'], signal: '→', note: 'MATCH / THEN FORWARD' },
  'static-route': { eyebrow: 'BIDIRECTIONAL PATH', nodes: ['LAN A', 'R1', 'R2', 'LAN C'], signal: '↔', note: 'FORWARD AND RETURN ROUTES' },
  'longest-prefix': { eyebrow: 'BEST MATCH', nodes: ['/0', '/16', '/24'], signal: '→', note: '/24 WINS / MOST SPECIFIC' },
  'vlan-segments': { eyebrow: 'LOGICAL LAN SEPARATION', nodes: ['VLAN 10', 'SWITCH', 'VLAN 20'], signal: '│', note: 'TWO BROADCAST DOMAINS' },
  'access-port': { eyebrow: 'ONE ENDPOINT VLAN', nodes: ['PC A', 'ACCESS PORT', 'VLAN 10'], signal: '→', note: 'PORT MEMBERSHIP DEFINES THE VLAN' },
  'vlan-reachability': { eyebrow: 'COMMUNICATION RULE', nodes: ['SAME VLAN / SWITCH', 'DIFFERENT VLAN / ROUTE'], signal: 'OR', note: 'LAYER 3 CROSSES VLAN BOUNDARIES' },
  'vlan-trunk': { eyebrow: 'INTER-SWITCH TRUNK', nodes: ['SWITCH A', 'VLAN 10 + 20', 'SWITCH B'], signal: '⇄', note: 'ALLOW EACH REQUIRED VLAN' },
  'model-purpose': { eyebrow: 'SHARED NETWORK LANGUAGE', nodes: ['SIGNALS', 'DELIVERY', 'APPLICATIONS'], signal: '↑', note: 'ISOLATE RESPONSIBILITIES' },
  'osi-stack': { eyebrow: 'OSI / LAYER 7 TO 1', nodes: ['APPLICATION / PRESENTATION / SESSION', 'TRANSPORT / NETWORK', 'DATA LINK / PHYSICAL'], signal: '↓', note: 'SEVEN RESPONSIBILITY GROUPS' },
  'tcp-ip-stack': { eyebrow: 'TCP/IP / FOUR LAYERS', nodes: ['APPLICATION', 'TRANSPORT', 'INTERNET', 'NETWORK ACCESS'], signal: '↓', note: 'PRACTICAL PROTOCOL GROUPING' },
  'concept-layer-map': { eyebrow: 'MAP BY RESPONSIBILITY', nodes: ['CABLE / L1', 'ETHERNET / L2', 'IP / L3', 'TCP / L4'], signal: '→', note: 'TROUBLESHOOT THE RIGHT LAYER' },
};

export function isAdvancedIllustration(type: LessonIllustration): type is AdvancedIllustration {
  return advancedIllustrationTypes.includes(type as AdvancedIllustration);
}

export function AdvancedLessonIllustration({ type }: { type: AdvancedIllustration }) {
  const spec = specs[type];
  const showNetworkDevices = ['router-interfaces', 'default-gateway', 'routed-frame', 'connected-routes', 'static-route', 'vlan-trunk'].includes(type);
  return (
    <View accessible accessibilityLabel={`${spec.eyebrow}. ${spec.nodes.join(', ')}. ${spec.note}.`} style={styles.card}>
      <Text variant="label" style={styles.eyebrow}>{spec.eyebrow}</Text>
      {showNetworkDevices ? (
        <View style={styles.devices}>
          <DeviceGlyph type="pc" size={54} />
          <View style={styles.path}><Text variant="technical" style={styles.signal}>{spec.signal}</Text></View>
          <DeviceGlyph type={type === 'vlan-trunk' ? 'switch' : 'router'} size={58} />
          <View style={styles.path}><Text variant="technical" style={styles.signal}>{spec.signal}</Text></View>
          <DeviceGlyph type={type === 'vlan-trunk' ? 'switch' : 'pc'} size={54} />
        </View>
      ) : null}
      <View style={styles.nodeGrid}>
        {spec.nodes.map((node, index) => (
          <View key={`${type}-${node}`} style={[styles.node, index === 0 && styles.nodeActive]}>
            <Text variant="technical" style={[styles.nodeText, index === 0 && styles.nodeTextActive]}>{node}</Text>
          </View>
        ))}
      </View>
      <Text variant="technical" style={styles.note}>{spec.note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, backgroundColor: Palette.surface, padding: Space.lg, gap: Space.md },
  eyebrow: { color: Palette.orange, fontFamily: Fonts.medium, textAlign: 'center' },
  devices: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 72 },
  path: { flex: 1, minWidth: 24, height: 1, backgroundColor: Palette.accent, alignItems: 'center', justifyContent: 'center' },
  signal: { color: Palette.orange, backgroundColor: Palette.surface, paddingHorizontal: Space.xs },
  nodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, justifyContent: 'center' },
  node: { minHeight: 44, minWidth: 112, flexGrow: 1, flexBasis: 112, justifyContent: 'center', borderWidth: 1, borderColor: Palette.border, padding: Space.sm, backgroundColor: Palette.surfaceRaised },
  nodeActive: { borderColor: Palette.green },
  nodeText: { color: Palette.textMuted, textAlign: 'center', fontFamily: Fonts.medium },
  nodeTextActive: { color: Palette.text },
  note: { color: Palette.green, textAlign: 'center' },
});
