import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import type { LessonCallout } from '@/content/types';
import type { DeviceType } from '@/core/network/models';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

interface CablingExample {
  firstDevice: DeviceType;
  firstLabel: string;
  secondDevice: DeviceType;
  secondLabel: string;
  relationship: 'UNLIKE DEVICES' | 'LIKE DEVICES';
  crossover: boolean;
}

const cablingExamples: CablingExample[] = [
  { firstDevice: 'pc', firstLabel: 'PC', secondDevice: 'switch', secondLabel: 'SWITCH', relationship: 'UNLIKE DEVICES', crossover: false },
  { firstDevice: 'router', firstLabel: 'ROUTER', secondDevice: 'switch', secondLabel: 'SWITCH', relationship: 'UNLIKE DEVICES', crossover: false },
  { firstDevice: 'switch', firstLabel: 'SWITCH A', secondDevice: 'switch', secondLabel: 'SWITCH B', relationship: 'LIKE DEVICES', crossover: true },
];

function WiringPath({ crossover, relationship }: Pick<CablingExample, 'crossover' | 'relationship'>) {
  return (
    <View style={styles.wiringColumn}>
      <Text variant="technical" style={styles.relationshipLabel}>{relationship}</Text>
      <Svg height={44} viewBox="0 0 160 44" width="100%">
        <Rect x="1" y="5" width="14" height="34" fill={Palette.background} stroke={Palette.border} strokeWidth="2" />
        <Rect x="145" y="5" width="14" height="34" fill={Palette.background} stroke={Palette.border} strokeWidth="2" />
        <Line
          x1="15"
          y1="30"
          x2="145"
          y2={crossover ? '14' : '30'}
          stroke={Palette.orange}
          strokeWidth="3"
        />
        {crossover ? (
          <Line
            x1="15"
            y1="14"
            x2="145"
            y2="30"
            stroke={Palette.surfaceRaised}
            strokeWidth="7"
          />
        ) : null}
        <Line
          x1="15"
          y1="14"
          x2="145"
          y2={crossover ? '30' : '14'}
          stroke={Palette.accentBright}
          strokeWidth="3"
        />
        <Circle cx="8" cy="14" r="3" fill={Palette.accentBright} />
        <Circle cx="8" cy="30" r="3" fill={Palette.orange} />
        <Circle cx="152" cy={crossover ? '30' : '14'} r="3" fill={Palette.accentBright} />
        <Circle cx="152" cy={crossover ? '14' : '30'} r="3" fill={Palette.orange} />
      </Svg>
      <View style={[styles.cableBadge, crossover ? styles.crossoverBadge : styles.straightBadge]}>
        <Text variant="technical" style={[styles.cableLabel, crossover ? styles.crossoverLabel : styles.straightLabel]}>{crossover ? 'CROSSOVER' : 'STRAIGHT-THROUGH'}</Text>
      </View>
    </View>
  );
}

function ManualCablingGraphic() {
  return (
    <View style={styles.examples}>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.pairA]} /><Text variant="technical" style={styles.legendText}>PAIR A</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.pairB]} /><Text variant="technical" style={styles.legendText}>PAIR B</Text></View>
      </View>
      {cablingExamples.map((example, index) => (
        <View key={`${example.firstLabel}-${example.secondLabel}-${index}`} style={styles.exampleRow}>
          <View style={styles.endpoint}>
            <DeviceGlyph type={example.firstDevice} size={46} />
            <Text variant="label" style={styles.endpointLabel}>{example.firstLabel}</Text>
          </View>
          <WiringPath crossover={example.crossover} relationship={example.relationship} />
          <View style={styles.endpoint}>
            <DeviceGlyph type={example.secondDevice} size={46} />
            <Text variant="label" style={styles.endpointLabel}>{example.secondLabel}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function LessonFieldNote({ note }: { note: LessonCallout }) {
  return (
    <View style={styles.panel}>
      <Text variant="label" style={styles.label}>{note.label}</Text>
      <Text variant="body" style={styles.copy}>{note.text}</Text>
      {note.visual === 'manual-cabling' ? <ManualCablingGraphic /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.orange, padding: Space.lg, marginTop: Space.xl },
  label: { color: Palette.orange, fontFamily: Fonts.medium, marginBottom: Space.xs },
  copy: { color: Palette.text },
  examples: { gap: Space.sm, marginTop: Space.lg },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: Space.lg, paddingBottom: Space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  legendSwatch: { width: 16, height: 3 },
  pairA: { backgroundColor: Palette.accentBright },
  pairB: { backgroundColor: Palette.orange },
  legendText: { color: Palette.textMuted, fontFamily: Fonts.medium },
  exampleRow: { minHeight: 104, flexDirection: 'row', alignItems: 'center', padding: Space.sm, backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border },
  endpoint: { width: 56, minWidth: 0, alignItems: 'center', gap: 2 },
  endpointLabel: { color: Palette.text, fontFamily: Fonts.medium, textAlign: 'center' },
  wiringColumn: { flex: 1, minWidth: 80, alignItems: 'stretch', paddingHorizontal: Space.xs },
  relationshipLabel: { color: Palette.textMuted, fontFamily: Fonts.medium, textAlign: 'center' },
  cableBadge: { alignSelf: 'center', minHeight: 24, justifyContent: 'center', paddingHorizontal: Space.sm, backgroundColor: Palette.background, borderWidth: 1 },
  straightBadge: { borderColor: Palette.green },
  crossoverBadge: { borderColor: Palette.orange },
  cableLabel: { fontFamily: Fonts.medium, textAlign: 'center' },
  straightLabel: { color: Palette.green },
  crossoverLabel: { color: Palette.orange },
});
