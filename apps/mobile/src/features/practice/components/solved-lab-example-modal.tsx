import { useMemo, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { SolvedTopologyDiagram } from '@/features/practice/components/solved-topology-diagram';
import { buildSolvedLabExample, getSolvedLabExample, type SolvedExampleRecord, type SolvedExampleSection, type SolvedLabExampleSnapshot } from '@/features/practice/solved-lab-examples';
import { Text } from '@/shared/components/console-text';
import { DisclosureSection } from '@/shared/components/disclosure-section';
import { LinkConnectionRecord } from '@/shared/components/link-connection-record';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { NumberedStepRow, StatusRow } from '@/shared/components/status-row';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export function SolvedLabExampleModal({ labId, visible, onClose }: { labId: string; visible: boolean; onClose: () => void }) {
  const styles = useThemeStyles(createStyles);
  const result = useMemo(() => {
    if (!visible) return undefined;
    try { return { snapshot: buildSolvedLabExample(labId) }; }
    catch (error) { return { error: error instanceof Error ? error.message : 'The example could not be built.' }; }
  }, [labId, visible]);
  const definition = getSolvedLabExample(labId);
  return <Modal animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" visible={visible}>
    <Screen header={<PageHeader leading={{ icon: 'close', label: 'RETURN / LAB', accessibilityLabel: 'Return to my lab', accessibilityHint: 'Closes the read-only completed example without changing your lab', onPress: onClose }} />}>
      <View accessibilityLabel={definition?.accessibilityDescription} style={styles.page}>
        <Text variant="label" style={styles.orange}>COMPLETED EXAMPLE / READ-ONLY</Text>
        {result?.snapshot ? <SolvedContent snapshot={result.snapshot} /> : <Unavailable detail={result?.error} />}
      </View>
    </Screen>
  </Modal>;
}

function SolvedContent({ snapshot }: { snapshot: SolvedLabExampleSnapshot }) {
  const styles = useThemeStyles(createStyles);
  const [selectedNodeId, setSelectedNodeId] = useState(snapshot.topology?.nodes[0]?.id);
  const selectedNode = snapshot.topology?.nodes.find((node) => node.id === selectedNodeId);
  return <>
    <View style={styles.intro}><Text variant="screenTitle">{snapshot.title}</Text><Text variant="body">{snapshot.goal}</Text><Text variant="bodySmall" style={styles.muted}>This completed copy is separate from your lab. It cannot change your configuration, commands, hints, evidence, or completion.</Text></View>
    <View style={styles.studyGuide}><Text variant="sectionHeading" style={styles.green}>HOW TO STUDY THIS EXAMPLE</Text><NumberedStepRow number={1}>Inspect the completed topology and its connections.</NumberedStepRow><NumberedStepRow number={2}>Select one device and compare its configuration.</NumberedStepRow><NumberedStepRow number={3}>Open commands and verification evidence when you are ready.</NumberedStepRow></View>
    {snapshot.topology ? <View style={styles.panel}><Text variant="sectionHeading">COMPLETED TOPOLOGY</Text><Text variant="bodySmall" style={styles.muted}>{snapshot.topology.description}</Text><SolvedTopologyDiagram topology={snapshot.topology} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />{selectedNode ? <Text accessibilityLiveRegion="polite" variant="technical" style={styles.selection}>SELECTED / {selectedNode.label}</Text> : null}<DisclosureSection title="CONNECTION DETAILS" summary={`${snapshot.topology.links.length} connection${snapshot.topology.links.length === 1 ? '' : 's'}`}>
      {snapshot.topology.links.map((link, index) => { const a = snapshot.topology?.nodes.find((node) => node.id === link.from); const b = snapshot.topology?.nodes.find((node) => node.id === link.to); return <LinkConnectionRecord key={link.id} index={index + 1} a={{ deviceName: a?.label ?? link.from, interfaceName: link.fromInterface ?? connectionPort(link.label, 'a') }} b={{ deviceName: b?.label ?? link.to, interfaceName: link.toInterface ?? connectionPort(link.label, 'b') }} context={link.context} state={link.state ?? 'UP'} />; })}
    </DisclosureSection></View> : null}
    {snapshot.family === 'cli' ? <View style={styles.addressingNote}><Text variant="label" style={styles.green}>ADDRESSING NOTE</Text><Text variant="bodySmall">A prefix length and subnet mask describe the same network boundary. In this example, /24 means 255.255.255.0 and /30 means 255.255.255.252.</Text></View> : null}
    {snapshot.sections.map((entry) => <SolvedSection key={entry.id} entry={entry} selectedDeviceLabel={selectedNode?.label} deviceLabels={snapshot.topology?.nodes.map((node) => node.label) ?? []} />)}
    <DisclosureSection defaultExpanded title="WHY THIS WORKS" summary="Observation, networking rule, proof, and next check."><Reason label="OBSERVATION" value={snapshot.explanation.observation} /><Reason label="RULE" value={snapshot.explanation.rule} /><Reason label="WHAT THIS PROVES" value={snapshot.explanation.proves} /><Reason label="NEXT CHECK" value={snapshot.explanation.nextCheck} /></DisclosureSection>
  </>;
}

function SolvedSection({ entry, selectedDeviceLabel, deviceLabels }: { entry: SolvedExampleSection; selectedDeviceLabel?: string; deviceLabels: string[] }) {
  const styles = useThemeStyles(createStyles);
  const rows = entry.kind === 'configuration' && selectedDeviceLabel ? rowsForDevice(entry.rows, selectedDeviceLabel, deviceLabels) : entry.rows;
  const records = entry.records?.filter((record) => !selectedDeviceLabel || !record.deviceLabel || record.deviceLabel === selectedDeviceLabel);
  const isVerification = entry.kind === 'results';
  const summary = entry.kind === 'commands'
    ? `${entry.rows.length} transcript lines / open when ready`
    : entry.kind === 'configuration' && selectedDeviceLabel
      ? `Showing ${selectedDeviceLabel}`
      : `${entry.records?.length ?? entry.rows.length} record${(entry.records?.length ?? entry.rows.length) === 1 ? '' : 's'}`;
  return <DisclosureSection defaultExpanded={entry.kind === 'configuration' || isVerification} title={entry.title} summary={summary}>
    {entry.kind === 'configuration' && records?.length ? <View style={styles.records}>{records.map((record) => <StructuredRecord key={record.id} record={record} />)}</View> : null}
    {entry.kind === 'commands' && entry.commandGroups?.length ? <View style={styles.records}>{entry.commandGroups.map((group) => <View key={group.deviceLabel} style={styles.commandGroup}><Text variant="label" style={styles.orange}>{group.deviceLabel}</Text>{group.explanations?.length ? <View style={styles.records}>{group.explanations.map((record) => <StructuredRecord key={record.id} record={record} />)}</View> : null}<View style={styles.rows}>{group.lines.map((line, index) => <View key={`${group.deviceLabel}-${index}`} style={[styles.row, styles.commandRow]}><Text selectable variant="technical">{line}</Text></View>)}</View></View>)}</View> : null}
    {(!entry.records || entry.kind !== 'configuration') && (!entry.commandGroups || entry.kind !== 'commands') ? <View style={styles.rows}>{rows.map((row, index) => isVerification ? <StatusRow key={`${entry.id}-${index}`} label={row} state="complete" showStateLabel={false} /> : <View key={`${entry.id}-${index}`} style={[styles.row, entry.kind === 'commands' && styles.commandRow]}><Text selectable variant={entry.kind === 'commands' ? 'technical' : 'bodySmall'}>{row}</Text></View>)}</View> : null}
  </DisclosureSection>;
}

function StructuredRecord({ record }: { record: SolvedExampleRecord }) {
  const styles = useThemeStyles(createStyles);
  return <View style={styles.structuredRecord}>
    <Text variant="label" style={styles.recordTitle}>{record.title}</Text>
    {record.fields.filter((field) => field.label !== 'Device').map((field) => <View key={`${record.id}-${field.label}`} style={styles.fieldRow}><Text variant="bodySmall" style={styles.fieldLabel}>{field.label}</Text><Text selectable variant="technical" style={styles.fieldValue}>{field.value}</Text></View>)}
  </View>;
}

function rowsForDevice(rows: string[], selected: string, deviceLabels: string[]) {
  const start = rows.findIndex((row) => row.toUpperCase().startsWith(`${selected.toUpperCase()} /`));
  if (start < 0) return rows;
  const next = rows.findIndex((row, index) => index > start && deviceLabels.some((label) => row.toUpperCase().startsWith(`${label.toUpperCase()} /`)));
  return rows.slice(start, next < 0 ? undefined : next);
}

function connectionPort(label: string | undefined, endpoint: 'a' | 'b') {
  if (!label) return 'INTERFACE';
  const parts = label.replaceAll('—', '-').split(/\s+-\s+|\s+↔\s+/).map((part) => part.trim());
  return (endpoint === 'a' ? parts[0] : parts[1]) || 'INTERFACE';
}
function Reason({ label, value }: { label: string; value: string }) { const styles = useThemeStyles(createStyles); return <View style={styles.reason}><Text variant="label" style={styles.orange}>{label}</Text><Text selectable variant="bodySmall">{value}</Text></View>; }
function Unavailable({ detail }: { detail?: string }) { const styles = useThemeStyles(createStyles); return <View style={styles.panel}><Text variant="sectionHeading">EXAMPLE TEMPORARILY UNAVAILABLE</Text><Text variant="bodySmall" style={styles.muted}>Your lab is safe and unchanged. Return to the lab and try this example again later.</Text>{__DEV__ && detail ? <Text variant="technical" style={styles.muted}>{detail}</Text> : null}</View>; }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  page: { gap: Space.lg }, intro: { gap: Space.sm }, studyGuide: { minWidth: 0, gap: Space.md, padding: Space.lg, borderLeftWidth: 3, borderLeftColor: colors.green, backgroundColor: colors.greenSoft },
  panel: { minWidth: 0, gap: Space.md, padding: Space.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, selection: { color: colors.orange },
  addressingNote: { minWidth: 0, gap: Space.xs, padding: Space.md, borderLeftWidth: 3, borderLeftColor: colors.green, backgroundColor: colors.greenSoft },
  rows: { minWidth: 0, gap: 0 }, row: { minWidth: 0, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: colors.border }, commandRow: { backgroundColor: colors.background, paddingHorizontal: Space.sm },
  records: { minWidth: 0, gap: Space.sm }, structuredRecord: { minWidth: 0, gap: Space.xs, padding: Space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }, recordTitle: { color: colors.green, fontFamily: Fonts.semibold }, fieldRow: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: Space.sm, paddingVertical: 2 }, fieldLabel: { minWidth: 116, flexShrink: 0, color: colors.textMuted }, fieldValue: { minWidth: 0, flex: 1, color: colors.text }, commandGroup: { minWidth: 0, gap: Space.sm },
  reason: { minWidth: 0, gap: Space.xs }, muted: { color: colors.textMuted }, orange: { color: colors.orange, fontFamily: Fonts.semibold }, green: { color: colors.green, fontFamily: Fonts.semibold },
});
