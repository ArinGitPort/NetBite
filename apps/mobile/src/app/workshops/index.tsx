import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fetchWorkshopLibrary } from '@/core/workshops/workshop-service';
import { prepareWorkshopLibraryAssets } from '@/core/workshops/workshop-assets';
import { useAuth } from '@/features/account/auth-context';
import { ActionCard } from '@/shared/components/action-card';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { AppRoutes, workshopLessonRoute, workshopRoute } from '@/shared/routes';
import { Palette, Space } from '@/shared/theme';
import { useWorkshopStore } from '@/store/use-workshop-store';

export default function MyClassesScreen() {
  const { status, accountRole } = useAuth();
  const library = useWorkshopStore((state) => state.library);
  const lastUpdatedAt = useWorkshopStore((state) => state.lastUpdatedAt);
  const replaceLibrary = useWorkshopStore((state) => state.replaceLibrary);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string>();
  const refresh = useCallback(async () => {
    if (status !== 'authenticated') return;
    setRefreshing(true); setMessage(undefined);
    try {
      const nextLibrary = await fetchWorkshopLibrary();
      const nextAssets = await prepareWorkshopLibraryAssets(nextLibrary, useWorkshopStore.getState().assetUris);
      replaceLibrary(nextLibrary, nextAssets);
    }
    catch { setMessage(library.length ? 'Could not refresh classes. Your downloaded lessons remain available.' : 'Connect to the internet and try again to download your classes.'); }
    finally { setRefreshing(false); }
  }, [library.length, replaceLibrary, status]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  const saved = library.flatMap((entry) => entry.savedLessonIds.map((lessonId) => ({ entry, lesson: entry.manifest.lessons.find((lesson) => lesson.id === lessonId) }))).filter((item) => item.lesson);
  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to main menu', icon: 'arrow-left', label: 'BACK / MENU', onPress: () => router.replace(AppRoutes.menu) }} status={library.length ? 'AVAILABLE OFFLINE' : 'PRIVATE CLASSES'} />}>
    <Text variant="label" style={styles.eyebrow}>STUDENT LIBRARY</Text><Text variant="screenTitle">MY CLASSES</Text><Text variant="body" style={styles.copy}>Join a private class from your instructor, study published lessons offline, and submit graded work when connected.</Text>
    {status !== 'authenticated' ? <View style={styles.notice}><Text variant="sectionHeading">SIGN IN REQUIRED</Text><Text variant="bodySmall">A signed-in account keeps enrollment and graded submissions connected to the correct student.</Text><AppButton label="Sign in" onPress={() => router.push(AppRoutes.auth)} /></View> : <View style={styles.actions}><AppButton label="Join with class code" onPress={() => router.push(AppRoutes.workshopJoin)} /><AppButton label={refreshing ? 'Refreshing classes' : 'Refresh classes'} loading={refreshing} disabled={refreshing} variant="secondary" onPress={() => void refresh()} /></View>}
    {message ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.warning}>{message}</Text> : null}
    {accountRole === 'instructor' ? <ActionCard icon="account" priority="utility" status="INSTRUCTOR TOOLS" title="MONITOR & SHARE" detail="Preview workshops and share class codes from this device." onPress={() => router.push(AppRoutes.instructor)} /> : null}
    {status === 'authenticated' && accountRole === 'student' ? <ActionCard icon="account" priority="utility" status="TEACH WITH NETBITE" title="REQUEST INSTRUCTOR ACCESS" detail="Verified instructors can create private workshops for their students." onPress={() => router.push(AppRoutes.instructorRequest)} /> : null}
    <Text variant="label" style={styles.section}>ENROLLED CLASSES</Text><View style={styles.list}>{library.map((entry) => <ActionCard key={entry.classId} icon="learn" status={`${entry.manifest.lessons.length} LESSONS / VERSION ${entry.manifest.version}`} title={entry.manifest.title} detail={`${entry.manifest.instructorName} · ${entry.manifest.description}`} badge={entry.manifest.archived ? 'ARCHIVED' : undefined} onPress={() => router.push(workshopRoute(entry.classId))} />)}</View>
    {!library.length && status === 'authenticated' ? <View style={styles.empty}><Text variant="sectionHeading">NO CLASSES YET</Text><Text variant="bodySmall">Ask your instructor for a class code, join link, or QR code.</Text></View> : null}
    {saved.length ? <><Text variant="label" style={styles.section}>SAVED LESSONS</Text><View style={styles.list}>{saved.map(({ entry, lesson }) => <ActionCard key={`${entry.classId}-${lesson!.id}`} icon="saved" status={entry.manifest.title.toUpperCase()} title={lesson!.title} detail={`Saved from version ${entry.manifest.version} for offline study.`} onPress={() => router.push(workshopLessonRoute(entry.classId, lesson!.id))} />)}</View></> : null}
    {lastUpdatedAt ? <Text variant="technical" style={styles.updated}>Last refreshed {new Date(lastUpdatedAt).toLocaleString()}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({ eyebrow: { color: Palette.orange }, copy: { color: Palette.textMuted, marginTop: Space.sm, marginBottom: Space.lg }, actions: { gap: Space.sm, marginBottom: Space.md }, notice: { gap: Space.md, borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.orangeSoft, padding: Space.lg }, warning: { color: Palette.orange, marginVertical: Space.md }, section: { color: Palette.green, marginTop: Space.xl, marginBottom: Space.sm }, list: { gap: Space.md }, empty: { borderWidth: 1, borderColor: Palette.border, padding: Space.xl, gap: Space.sm }, updated: { color: Palette.textMuted, textAlign: 'center', marginTop: Space.xl } });
