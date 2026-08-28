import { StyleSheet, View } from 'react-native';

import { chapters } from '@/content/chapters';
import { getChapterProgress, getQuizMasteryScore, isQuizMastered } from '@/content/progress';
import { canAccessChapter } from '@/core/account/access';
import { getActiveReviewQueue } from '@/core/learning/adaptive-learning';
import { useAuth } from '@/features/account/auth-context';
import { ActionCard } from '@/shared/components/action-card';
import { PageHeader } from '@/shared/components/page-header';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { Text } from '@/shared/components/console-text';
import { navigateOnce, returnToLearningPath } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

export default function ProgressScreen() {
  const { hasContentAccess } = useAuth();
  const state = useGameStore();
  const accessible = new Set(chapters.filter((chapter) => canAccessChapter(chapter.id, hasContentAccess)).map((chapter) => chapter.id));
  const versions = Object.fromEntries(chapters.map((chapter) => [chapter.id, { quiz: chapter.contentVersion, flashcard: chapter.flashcardVersion, checkpoint: chapter.checkpointVersion ?? 1 }]));
  const reviewQueue = getActiveReviewQueue(state.reviewSignals, versions, accessible);
  const savedCount = Object.values(state.savedLearningItems).filter((item) => !item.deletedAt).length;
  const learningProgress = state;

  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to learning path', icon: 'arrow-left', label: 'BACK / LEARN', onPress: returnToLearningPath }} />}>
    <Text variant="label" style={styles.eyebrow}>LEARNING STATUS</Text>
    <Text variant="screenTitle" style={styles.title}>PROGRESS & REVIEW</Text>
    <ActionCard badge={`${reviewQueue.length} DUE`} detail="Retry missed scenarios and difficult recall cards without a score." icon="flashcards" priority={reviewQueue.length ? 'primary' : 'secondary'} status="ADAPTIVE RECALL" title={reviewQueue.length ? 'REVIEW WEAK TOPICS' : 'REVIEW QUEUE CLEAR'} tone="learning" onPress={() => navigateOnce(AppRoutes.review)} />
    <View style={styles.utilityRow}>
      <ActionCard badge={`${savedCount}`} detail="Quick access to bookmarked learning sources." icon="lesson" priority="utility" status="SAVED" title="SAVED LEARNING" onPress={() => navigateOnce(AppRoutes.saved)} />
    </View>
    <Text variant="sectionHeading" style={styles.sectionTitle}>CHAPTER STATUS</Text>
    {chapters.filter((chapter) => accessible.has(chapter.id)).map((chapter) => {
      const progress = getChapterProgress(chapter, learningProgress);
      const score = state.quizScores[chapter.id];
      const version = state.quizContentVersions[chapter.id] ?? 1;
      const mastered = isQuizMastered(chapter, score, version);
      const due = reviewQueue.filter((item) => item.chapterId === chapter.id).length;
      return <View key={chapter.id} style={styles.chapterCard}>
        <View style={styles.row}><Text variant="label" style={styles.chapterLabel}>CHAPTER {chapter.numberLabel}</Text><Text variant="label" style={mastered ? styles.success : styles.muted}>{mastered ? 'QUIZ MASTERED' : `MASTERY ${score ?? 0}/${getQuizMasteryScore(chapter)}`}</Text></View>
        <Text variant="sectionHeading" style={styles.chapterTitle}>{chapter.title}</Text>
        <ProgressBar progress={progress.completed / progress.total} />
        <Text variant="technical" style={styles.muted}>{progress.completed}/{progress.total} ACTIVITIES / {due} REVIEW DUE</Text>
      </View>;
    })}
    <Text variant="sectionHeading" style={styles.sectionTitle}>RECENT ACTIVITY</Text>
    <View style={styles.history}>{state.activityHistory.length ? state.activityHistory.slice(0, 10).map((event) => <View key={event.id} style={styles.historyRow}><Text variant="label" style={styles.historyType}>{event.type.toUpperCase()}</Text><View style={styles.historyCopy}><Text variant="bodySmall" style={styles.historyText}>{event.label}</Text><Text variant="technical" style={styles.muted}>{new Date(event.occurredAt).toLocaleString()}</Text></View></View>) : <Text variant="bodySmall" style={styles.muted}>Complete a lesson, lab, quiz, or review to begin the local activity history.</Text>}</View>
  </Screen>;
}

const styles = StyleSheet.create({
  eyebrow: { color: Palette.orange }, title: { color: Palette.text, fontFamily: Fonts.semibold, marginVertical: Space.sm, marginBottom: Space.xl },
  utilityRow: { marginTop: Space.md }, sectionTitle: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xxl, marginBottom: Space.md },
  chapterCard: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg, gap: Space.sm, marginBottom: Space.md }, row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm }, chapterLabel: { color: Palette.accentBright }, chapterTitle: { color: Palette.text, textTransform: 'uppercase' }, muted: { color: Palette.textMuted }, success: { color: Palette.green }, history: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface }, historyRow: { flexDirection: 'row', gap: Space.md, padding: Space.md, borderBottomWidth: 1, borderBottomColor: Palette.border }, historyType: { color: Palette.orange, width: 88 }, historyCopy: { flex: 1, minWidth: 0 }, historyText: { color: Palette.text },
});
