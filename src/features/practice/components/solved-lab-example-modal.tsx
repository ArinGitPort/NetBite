import { Modal, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import { Image } from 'expo-image';

import { DeviceGlyph } from '@/features/devices/components/device-glyph';
import { buildSolvedLabExample, getSolvedLabExample } from '@/features/practice/solved-lab-examples';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { StatusRow } from '@/shared/components/status-row';
import { Fonts, Palette, Space } from '@/shared/theme';

export function SolvedLabExampleModal({ labId, visible, onClose }: { labId: string; visible: boolean; onClose: () => void }) {
  const result = useMemo(() => {
    if (!visible) return undefined;
    try { return { snapshot: buildSolvedLabExample(labId) }; }
    catch (error) { return { error: error instanceof Error ? error.message : 'The example could not be built.' }; }
  }, [labId, visible]);
  const definition = getSolvedLabExample(labId);

  return <Modal animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" visible={visible}>
    <Screen header={<PageHeader leading={{ icon: 'close', label: 'RETURN / LAB', accessibilityLabel: 'Return to my lab', accessibilityHint: 'Closes the read-only solved example without changing your lab', onPress: onClose }} />}>
      <View accessibilityLabel={definition?.accessibilityDescription} style={styles.page}>
        <Text variant="label" style={styles.orange}>EXACT SOLUTION / READ-ONLY</Text>
        {result?.snapshot ? <SolvedContent snapshot={result.snapshot} /> : <Unavailable detail={result?.error} />}
      </View>
    </Screen>
  </Modal>;
}

function SolvedContent({ snapshot }: { snapshot: NonNullable<ReturnType<typeof buildSolvedLabExample>> }) {
  return <>
    <View style={styles.intro}><Text variant="screenTitle">{snapshot.title}</Text><Text variant="body">{snapshot.goal}</Text><Text variant="bodySmall" style={styles.muted}>This example is separate from your lab. Inspecting it cannot change your configuration, transcript, hints, or completion.</Text></View>
    {snapshot.topology ? <View style={styles.panel}><Text variant="sectionHeading">COMPLETED TOPOLOGY</Text><Text variant="bodySmall" style={styles.muted}>{snapshot.topology.description}</Text><View style={styles.nodes}>{snapshot.topology.nodes.map((node) => <View key={node.id} style={styles.node}>{node.kind === 'server' ? <Image accessibilityIgnoresInvertColors contentFit="contain" source={require('@/assets/images/education/server-terminal-mobile.png')} style={styles.server} /> : <DeviceGlyph size={52} type={node.kind} />}<Text variant="label" style={styles.center}>{node.label}</Text>{node.detail ? <Text variant="technical" style={[styles.muted, styles.center]}>{node.detail}</Text> : null}</View>)}</View><View style={styles.links}>{snapshot.topology.links.map((link) => { const from = snapshot.topology?.nodes.find((node) => node.id === link.from)?.label ?? link.from; const to = snapshot.topology?.nodes.find((node) => node.id === link.to)?.label ?? link.to; return <StatusRow key={link.id} label={`${from} → ${to}`} value={link.label} state="complete" variant="bodySmall" />; })}</View></View> : null}
    {snapshot.sections.map((entry) => <View key={entry.id} style={styles.panel}><Text variant="sectionHeading">{entry.title}</Text><View style={styles.rows}>{entry.rows.map((row, index) => <View key={`${entry.id}-${index}`} style={[styles.row, entry.kind === 'commands' && styles.commandRow]}><Text variant={entry.kind === 'commands' ? 'technical' : 'bodySmall'} selectable>{row}</Text></View>)}</View></View>)}
    <View style={[styles.panel, styles.why]}><Text variant="sectionHeading" style={styles.green}>WHY THIS WORKS</Text><Reason label="OBSERVATION" value={snapshot.explanation.observation} /><Reason label="RULE" value={snapshot.explanation.rule} /><Reason label="WHAT THIS PROVES" value={snapshot.explanation.proves} /><Reason label="NEXT CHECK" value={snapshot.explanation.nextCheck} /></View>
  </>;
}

function Reason({ label, value }: { label: string; value: string }) { return <View style={styles.reason}><Text variant="label" style={styles.orange}>{label}</Text><Text variant="bodySmall" selectable>{value}</Text></View>; }
function Unavailable({ detail }: { detail?: string }) { return <View style={styles.panel}><Text variant="sectionHeading">EXAMPLE TEMPORARILY UNAVAILABLE</Text><Text variant="bodySmall" style={styles.muted}>Your lab is safe and unchanged. Return to the lab and try this example again later.</Text>{__DEV__ && detail ? <Text variant="technical" style={styles.muted}>{detail}</Text> : null}</View>; }

const styles = StyleSheet.create({
  page: { gap: Space.lg }, intro: { gap: Space.sm }, panel: { minWidth: 0, gap: Space.md, padding: Space.lg, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  nodes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Space.md }, node: { width: 124, minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: Space.xs, padding: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surfaceRaised },
  server: { width: 52, height: 52 },
  links: { gap: Space.xs }, rows: { gap: 0 }, row: { minWidth: 0, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Palette.border }, commandRow: { backgroundColor: Palette.background, paddingHorizontal: Space.sm },
  reason: { gap: Space.xs }, why: { borderLeftWidth: 3, borderLeftColor: Palette.green }, muted: { color: Palette.textMuted }, orange: { color: Palette.orange, fontFamily: Fonts.semibold }, green: { color: Palette.green, fontFamily: Fonts.semibold }, center: { textAlign: 'center' },
});
