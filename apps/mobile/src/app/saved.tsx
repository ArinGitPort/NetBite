import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { chapters } from '@/content/chapters';
import { getCourse } from '@/content/courses';
import { canAccessChapter } from '@/core/account/access';
import type { SavedLearningItem } from '@/core/learning/adaptive-learning';
import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { SemanticIcon, type SemanticIconName } from '@/shared/components/semantic-icon';
import { Text } from '@/shared/components/console-text';
import { navigateOnce, returnToLearningPath } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';

function describeSavedItem(item: SavedLearningItem) {
  const chapter = chapters.find((candidate) => candidate.id === item.chapterId);
  const course = getCourse(chapter?.courseId);
  const source = chapter ? `${course?.shortTitle.toUpperCase() ?? 'COURSE'} / CHAPTER ${chapter.numberLabel}` : 'NETWORK SANDBOX';
  if (item.targetType === 'lesson') {
    const index = chapter?.lessons.findIndex((lesson) => lesson.id === item.targetId) ?? -1;
    return { icon: 'lesson' as SemanticIconName, source, location: index >= 0 ? `LESSON ${index + 1} OF ${chapter?.lessons.length}` : 'LESSON', context: chapter?.title ?? 'Saved lesson', openLabel: 'Open lesson' };
  }
  if (item.targetType === 'flashcard') {
    const index = chapter?.flashcards.findIndex((card) => card.id === item.targetId) ?? -1;
    return { icon: 'flashcards' as SemanticIconName, source, location: index >= 0 ? `FLASHCARD ${index + 1} OF ${chapter?.flashcards.length}` : 'FLASHCARD', context: chapter?.title ?? 'Active-recall deck', openLabel: 'Open flashcards' };
  }
  return { icon: 'configure' as SemanticIconName, source: 'NETWORK SANDBOX', location: 'CLI COMMAND', context: 'Reusable command reference', openLabel: 'Open Sandbox' };
}

export default function SavedScreen() {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { hasContentAccess } = useAuth();
  const items = useGameStore((state) => state.savedLearningItems);
  const removeItem = useGameStore((state) => state.removeLearningItem);
  const clearItems = useGameStore((state) => state.clearSavedLearningItems);
  const [removeKey, setRemoveKey] = useState<string>();
  const [clearVisible, setClearVisible] = useState(false);
  const active = Object.values(items).filter((item) => !item.deletedAt && item.targetType !== 'illustration').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const itemLocked = (item: SavedLearningItem) => item.targetType === 'cli-command' ? !hasContentAccess : !canAccessChapter(item.chapterId, hasContentAccess);

  const openItem = (item: SavedLearningItem) => {
    if (itemLocked(item)) { navigateOnce(AppRoutes.pro); return; }
    if (item.targetType === 'lesson') navigateOnce({ pathname: '/lesson/[lessonId]', params: { lessonId: item.targetId } });
    else if (item.targetType === 'flashcard') navigateOnce({ pathname: '/flashcards/[chapterId]', params: { chapterId: item.chapterId } });
    else navigateOnce(AppRoutes.sandbox);
  };

  const requestRemove = (item: SavedLearningItem) => setRemoveKey(item.key);
  const selected = removeKey ? items[removeKey] : undefined;

  return <Screen header={<PageHeader
    leading={{ accessibilityLabel: 'Back to progress and review', icon: 'arrow-left', label: 'BACK / PROGRESS', onPress: () => navigateOnce(AppRoutes.progress) }}
    trailingContent={active.length ? <IconButton accessibilityHint="Opens the protected option to clear all bookmarks." accessibilityLabel="Manage saved bookmarks" label="MANAGE" onPress={() => setClearVisible(true)} semanticIcon="more" /> : null}
  />}>
    <Text variant="label" style={styles.eyebrow}>PERSONAL REFERENCE</Text><Text variant="screenTitle" style={styles.title}>SAVED LEARNING</Text>
    {active.length ? active.map((item) => {
      const description = describeSavedItem(item);
      return <View key={item.key} style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.iconPlate}><SemanticIcon color={colors.orange} name={description.icon} size={24} /></View>
        <View style={styles.cardCopy}><Text variant="technical" style={styles.source}>{description.source}</Text><Text variant="sectionHeading" style={styles.itemTitle}>{item.title}</Text><Text variant="bodySmall" style={styles.context}>{description.context}</Text></View>
      </View>
      <View style={styles.meta}><Text variant="label" style={styles.location}>{description.location}</Text>{itemLocked(item) ? <Text variant="technical" style={styles.warning}>PRO SOURCE LOCKED</Text> : null}</View>
      <View style={styles.actions}><AppButton label={description.openLabel} trailingIcon="arrow-right" onPress={() => openItem(item)} /><AppButton accessibilityHint={`Requires confirmation before removing ${item.title}.`} label="Remove bookmark" variant="utility" onPress={() => requestRemove(item)} /></View>
    </View>;
    }) : <View style={styles.empty}><Text variant="sectionHeading" style={styles.itemTitle}>NOTHING SAVED YET</Text><Text variant="bodySmall" style={styles.muted}>Bookmark a lesson, flashcard, or CLI reference for quick access.</Text><AppButton label="Back to learning" onPress={returnToLearningPath} /></View>}
    <FeedbackModal visible={Boolean(selected)} tone="warning" eyebrow="REMOVE BOOKMARK" title={selected ? `Remove “${selected.title}”?` : 'Remove this bookmark?'} message="This removes it from Saved Learning. Your lesson completion and review progress will not change." secondaryAction={{ label: 'Keep bookmark', variant: 'secondary', onPress: () => setRemoveKey(undefined) }} primaryAction={{ label: 'Remove bookmark', variant: 'danger', onPress: () => { if (removeKey) removeItem(removeKey); setRemoveKey(undefined); } }} onRequestClose={() => setRemoveKey(undefined)} />
    <FeedbackModal visible={clearVisible} tone="warning" eyebrow="MANAGE SAVED LEARNING" title="Remove every bookmark?" message={`This clears ${active.length} saved ${active.length === 1 ? 'bookmark' : 'bookmarks'} only. Lesson completion, quiz results, and review progress remain.`} secondaryAction={{ label: 'Keep bookmarks', variant: 'secondary', onPress: () => setClearVisible(false) }} primaryAction={{ label: 'Clear all bookmarks', variant: 'danger', onPress: () => { clearItems(); setClearVisible(false); } }} onRequestClose={() => setClearVisible(false)} />
  </Screen>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  eyebrow: { color: colors.orange, marginTop: Space.xl }, title: { color: colors.text, fontFamily: Fonts.semibold, marginTop: Space.sm, marginBottom: Space.xl }, card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: Space.lg, gap: Space.md, marginBottom: Space.lg }, cardHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md }, iconPlate: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.orange, backgroundColor: colors.orangeSoft }, cardCopy: { minWidth: 0, flex: 1 }, source: { color: colors.orange, marginBottom: Space.xs }, itemTitle: { color: colors.text }, context: { color: colors.textMuted, marginTop: Space.xs }, meta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: Space.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Space.md }, location: { color: colors.green }, actions: { gap: Space.sm }, warning: { color: colors.danger }, muted: { color: colors.textMuted }, empty: { borderWidth: 1, borderColor: colors.border, padding: Space.xl, gap: Space.lg },
});
