import { StyleSheet, View } from 'react-native';

import type { LessonIllustration } from '@/content/types';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { educationalIllustrations } from '@/features/lessons/educational-illustration-registry';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

type SwitchingIllustration = Extract<
  LessonIllustration,
  'mac-address' | 'mac-learning' | 'switch-forwarding' | 'broadcast'
>;

const PC_A = '02:00:00:00:00:0A';
const PC_B = '02:00:00:00:00:0B';

function Endpoint({ label, type = 'pc' }: { label: string; type?: 'pc' | 'switch' }) {
  return (
    <View style={styles.endpoint}>
      <DeviceGlyph type={type} size={48} />
      <Text variant="label" style={styles.endpointLabel}>{label}</Text>
    </View>
  );
}

function AddressPlate({ label, address }: { label: string; address: string }) {
  return (
    <View style={styles.addressPlate}>
      <Text variant="technical" style={styles.smallLabel}>{label}</Text>
      <Text variant="bodySmall" style={styles.address}>{address}</Text>
    </View>
  );
}

function MacAddressGraphic() {
  return (
    <View style={styles.centeredGraphic}>
      <Endpoint label="PC A / NIC" />
      <AddressPlate label="MAC ADDRESS / 6 BYTES" address={PC_A} />
      <View style={styles.byteRow}>
        {PC_A.split(':').map((byte, index) => (
          <View key={`${byte}-${index}`} style={styles.byteCell}><Text variant="technical" style={styles.byteText}>{byte}</Text></View>
        ))}
      </View>
    </View>
  );
}

function LearningGraphic() {
  return (
    <View style={styles.centeredGraphic}>
      <View style={styles.deviceFlow}>
        <Endpoint label="PC A" />
        <View style={styles.flowPath}>
          <Text variant="technical" style={styles.flowLabel}>FRAME ENTERS P1</Text>
          <View style={styles.signalLine} />
        </View>
        <Endpoint label="SWITCH" type="switch" />
      </View>
      <AddressPlate label="SOURCE MAC READ" address={PC_A} />
      <View style={styles.table}>
        <View style={styles.tableHeader}><Text variant="technical" style={styles.tableHeaderText}>MAC ADDRESS</Text><Text variant="technical" style={styles.tableHeaderText}>PORT</Text></View>
        <View style={styles.tableRow}><Text variant="bodySmall" style={styles.tableValue}>{PC_A}</Text><Text variant="label" style={styles.portValue}>1</Text></View>
      </View>
      <Text variant="technical" style={styles.caption}>LEARN SOURCE / NOT DESTINATION</Text>
    </View>
  );
}

function DecisionRow({ label, destination, result, active }: { label: string; destination: string; result: string; active?: boolean }) {
  return (
    <View style={[styles.decisionRow, active && styles.decisionRowActive]}>
      <View style={styles.decisionCopy}>
        <Text variant="technical" style={styles.smallLabel}>{label}</Text>
        <Text variant="technical" style={styles.decisionDestination}>DEST {destination}</Text>
      </View>
      <Text variant="technical" style={[styles.decisionResult, active && styles.decisionResultActive]}>{result}</Text>
    </View>
  );
}

function ForwardingGraphic() {
  return (
    <View style={styles.centeredGraphic}>
      <View style={styles.deviceFlow}>
        <Endpoint label="PC A / P1" />
        <Endpoint label="SWITCH" type="switch" />
        <Endpoint label="PC B / P2" />
      </View>
      <View style={styles.table}>
        <View style={styles.tableRow}><Text variant="bodySmall" style={styles.tableValue}>{PC_B}</Text><Text variant="label" style={styles.portValue}>2</Text></View>
      </View>
      <DecisionRow active label="KNOWN UNICAST" destination="...0B" result="FORWARD P2" />
      <DecisionRow label="UNKNOWN UNICAST" destination="...0C" result="FLOOD OTHER PORTS" />
    </View>
  );
}

function BroadcastGraphic() {
  return (
    <View style={styles.centeredGraphic}>
      <AddressPlate label="DESTINATION / EVERY INTERFACE" address="FF:FF:FF:FF:FF:FF" />
      <View style={styles.broadcastRow}>
        <Endpoint label="SOURCE / P1" />
        <View style={styles.broadcastSwitch}>
          <Endpoint label="SWITCH" type="switch" />
          <Text variant="technical" style={styles.floodLabel}>FLOOD</Text>
        </View>
        <View style={styles.receivers}>
          <Endpoint label="P2" />
          <Endpoint label="P3" />
        </View>
      </View>
      <Text variant="technical" style={styles.caption}>SEND THROUGH EVERY OTHER ACTIVE PORT</Text>
    </View>
  );
}

export function SwitchingLessonIllustration({ type }: { type: SwitchingIllustration }) {
  return (
    <View accessible accessibilityLabel={educationalIllustrations[type].accessibilityLabel} style={styles.card}>
      {type === 'mac-address' ? <MacAddressGraphic /> : null}
      {type === 'mac-learning' ? <LearningGraphic /> : null}
      {type === 'switch-forwarding' ? <ForwardingGraphic /> : null}
      {type === 'broadcast' ? <BroadcastGraphic /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 184, padding: Space.lg, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  centeredGraphic: { alignItems: 'stretch', gap: Space.md },
  endpoint: { minWidth: 64, alignItems: 'center', gap: 2 },
  endpointLabel: { color: Palette.text, fontFamily: Fonts.medium, textAlign: 'center' },
  addressPlate: { alignItems: 'center', padding: Space.md, backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.accent },
  smallLabel: { color: Palette.textMuted, fontFamily: Fonts.medium },
  address: { color: Palette.white, fontFamily: Fonts.semibold, marginTop: Space.xs, textAlign: 'center' },
  byteRow: { flexDirection: 'row' },
  byteCell: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surfaceRaised },
  byteText: { color: Palette.orange, fontFamily: Fonts.medium },
  deviceFlow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flowPath: { flex: 1, alignItems: 'stretch', paddingHorizontal: Space.xs },
  flowLabel: { color: Palette.accentBright, fontFamily: Fonts.medium, textAlign: 'center' },
  signalLine: { height: 2, marginTop: Space.xs, backgroundColor: Palette.accent },
  table: { backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.border },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: Space.xs, borderBottomWidth: 1, borderBottomColor: Palette.border },
  tableHeaderText: { color: Palette.textMuted, fontFamily: Fonts.medium },
  tableRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.sm },
  tableValue: { flexShrink: 1, color: Palette.text },
  portValue: { color: Palette.green, fontFamily: Fonts.semibold },
  caption: { color: Palette.textMuted, fontFamily: Fonts.medium, textAlign: 'center' },
  decisionRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', padding: Space.sm, backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.border },
  decisionRowActive: { borderColor: Palette.green },
  decisionCopy: { flex: 1, minWidth: 0 },
  decisionDestination: { color: Palette.text, marginTop: 2 },
  decisionResult: { flexShrink: 1, color: Palette.textMuted, fontFamily: Fonts.medium, textAlign: 'right' },
  decisionResultActive: { color: Palette.green },
  broadcastRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  broadcastSwitch: { flex: 1, alignItems: 'center' },
  floodLabel: { color: Palette.orange, fontFamily: Fonts.medium },
  receivers: { gap: Space.sm },
});
