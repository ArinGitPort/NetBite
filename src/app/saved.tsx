import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { canAccessChapter } from '@/core/account/access';
import type { SavedLearningItem } from '@/core/learning/adaptive-learning';
import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { Screen } from '@/shared/components/screen';
import { Text } from '@/shared/components/console-text';
import { navigateOnce, returnToLearningPath } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Space, Typography } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

export default function SavedScreen() {
  const { hasContentAccess } = useAuth();
  const items = useGameStore((state) => state.savedLearningItems);
  const saveItem = useGameStore((state) => state.saveLearningItem);
  const removeItem = useGameStore((state) => state.removeLearningItem);
  const clearItems = useGameStore((state) => state.clearSavedLearningItems);
  const [removeKey, setRemoveKey] = useState<string>();
  const [clearVisible, setClearVisible] = useState(false);
  const active = Object.values(items).filter((item) => !item.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const itemLocked = (item: SavedLearningItem) => item.targetType === 'cli-command' ? !hasContentAccess : !canAccessChapter(item.chapterId, hasContentAccess);

  const openItem = (item: SavedLearningItem) => {
    if (itemLocked(item)) { navigateOnce(AppRoutes.pro); return; }
    if (item.targetType === 'lesson') navigateOnce({ pathname: '/lesson/[lessonId]', params: { lessonId: item.targetId } });
    else if (item.targetType === 'illustration') navigateOnce({ pathname: '/lesson/[lessonId]', params: { lessonId: item.targetId.split(':')[0] } });
    else if (item.targetType === 'flashcard') navigateOnce({ pathname: '/flashcards/[chapterId]', params: { chapterId: item.chapterId } });
    else navigateOnce(AppRoutes.sandbox);
  };

  const requestRemove = (item: SavedLearningItem) => item.note.trim() ? setRemoveKey(item.key) : removeItem(item.key);
  const selected = removeKey ? items[removeKey] : undefined;

  return <Screen>
    <IconButton accessibilityLabel="Back to progress and review" icon="arrow-left" label="BACK / PROGRESS" onPress={() => navigateOnce(AppRoutes.progress)} />
    <Text variant="label" style={styles.eyebrow}>PERSONAL REFERENCE</Text><Text variant="screenTitle" style={styles.title}>SAVED LEARNING</Text>
    {active.length ? active.map((item) => <View key={item.key} style={styles.card}>
      <View style={styles.meta}><Text variant="label" style={styles.type}>{item.targetType.replace('-', ' ').toUpperCase()}</Text>{itemLocked(item) ? <Text variant="technical" style={styles.warning}>PRO SOURCE LOCKED</Text> : null}</View>
      <Text variant="sectionHeading" style={styles.itemTitle}>{item.title}</Text>
      <TextInput accessibilityLabel={`Personal note for ${item.title}`} maxLength={1000} multiline onChangeText={(note) => saveItem({ targetType: item.targetType, targetId: item.targetId, chapterId: item.chapterId, title: item.title, note })} placeholder="ADD A SHORT PERSONAL NOTE" placeholderTextColor={Palette.textMuted} selectionColor={Palette.orange} style={styles.note} value={item.note} />
      <Text variant="technical" style={styles.count}>{item.note.length}/1000</Text>
      <View style={styles.actions}><AppButton label="Open source" variant="secondary" onPress={() => openItem(item)} /><AppButton label="Remove saved item" variant="danger" onPress={() => requestRemove(item)} /></View>
    </View>) : <View style={styles.empty}><Text variant="sectionHeading" style={styles.itemTitle}>NOTHING SAVED YET</Text><Text variant="bodySmall" style={styles.muted}>Save a lesson, visual, flashcard, or CLI reference while learning.</Text><AppButton label="Back to learning" onPress={returnToLearningPath} /></View>}
    {active.length ? <View style={styles.dangerZone}><Text variant="label" style={styles.warning}>DESTRUCTIVE SAVED DATA</Text><AppButton label="Delete all saved items" variant="danger" onPress={() => setClearVisible(true)} /></View> : null}
    <FeedbackModal visible={Boolean(selected)} tone="warning" eyebrow="PERSONAL NOTE ATTACHED" title="Remove this saved item?" message="The bookmark and its personal note will be deleted." secondaryAction={{ label: 'Keep item', variant: 'secondary', onPress: () => setRemoveKey(undefined) }} primaryAction={{ label: 'Remove item', variant: 'danger', onPress: () => { if (removeKey) removeItem(removeKey); setRemoveKey(undefined); } }} onRequestClose={() => setRemoveKey(undefined)} />
    <FeedbackModal visible={clearVisible} tone="warning" eyebrow="PERMANENT LOCAL ACTION" title="Delete every saved item?" message="All bookmarks and personal notes will be removed. Learning completion and quiz results remain." secondaryAction={{ label: 'Keep saved items', variant: 'secondary', onPress: () => setClearVisible(false) }} primaryAction={{ label: 'Delete saved items', variant: 'danger', onPress: () => { clearItems(); setClearVisible(false); } }} onRequestClose={() => setClearVisible(false)} />
  </Screen>;
}

const styles = StyleSheet.create({
  eyebrow: { color: Palette.orange, marginTop: Space.xl }, title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.sm, marginBottom: Space.xl }, card: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg, gap: Space.sm, marginBottom: Space.lg }, meta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm }, type: { color: Palette.accentBright }, itemTitle: { color: Palette.text }, note: { minHeight: 112, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background, color: Palette.white, padding: Space.md, textAlignVertical: 'top', fontFamily: Fonts.regular, ...Typography.bodySmall }, count: { color: Palette.textMuted, textAlign: 'right' }, actions: { gap: Space.sm }, warning: { color: Palette.danger }, muted: { color: Palette.textMuted }, empty: { borderWidth: 1, borderColor: Palette.border, padding: Space.xl, gap: Space.lg }, dangerZone: { borderWidth: 1, borderColor: Palette.danger, padding: Space.lg, gap: Space.md, marginTop: Space.xl },
});
