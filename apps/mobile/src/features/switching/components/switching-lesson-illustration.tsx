import { StyleSheet, View } from 'react-native';

import type { LessonIllustration } from '@/content/types';
import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { educationalIllustrations } from '@/features/lessons/educational-illustration-registry';
import { Text } from '@/shared/components/console-text';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

type SwitchingIllustration = Extract<
  LessonIllustration,
  'mac-address' | 'mac-learning' | 'switch-forwarding' | 'broadcast'
>;

const PC_A = '02:00:00:00:00:0A';
const PC_B = '02:00:00:00:00:0B';

function Endpoint({ label, type = 'pc' }: { label: string; type?: 'pc' | 'switch' }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.endpoint}>
      <DeviceGlyph type={type} size={48} />
      <Text variant="label" style={styles.endpointLabel}>{label}</Text>
    </View>
  );
}

function AddressPlate({ label, address }: { label: string; address: string }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.addressPlate}>
      <Text variant="technical" style={styles.smallLabel}>{label}</Text>
      <Text variant="bodySmall" style={styles.address}>{address}</Text>
    </View>
  );
}

function MacAddressGraphic() {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.centeredGraphic}>
      <Endpoint label="PC1 / NIC" />
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
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.centeredGraphic}>
      <View style={styles.deviceFlow}>
        <Endpoint label="PC1" />
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
  const styles = useThemeStyles(createStyles);
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
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.centeredGraphic}>
      <View style={styles.deviceFlow}>
        <Endpoint label="PC1 / P1" />
        <Endpoint label="SWITCH" type="switch" />
        <Endpoint label="PC2 / P2" />
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
  const styles = useThemeStyles(createStyles);
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
  const styles = useThemeStyles(createStyles);
  return (
    <View accessible accessibilityLabel={educationalIllustrations[type].accessibilityLabel} style={styles.card}>
      {type === 'mac-address' ? <MacAddressGraphic /> : null}
      {type === 'mac-learning' ? <LearningGraphic /> : null}
      {type === 'switch-forwarding' ? <ForwardingGraphic /> : null}
      {type === 'broadcast' ? <BroadcastGraphic /> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { minHeight: 184, padding: Space.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  centeredGraphic: { alignItems: 'stretch', gap: Space.md },
  endpoint: { minWidth: 64, alignItems: 'center', gap: 2 },
  endpointLabel: { color: colors.text, fontFamily: Fonts.medium, textAlign: 'center' },
  addressPlate: { alignItems: 'center', padding: Space.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.accent },
  smallLabel: { color: colors.textMuted, fontFamily: Fonts.medium },
  address: { color: colors.text, fontFamily: Fonts.semibold, marginTop: Space.xs, textAlign: 'center' },
  byteRow: { flexDirection: 'row' },
  byteCell: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  byteText: { color: colors.orange, fontFamily: Fonts.medium },
  deviceFlow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flowPath: { flex: 1, alignItems: 'stretch', paddingHorizontal: Space.xs },
  flowLabel: { color: colors.accentBright, fontFamily: Fonts.medium, textAlign: 'center' },
  signalLine: { height: 2, marginTop: Space.xs, backgroundColor: colors.accent },
  table: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: Space.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableHeaderText: { color: colors.textMuted, fontFamily: Fonts.medium },
  tableRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Space.sm },
  tableValue: { flexShrink: 1, color: colors.text },
  portValue: { color: colors.green, fontFamily: Fonts.semibold },
  caption: { color: colors.textMuted, fontFamily: Fonts.medium, textAlign: 'center' },
  decisionRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', padding: Space.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  decisionRowActive: { borderColor: colors.green },
  decisionCopy: { flex: 1, minWidth: 0 },
  decisionDestination: { color: colors.text, marginTop: 2 },
  decisionResult: { flexShrink: 1, color: colors.textMuted, fontFamily: Fonts.medium, textAlign: 'right' },
  decisionResultActive: { color: colors.green },
  broadcastRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  broadcastSwitch: { flex: 1, alignItems: 'center' },
  floodLabel: { color: colors.orange, fontFamily: Fonts.medium },
  receivers: { gap: Space.sm },
});
