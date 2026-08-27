import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { fetchInstructorClasses, fetchInstructorClassSummary } from '@/core/workshops/workshop-service';
import type { GradebookSummary } from '@/core/workshops/types';
import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { AppRoutes } from '@/shared/routes';
import { Palette, Space } from '@/shared/theme';

type InstructorClass = Awaited<ReturnType<typeof fetchInstructorClasses>>[number];

export default function InstructorMobileScreen() {
  const { accountRole } = useAuth(); const [classes, setClasses] = useState<InstructorClass[]>([]); const [loading, setLoading] = useState(false); const [message, setMessage] = useState<string>(); const [summaries, setSummaries] = useState<Record<string, GradebookSummary>>({}); const [summaryLoading, setSummaryLoading] = useState<string>();
  const load = useCallback(async () => { setLoading(true); setMessage(undefined); try { setClasses(await fetchInstructorClasses()); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Classes could not be refreshed.'); } finally { setLoading(false); } }, []);
  useEffect(() => {
    if (accountRole !== 'instructor') return;
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [accountRole, load]);
  if (accountRole !== 'instructor') return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to My Classes', icon: 'arrow-left', label: 'BACK / CLASSES', onPress: () => router.replace(AppRoutes.workshops) }} />}><Text variant="screenTitle">INSTRUCTOR ACCESS REQUIRED</Text><Text variant="body">An administrator must approve the signed-in account before instructor tools become available.</Text></Screen>;
  const shareClass = async (item: InstructorClass) => { const url = Linking.createURL('/workshops/join', { queryParams: { code: item.join_code } }); await Share.share({ title: item.title, message: `Join ${item.title} in NetBite with code ${item.join_code}: ${url}` }); };
  const loadSummary = async (classId: string) => { setSummaryLoading(classId); setMessage(undefined); try { const summary = await fetchInstructorClassSummary(classId); setSummaries((value) => ({ ...value, [classId]: summary })); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'The class summary could not be refreshed.'); } finally { setSummaryLoading(undefined); } };
  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to My Classes', icon: 'arrow-left', label: 'BACK / CLASSES', onPress: () => router.replace(AppRoutes.workshops) }} status="INSTRUCTOR" />}>
    <Text variant="label" style={styles.eyebrow}>MOBILE INSTRUCTOR TOOLS</Text><Text variant="screenTitle">MONITOR & SHARE</Text><Text variant="body" style={styles.copy}>Preview classes and share enrollment details here. Create and edit workshop content in the secure instructor website.</Text><AppButton label={loading ? 'Refreshing classes' : 'Refresh classes'} loading={loading} disabled={loading} variant="secondary" onPress={() => void load()} />{message ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.warning}>{message}</Text> : null}
    <View style={styles.list}>{classes.map((item) => { const summary = summaries[item.id]; return <View key={item.id} style={styles.card}><View style={styles.heading}><View style={styles.title}><Text variant="sectionHeading">{item.title.toUpperCase()}</Text><Text variant="technical" style={styles.muted}>{item.archived ? 'ARCHIVED / NO NEW ENROLLMENT' : 'OPEN FOR ENROLLMENT'}</Text></View><View style={styles.code}><Text variant="technical">CLASS CODE</Text><Text variant="sectionHeading" style={styles.codeValue}>{item.join_code}</Text></View></View>{summary ? <View style={styles.summary}><SummaryValue label="ENROLLED" value={summary.enrolled} /><SummaryValue label="SUBMITTED" value={summary.submitted} /><SummaryValue label="MISSING" value={summary.missing} /><SummaryValue label="LATE" value={summary.late} /><SummaryValue label="AVERAGE" value={`${summary.average.toFixed(0)}%`} /><SummaryValue label="PASS RATE" value={`${summary.passRate.toFixed(0)}%`} /></View> : null}<AppButton label={summaryLoading === item.id ? 'Loading class summary' : summary ? 'Refresh class summary' : 'View class summary'} loading={summaryLoading === item.id} disabled={Boolean(summaryLoading)} variant="secondary" onPress={() => void loadSummary(item.id)} /><AppButton label="Share class code and link" variant="secondary" onPress={() => void shareClass(item)} /></View>; })}</View>
    {!classes.length && !loading ? <View style={styles.empty}><Text variant="sectionHeading">NO CLASSES YET</Text><Text variant="bodySmall">Publish a workshop and create a class from the instructor website.</Text></View> : null}
  </Screen>;
}
function SummaryValue({ label, value }: { label: string; value: string | number }) { return <View style={styles.summaryValue}><Text variant="technical" style={styles.muted}>{label}</Text><Text variant="sectionHeading">{value}</Text></View>; }
const styles = StyleSheet.create({ eyebrow: { color: Palette.orange }, copy: { color: Palette.textMuted, marginVertical: Space.md }, warning: { color: Palette.orange, marginTop: Space.md }, list: { gap: Space.md, marginTop: Space.xl }, card: { gap: Space.md, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg }, heading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.md }, title: { flex: 1, minWidth: 180 }, muted: { color: Palette.textMuted, marginTop: Space.xs }, code: { borderWidth: 1, borderColor: Palette.orange, padding: Space.sm, alignItems: 'center' }, codeValue: { color: Palette.orange }, summary: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, summaryValue: { minWidth: 92, flexGrow: 1, borderWidth: 1, borderColor: Palette.border, padding: Space.sm }, empty: { gap: Space.sm, borderWidth: 1, borderColor: Palette.border, padding: Space.xl, marginTop: Space.xl } });
