import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { OperationsLabBriefing as OperationsLabBriefingDefinition } from '@/features/operations/operations-lab-definitions';
import { lessonRoute } from '@/shared/routes';
import { Text } from '@/shared/components/console-text';
import { StatusRow } from '@/shared/components/status-row';
import { Fonts, Palette, Space } from '@/shared/theme';
import { SolvedExampleLauncher } from '@/features/practice/components/solved-example-launcher';

export function OperationsLabBriefing({ labId, briefing, expanded, onToggle }: { labId: string; briefing: OperationsLabBriefingDefinition; expanded: boolean; onToggle: () => void }) {
  return <><View style={styles.shell}>
    <Pressable accessibilityHint="Opens a worked walkthrough of the lab setup" accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={styles.header}>
      <View style={styles.headerCopy}><Text variant="label" style={styles.orange}>LEARN THE SETUP</Text><Text variant="bodySmall" style={styles.copy}>{briefing.goal}</Text></View>
      <Text variant="label" style={styles.toggle}>{expanded ? 'HIDE' : 'OPEN'}</Text>
    </Pressable>
    {expanded ? <View style={styles.content}>
      <View style={styles.group}><Text variant="label" style={styles.green}>WHAT IS ALREADY SET</Text>{briefing.startingState.map((item) => <StatusRow key={item} label={item} state="complete" variant="bodySmall" showStateLabel={false} />)}</View>
      <View style={styles.example}><Text variant="label" style={styles.orange}>{briefing.workedExample.title}</Text>{briefing.workedExample.steps.map((step, index) => <View key={step} style={styles.step}><View style={styles.number}><Text variant="label" style={styles.numberText}>{index + 1}</Text></View><Text variant="bodySmall" style={styles.stepCopy}>{step}</Text></View>)}<Text variant="bodySmall" style={styles.result}>RESULT / {briefing.workedExample.result}</Text></View>
      <View style={styles.group}><Text variant="label" style={styles.green}>YOUR TASKS</Text>{briefing.taskChecklist.map((item, index) => <Text key={item} variant="bodySmall" style={styles.copy}>{index + 1}. {item}</Text>)}</View>
      {briefing.lessonIds.length ? <View style={styles.group}><Text variant="label" style={styles.green}>REVIEW THE METHOD</Text><View style={styles.lessonLinks}>{briefing.lessonIds.map((lessonId) => <Pressable key={lessonId} accessibilityRole="link" accessibilityHint="Returns to this lab when you leave the lesson" onPress={() => router.push(lessonRoute(lessonId, { fromLabId: labId }))} style={styles.lessonLink}><Text variant="label">OPEN {lessonId.replaceAll('-', ' ').toUpperCase()}</Text></Pressable>)}</View></View> : null}
    </View> : null}
  </View><SolvedExampleLauncher labId={labId} /></>;
}

const styles = StyleSheet.create({
  shell: { minWidth: 0, borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.surface, marginBottom: Space.md },
  header: { minHeight: 52, padding: Space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.md },
  headerCopy: { flex: 1, minWidth: 0, gap: Space.xs }, toggle: { color: Palette.text }, content: { borderTopWidth: 1, borderTopColor: Palette.border, padding: Space.md, gap: Space.lg },
  group: { minWidth: 0, gap: Space.sm }, example: { minWidth: 0, gap: Space.sm, padding: Space.md, borderLeftWidth: 3, borderLeftColor: Palette.orange, backgroundColor: Palette.surfaceRaised },
  step: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm }, number: { width: 28, height: 28, flexShrink: 0, borderWidth: 1, borderColor: Palette.orange, alignItems: 'center', justifyContent: 'center' }, numberText: { color: Palette.orange }, stepCopy: { flex: 1, minWidth: 0, color: Palette.text },
  result: { color: Palette.text, fontFamily: Fonts.medium, borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: Space.sm }, copy: { color: Palette.textMuted }, orange: { color: Palette.orange, fontFamily: Fonts.semibold }, green: { color: Palette.green, fontFamily: Fonts.semibold },
  lessonLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, lessonLink: { minHeight: 44, minWidth: 0, justifyContent: 'center', borderWidth: 1, borderColor: Palette.border, paddingHorizontal: Space.md, paddingVertical: Space.sm },
});
