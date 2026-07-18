import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { LessonIllustration } from '@/content/types';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import {
  educationalIllustrations,
  type DiagramBit,
  type DiagramNode,
  type DiagramSegment,
  type DiagramSubnetRow,
  type DiagramTone,
  type EducationAssetName,
  type IllustrationPresentation,
  type VisualToken,
} from '@/features/lessons/educational-illustration-registry';
import { Text } from '@/shared/components/console-text';
import { useMeasuredResponsiveLayout, type ResponsiveMode } from '@/shared/responsive-layout';
import { Fonts, Palette, Space } from '@/shared/theme';

const educationAssets: Record<EducationAssetName, number> = {
  'server-terminal': require('@/assets/images/education/server-terminal-mobile.png'),
  'ethernet-frame': require('@/assets/images/education/ethernet-frame-mobile.png'),
  'ipv4-datagram': require('@/assets/images/education/ipv4-datagram-mobile.png'),
  'arp-request': require('@/assets/images/education/arp-request-mobile.png'),
  'arp-reply': require('@/assets/images/education/arp-reply-mobile.png'),
  'arp-cache': require('@/assets/images/education/arp-cache-mobile.png'),
  'icmp-echo-request': require('@/assets/images/education/icmp-echo-request-mobile.png'),
  'icmp-echo-reply': require('@/assets/images/education/icmp-echo-reply-mobile.png'),
  'route-table': require('@/assets/images/education/route-table-mobile.png'),
  'vlan-tagged-frame': require('@/assets/images/education/vlan-tagged-frame-mobile.png'),
  'transport-channel': require('@/assets/images/education/transport-channel-mobile.png'),
  'session-handshake': require('@/assets/images/education/session-handshake-mobile.png'),
  'presentation-encoding': require('@/assets/images/education/presentation-encoding-mobile.png'),
  'application-window': require('@/assets/images/education/application-window-mobile.png'),
};

const toneColors: Record<DiagramTone, { border: string; fill: string; text: string }> = {
  neutral: { border: '#62666A', fill: '#303136', text: '#E0DEE0' },
  red: { border: '#A24B52', fill: '#4A292E', text: '#F1DADB' },
  orange: { border: '#B77449', fill: '#4A3326', text: '#F0DDCF' },
  sage: { border: '#71958B', fill: '#263C38', text: '#D7E6E2' },
  blue: { border: '#6689A3', fill: '#273A49', text: '#D9E7F0' },
  violet: { border: '#8E77A0', fill: '#392E41', text: '#E8DDED' },
  gold: { border: '#A28C54', fill: '#443B26', text: '#EDE4CC' },
};

function Token({ token, size = 72 }: { token: VisualToken; size?: number }) {
  if (token === 'pc' || token === 'switch' || token === 'router') return <DeviceGlyph type={token} size={size} />;
  if (token === 'copper-cable') return <Image accessibilityIgnoresInvertColors contentFit="contain" source={require('@/assets/images/ethernet/ethernet-copper-cable-mobile.png')} style={{ width: size, height: size }} />;
  return <Image accessibilityIgnoresInvertColors contentFit="contain" source={educationAssets[token]} style={{ width: size, height: size }} />;
}

function NodeCard({ node, compact = false }: { node: DiagramNode; compact?: boolean }) {
  const tone = toneColors[node.tone ?? 'neutral'];
  return (
    <View style={[styles.nodeCard, compact && styles.nodeCardCompact, { borderColor: tone.border, backgroundColor: tone.fill }]}>
      {node.token ? <Token token={node.token} size={compact ? 56 : 76} /> : null}
      <Text variant="label" style={[styles.nodeLabel, { color: tone.text }]}>{node.label}</Text>
      {node.detail ? <Text variant="technical" style={styles.nodeDetail}>{node.detail}</Text> : null}
    </View>
  );
}

function Direction({ vertical = false }: { vertical?: boolean }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.direction, vertical && styles.directionVertical]}>
      <View style={[styles.directionLine, vertical && styles.directionLineVertical]} />
      <Text variant="technical" style={styles.directionArrow}>{vertical ? '↓' : '›'}</Text>
    </View>
  );
}

function NodeFlow({ nodes, topology = false, mode }: { nodes: DiagramNode[]; topology?: boolean; mode: ResponsiveMode }) {
  const vertical = mode === 'compact';
  return (
    <View style={[styles.flow, vertical && styles.flowVertical, !vertical && nodes.length > 3 && styles.flowWrap]}>
      {nodes.map((node, index) => (
        <View key={`${node.label}-${index}`} style={[styles.flowUnit, vertical && styles.flowUnitVertical, !vertical && nodes.length > 3 && styles.flowUnitWrapped]}>
          <NodeCard compact={vertical || nodes.length > 3} node={node} />
          {index < nodes.length - 1 ? <Direction vertical={vertical} /> : null}
          {topology && index < nodes.length - 1 ? <Text variant="technical" style={styles.linkLabel}>LINK</Text> : null}
        </View>
      ))}
    </View>
  );
}

function Comparison({ nodes, mode }: { nodes: DiagramNode[]; mode: ResponsiveMode }) {
  return (
    <View style={styles.comparison}>
      {nodes.map((node, index) => (
        <View key={`${node.label}-${index}`} style={[styles.comparisonItem, mode === 'compact' && styles.comparisonItemCompact]}>
          <NodeCard compact={mode === 'compact'} node={node} />
          {index === 0 && nodes.length === 2 ? <Text variant="technical" style={styles.orLabel}>COMPARE</Text> : null}
        </View>
      ))}
    </View>
  );
}

function AddressRange({ segments, mode, presentation = 'auto' }: { segments: DiagramSegment[]; mode: ResponsiveMode; presentation?: IllustrationPresentation }) {
  const stacked = presentation === 'full-address' && mode !== 'wide';
  return (
    <View style={[styles.segmentRow, stacked && styles.segmentColumn]}>
      {segments.map((segment, index) => {
        const tone = toneColors[segment.tone ?? 'neutral'];
        return (
          <View key={`${segment.label}-${index}`} style={[
            styles.segment,
            stacked
              ? styles.segmentStacked
              : {
                  flexGrow: segment.weight ?? 1,
                  flexBasis: presentation === 'full-address'
                    ? (segment.valueLines?.length ? 288 : 156)
                    : (mode === 'compact' ? '45%' : 76),
                },
            { borderColor: tone.border, backgroundColor: tone.fill },
          ]}>
            <Text variant="technical" style={styles.segmentLabel}>{segment.label}</Text>
            {segment.valueLines?.length && stacked ? (
              <View style={styles.segmentValueLines}>
                {segment.valueLines.map((line) => (
                  <View key={`${line.label}-${line.value}`} style={styles.segmentValueLine}>
                    {line.label ? <Text variant="technical" style={styles.segmentLineLabel}>{line.label}</Text> : null}
                    <Text variant="sectionHeading" style={[styles.segmentLineValue, { color: tone.text }]}>{line.value}</Text>
                  </View>
                ))}
              </View>
            ) : <Text variant="sectionHeading" style={[styles.segmentValue, { color: tone.text }]}>{segment.value}</Text>}
            {segment.detail ? <Text variant="technical" style={styles.segmentDetail}>{segment.detail}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function TechnicalTable({ headers = [], rows = [], mode }: { headers?: string[]; rows?: string[][]; mode: ResponsiveMode }) {
  if (mode === 'compact') {
    return (
      <View style={styles.tableCards}>
        {rows.map((row, rowIndex) => (
          <View key={`record-${rowIndex}`} style={styles.tableCard}>
            {row.map((value, cellIndex) => (
              <View key={`${value}-${cellIndex}`} style={styles.tableField}>
                <Text variant="technical" style={styles.tableFieldLabel}>{headers[cellIndex] ?? `FIELD ${cellIndex + 1}`}</Text>
                <Text variant="technical" style={[styles.tableFieldValue, cellIndex === 0 && styles.tableFirstCell]}>{value}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        {headers.map((header) => <Text key={header} variant="technical" style={[styles.tableCell, styles.tableHeader]}>{header}</Text>)}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.tableRow}>
          {row.map((value, cellIndex) => <Text key={`${value}-${cellIndex}`} variant="technical" style={[styles.tableCell, cellIndex === 0 && styles.tableFirstCell]}>{value}</Text>)}
        </View>
      ))}
    </View>
  );
}

function BitStrip({ bits, mode }: { bits: DiagramBit[]; mode: ResponsiveMode }) {
  return (
    <View style={styles.bitStrip}>
      {bits.map((bit) => {
        const network = bit.role === 'network';
        return (
          <View key={bit.place} style={[styles.bitCell, mode === 'compact' && styles.bitCellCompact, network ? styles.bitNetwork : styles.bitHost]}>
            <Text variant="technical" style={styles.bitPlace}>{bit.place}</Text>
            <Text variant="sectionHeading" style={styles.bitValue}>{bit.bit}</Text>
            <Text variant="technical" style={styles.bitRole}>{network ? 'NET' : 'HOST'}</Text>
          </View>
        );
      })}
    </View>
  );
}

function SubnetMap({ rows, mode }: { rows: DiagramSubnetRow[]; mode: ResponsiveMode }) {
  return (
    <View style={styles.subnetMap}>
      {rows.map((row, index) => (
        <View key={row.network} style={styles.subnetRow}>
          <Text variant="label" style={styles.subnetIndex}>BLOCK {index + 1}</Text>
          <SubnetField compact={mode === 'compact'} label="NETWORK" toneStyle={styles.subnetNetwork} value={row.network} />
          <SubnetField compact={mode === 'compact'} label="FIRST USABLE" toneStyle={styles.subnetUsable} value={row.firstUsable} />
          <SubnetField compact={mode === 'compact'} label="LAST USABLE" toneStyle={styles.subnetUsable} value={row.lastUsable} />
          <SubnetField compact={mode === 'compact'} label="BROADCAST" toneStyle={styles.subnetBroadcast} value={row.broadcast} />
        </View>
      ))}
    </View>
  );
}

function SubnetField({ compact, label, toneStyle, value }: { compact: boolean; label: string; toneStyle: object; value: string }) {
  return (
    <View style={[styles.subnetField, compact && styles.subnetFieldCompact]}>
      <Text variant="technical" style={styles.subnetFieldLabel}>{label}</Text>
      <Text variant="technical" style={[styles.subnetFieldValue, toneStyle]}>{value}</Text>
    </View>
  );
}

function layerToken(layer: DiagramSegment): VisualToken {
  const name = `${layer.label} ${layer.value}`;
  if (name.includes('PRESENTATION')) return 'presentation-encoding';
  if (name.includes('SESSION')) return 'session-handshake';
  if (name.includes('TRANSPORT')) return 'transport-channel';
  if (name.includes('NETWORK') || name.includes('INTERNET')) return 'ipv4-datagram';
  if (name.includes('DATA LINK') || name.includes('LINK')) return 'ethernet-frame';
  if (name.includes('PHYSICAL')) return 'copper-cable';
  return 'application-window';
}

function Stack({ layers, mode }: { layers: DiagramSegment[]; mode: ResponsiveMode }) {
  return (
    <View style={styles.stack}>
      {layers.map((layer) => {
        const tone = toneColors[layer.tone ?? 'neutral'];
        return (
          <View key={`${layer.label}-${layer.value}`} style={[styles.layer, { borderColor: tone.border, backgroundColor: tone.fill }]}>
            <View style={[styles.layerNumber, mode === 'compact' && styles.layerNumberCompact, { borderColor: tone.border }]}><Text variant="label" style={{ color: tone.text }}>{layer.label}</Text></View>
            <Token token={layerToken(layer)} size={mode === 'compact' ? 32 : 38} />
            <View style={styles.layerCopy}>
              <Text variant="label" style={[styles.layerName, { color: tone.text }]}>{layer.value}</Text>
              {layer.detail ? <Text variant="technical" style={styles.layerDetail}>{layer.detail}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Mapping({ mappings = [], mode }: { mappings?: [string, string][]; mode: ResponsiveMode }) {
  const compact = mode === 'compact';
  return (
    <View style={styles.mapping}>
      {!compact ? <View style={styles.mappingHeader}><Text variant="label" style={styles.mappingHeaderText}>OSI</Text><Text variant="label" style={styles.mappingHeaderText}>TCP/IP</Text></View> : null}
      {mappings.map(([osi, tcpIp], index) => {
        const tone = toneColors[(['violet', 'gold', 'orange', 'sage'] as DiagramTone[])[index]];
        return (
          <View key={osi} style={[styles.mappingRow, compact && styles.mappingRowCompact]}>
            <View style={[styles.mappingCell, compact && styles.mappingCellCompact, { borderColor: tone.border, backgroundColor: tone.fill }]}><Text variant="technical" style={[styles.mappingText, { color: tone.text }]}>{compact ? `OSI / ${osi}` : osi}</Text></View>
            <Text variant="technical" style={[styles.mappingArrow, compact && styles.mappingArrowCompact]}>{compact ? '↓' : '→'}</Text>
            <View style={[styles.mappingCell, compact && styles.mappingCellCompact, { borderColor: tone.border, backgroundColor: tone.fill }]}><Text variant="technical" style={[styles.mappingText, { color: tone.text }]}>{compact ? `TCP/IP / ${tcpIp}` : tcpIp}</Text></View>
          </View>
        );
      })}
    </View>
  );
}

export function EducationalLessonIllustration({ type }: { type: LessonIllustration }) {
  const illustration = educationalIllustrations[type];
  const responsive = useMeasuredResponsiveLayout();
  if (illustration.family === 'legacy') return null;
  return (
    <View accessible accessibilityLabel={illustration.accessibilityLabel} onLayout={responsive.onLayout} style={styles.card}>
      <Text variant="label" style={styles.title}>{illustration.title}</Text>
      {illustration.family === 'topology' ? <NodeFlow mode={responsive.mode} nodes={illustration.nodes ?? []} topology /> : null}
      {illustration.family === 'sequence' ? <NodeFlow mode={responsive.mode} nodes={illustration.nodes ?? []} /> : null}
      {illustration.family === 'comparison' ? <Comparison mode={responsive.mode} nodes={illustration.nodes ?? []} /> : null}
      {illustration.family === 'address-range' ? <AddressRange mode={responsive.mode} presentation={illustration.presentation} segments={illustration.segments ?? []} /> : null}
      {illustration.family === 'table' ? <TechnicalTable headers={illustration.headers} mode={responsive.mode} rows={illustration.rows} /> : null}
      {illustration.family === 'bit-strip' ? <BitStrip bits={illustration.bits ?? []} mode={responsive.mode} /> : null}
      {illustration.family === 'subnet-map' ? <SubnetMap mode={responsive.mode} rows={illustration.subnets ?? []} /> : null}
      {illustration.family === 'stack' ? <Stack layers={illustration.layers ?? []} mode={responsive.mode} /> : null}
      {illustration.family === 'mapping' ? <Mapping mappings={illustration.mappings} mode={responsive.mode} /> : null}
      {illustration.footer ? <Text variant="technical" style={styles.footer}>{illustration.footer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 0, minHeight: 192, padding: Space.lg, gap: Space.lg, backgroundColor: '#1B1A1D', borderWidth: 1, borderColor: '#4B4D50' },
  title: { color: '#E0DEE0', fontFamily: Fonts.semibold, textAlign: 'center' },
  flow: { minWidth: 0, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center' },
  flowVertical: { flexDirection: 'column' },
  flowWrap: { flexWrap: 'wrap', gap: Space.sm },
  flowUnit: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  flowUnitVertical: { width: '100%', flexDirection: 'column', flexGrow: 0 },
  flowUnitWrapped: { minWidth: 132, flexBasis: 132 },
  nodeCard: { flex: 1, minWidth: 0, minHeight: 146, alignItems: 'center', justifyContent: 'center', padding: Space.sm, borderWidth: 1 },
  nodeCardCompact: { width: '100%', minHeight: 126 },
  nodeLabel: { fontFamily: Fonts.semibold, textAlign: 'center' },
  nodeDetail: { color: '#C5C3C5', marginTop: Space.xs, textAlign: 'center' },
  direction: { width: 24, alignItems: 'center', justifyContent: 'center' },
  directionVertical: { width: '100%', height: 32 },
  directionLine: { position: 'absolute', left: 2, right: 2, height: 2, backgroundColor: '#B65B56' },
  directionLineVertical: { top: 2, bottom: 2, left: '50%', right: undefined, width: 2, height: undefined },
  directionArrow: { color: '#D18B5A', fontFamily: Fonts.semibold, backgroundColor: '#1B1A1D' },
  linkLabel: { display: 'none' },
  comparison: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: Space.md },
  comparisonItem: { minWidth: 136, flex: 1, flexBasis: 180 },
  comparisonItemCompact: { minWidth: '100%', flexBasis: '100%' },
  orLabel: { display: 'none' },
  segmentRow: { minWidth: 0, minHeight: 128, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  segmentColumn: { flexDirection: 'column', flexWrap: 'nowrap', gap: Space.sm },
  segment: { minWidth: 0, minHeight: 104, alignItems: 'center', justifyContent: 'center', padding: Space.sm, borderWidth: 1 },
  segmentStacked: { width: '100%', minHeight: 88 },
  segmentLabel: { color: '#BCB9BC', textAlign: 'center' },
  segmentValue: { marginTop: Space.xs, fontFamily: Fonts.semibold, textAlign: 'center' },
  segmentValueLines: { width: '100%', marginTop: Space.xs, gap: Space.xs },
  segmentValueLine: { alignItems: 'center' },
  segmentLineLabel: { color: '#BCB9BC' },
  segmentLineValue: { fontFamily: Fonts.semibold, textAlign: 'center' },
  segmentDetail: { color: '#BCB9BC', marginTop: Space.xs, textAlign: 'center' },
  table: { minWidth: 0, borderWidth: 1, borderColor: '#55585A', backgroundColor: '#121114' },
  tableRow: { minHeight: 40, flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: '#3D3F42' },
  tableCell: { flex: 1, minWidth: 0, paddingHorizontal: Space.xs, paddingVertical: Space.sm, color: '#D0CDD0', textAlign: 'center' },
  tableHeader: { color: '#D18B5A', fontFamily: Fonts.semibold },
  tableFirstCell: { color: '#DDE7E4', fontFamily: Fonts.medium },
  tableCards: { gap: Space.sm },
  tableCard: { padding: Space.sm, gap: Space.xs, borderWidth: 1, borderColor: '#55585A', backgroundColor: '#121114' },
  tableField: { minWidth: 0, paddingVertical: Space.xs, borderBottomWidth: 1, borderBottomColor: '#3D3F42' },
  tableFieldLabel: { color: '#D18B5A', fontFamily: Fonts.semibold },
  tableFieldValue: { minWidth: 0, marginTop: 2, color: '#D0CDD0' },
  bitStrip: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3 },
  bitCell: { width: 52, minHeight: 84, alignItems: 'center', justifyContent: 'center', padding: Space.xs, borderWidth: 1 },
  bitCellCompact: { minWidth: 52, maxWidth: 72, flexGrow: 1, flexBasis: '22%' },
  bitNetwork: { borderColor: '#71958B', backgroundColor: '#263C38' },
  bitHost: { borderColor: '#B77449', backgroundColor: '#4A3326' },
  bitPlace: { color: '#C5C3C5' },
  bitValue: { color: '#F0ECEF', fontFamily: Fonts.semibold, marginVertical: 2 },
  bitRole: { color: '#C5C3C5' },
  subnetMap: { minWidth: 0, gap: Space.sm },
  subnetRow: { minWidth: 0, padding: Space.sm, gap: Space.xs, borderWidth: 1, borderColor: '#55585A', backgroundColor: '#121114' },
  subnetIndex: { color: '#D18B5A', fontFamily: Fonts.semibold },
  subnetField: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.xs },
  subnetFieldCompact: { flexDirection: 'column', alignItems: 'flex-start' },
  subnetFieldLabel: { minWidth: 88, color: '#99969A' },
  subnetFieldValue: { minWidth: 0, flexShrink: 1 },
  subnetNetwork: { color: '#D9E7F0' },
  subnetUsable: { color: '#D7E6E2' },
  subnetBroadcast: { color: '#F0DDCF' },
  stack: { minWidth: 0, gap: 3 },
  layer: { minWidth: 0, minHeight: 56, flexDirection: 'row', alignItems: 'center', padding: Space.xs, borderWidth: 1 },
  layerNumber: { width: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1 },
  layerNumberCompact: { width: 36 },
  layerCopy: { flex: 1, minWidth: 0, marginLeft: Space.sm },
  layerName: { fontFamily: Fonts.semibold },
  layerDetail: { color: '#C4C1C4', marginTop: 2 },
  mapping: { minWidth: 0, gap: Space.xs },
  mappingHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: '7%' },
  mappingHeaderText: { width: '42%', color: '#D18B5A', textAlign: 'center' },
  mappingRow: { minWidth: 0, minHeight: 64, flexDirection: 'row', alignItems: 'stretch' },
  mappingRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  mappingCell: { width: '43%', minWidth: 0, alignItems: 'center', justifyContent: 'center', padding: Space.xs, borderWidth: 1 },
  mappingCellCompact: { width: '100%', minHeight: 52 },
  mappingText: { fontFamily: Fonts.medium, textAlign: 'center' },
  mappingArrow: { width: '14%', alignSelf: 'center', color: '#D18B5A', textAlign: 'center' },
  mappingArrowCompact: { width: '100%', paddingVertical: 2 },
  footer: { color: Palette.textMuted, textAlign: 'center' },
});
