import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { chapters } from '@/content/chapters';
import { canAccessChapter } from '@/core/account/access';
import { canOpenChapter } from '@/core/learning/course-access';
import { buildLearningSearchIndex, searchLearning, type LearningSearchEntry } from '@/core/learning/search-learning';
import { useAuth } from '@/features/account/auth-context';
import { ActionCard } from '@/shared/components/action-card';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { AppRoutes, workshopLessonRoute, workshopRoute } from '@/shared/routes';
import { Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';
import { useWorkshopStore } from '@/store/use-workshop-store';

export default function SearchScreen() {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  const { hasContentAccess, presentationActive, testProEnabled } = useAuth();
  const progress = useGameStore();
  const saved = useGameStore((state) => state.savedLearningItems);
  const library = useWorkshopStore((state) => state.library);
  const [query, setQuery] = useState('');
  const accessible = useMemo(() => chapters.filter((chapter) => canAccessChapter(chapter.id, hasContentAccess) && canOpenChapter(chapter, progress, presentationActive || testProEnabled)), [hasContentAccess, presentationActive, progress, testProEnabled]);
  const accessibleIds = useMemo(() => new Set(accessible.map((chapter) => chapter.id)), [accessible]);
  const safeSaved = useMemo(() => Object.fromEntries(Object.entries(saved).filter(([, item]) => item.targetType === 'cli-command' ? hasContentAccess : accessibleIds.has(item.chapterId))), [accessibleIds, hasContentAccess, saved]);
  const entries = useMemo(() => buildLearningSearchIndex(accessible, library, safeSaved, hasContentAccess), [accessible, hasContentAccess, library, safeSaved]);
  const results = useMemo(() => searchLearning(entries, query), [entries, query]);
  const open = (entry: LearningSearchEntry) => {
    if (entry.kind === 'lesson' || entry.kind === 'saved-lesson') router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: entry.targetId, ...(entry.sectionIndex === undefined ? {} : { searchSection: String(entry.sectionIndex) }) } });
    else if (entry.kind === 'flashcard' || entry.kind === 'saved-flashcard') router.push({ pathname: '/flashcards/[chapterId]', params: { chapterId: entry.targetId } });
    else if (entry.kind === 'workshop-lesson') router.push(workshopLessonRoute(entry.classId!, entry.targetId));
    else if (entry.kind === 'workshop-flashcard') router.push(workshopRoute(entry.classId!));
    else router.push(AppRoutes.sandbox);
  };
  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to main menu', icon: 'arrow-left', label: 'BACK / MENU', onPress: () => router.back() }} />}>
    <Text variant="label" style={styles.eyebrow}>OFFLINE REFERENCE</Text>
    <Text variant="screenTitle">SEARCH LEARNING</Text>
    <Text variant="bodySmall" style={styles.description}>Find lessons, concepts, flashcards, class material, and saved commands available on this device.</Text>
    <TextInput accessibilityLabel="Search learning material" autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} placeholder="Search a concept or command" placeholderTextColor={colors.textMuted} style={styles.input} value={query} />
    {query.trim() ? <Text accessibilityLiveRegion="polite" variant="technical" style={styles.count}>{results.length} RESULTS{results.length === 40 ? ' / SHOWING FIRST 40' : ''}</Text> : null}
    <View style={styles.results}>{results.map((entry) => <ActionCard detail={entry.context} icon={entry.kind.includes('flashcard') ? 'flashcards' : entry.kind === 'command' ? 'configure' : 'lesson'} key={entry.id} onPress={() => open(entry)} priority="utility" status={entry.kind.replace('-', ' ').toUpperCase()} title={entry.title} />)}</View>
    {query.trim() && !results.length ? <Text variant="bodySmall" style={styles.description}>No accessible material matches this search. Try a shorter term.</Text> : null}
  </Screen>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  eyebrow: { color: colors.orange, marginTop: Space.lg, marginBottom: Space.sm },
  description: { color: colors.textMuted, marginTop: Space.md },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: Space.md, marginTop: Space.xl },
  count: { color: colors.textMuted, marginTop: Space.lg },
  results: { gap: Space.sm, marginTop: Space.md, paddingBottom: Space.xl },
});
