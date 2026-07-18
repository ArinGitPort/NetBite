import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { chapters } from '@/content/chapters';
import { getNextChapterActivity } from '@/content/next-activity';
import { getChapterProgress, isChapterComplete } from '@/content/progress';
import { AppButton } from '@/shared/components/app-button';
import { AppIcon } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

export default function HomeScreen() {
  const completedLessonIds = useGameStore((state) => state.completedLessonIds);
  const completedLabIds = useGameStore((state) => state.completedLabIds);
  const quizScores = useGameStore((state) => state.quizScores);
  const quizContentVersions = useGameStore((state) => state.quizContentVersions);
  const reviewedFlashcardChapterIds = useGameStore((state) => state.reviewedFlashcardChapterIds);
  const flashcardContentVersions = useGameStore((state) => state.flashcardContentVersions);
  const learningProgress = { completedLessonIds, completedLabIds, quizScores, quizContentVersions, reviewedFlashcardChapterIds, flashcardContentVersions };
  const currentChapter = chapters.find((chapter) => !isChapterComplete(chapter, learningProgress)) ?? chapters[chapters.length - 1];
  const { completed: completedSteps, total: totalSteps } = getChapterProgress(currentChapter, learningProgress);
  const progress = completedSteps / totalSteps;

  const continueLearning = () => {
    const activity = getNextChapterActivity(currentChapter, learningProgress);
    if (activity.type === 'lesson') router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: activity.id } });
    else if (activity.type === 'lab') router.push({ pathname: '/lab/[labId]', params: { labId: activity.id } });
    else if (activity.type === 'quiz') router.push({ pathname: '/quiz/[chapterId]', params: { chapterId: activity.id } });
    else if (activity.type === 'flashcards') router.push({ pathname: '/flashcards/[chapterId]', params: { chapterId: activity.id } });
    else router.push({ pathname: '/chapter/[chapterId]', params: { chapterId: activity.id } });
  };

  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.logo}><Text variant="sectionHeading" style={styles.logoText}>N</Text></View>
        <Text variant="sectionHeading" style={styles.brand}>NETBITE</Text>
      </View>

      <View style={styles.hero}>
        <Text variant="screenTitle" style={styles.title}>LEARN NETWORKING BY BUILDING</Text>
        <Text variant="body" style={styles.subtitle}>Short lessons and focused labs for your first network.</Text>
      </View>

      <View style={styles.continueCard}>
        <View style={styles.cardTop}>
          <View style={styles.chapterBadge}><Text variant="sectionHeading" style={styles.chapterBadgeText}>{currentChapter.numberLabel}</Text></View>
          <View style={styles.cardTitleGroup}>
            <Text variant="label" style={styles.cardEyebrow}>CURRENT CHAPTER</Text>
            <Text variant="sectionHeading" style={styles.cardTitle}>{currentChapter.title}</Text>
          </View>
        </View>
        <ProgressBar progress={progress} />
        <View style={styles.progressRow}>
          <Text variant="label" style={styles.muted}>{completedSteps} OF {totalSteps} ACTIVITIES</Text>
          <Text variant="label" style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
        </View>
        <AppButton
          label={progress === 1 ? 'Review chapter' : progress > 0 ? 'Continue learning' : 'Start learning'}
          trailingIcon="arrow-right"
          onPress={continueLearning}
        />
      </View>

      <Text variant="sectionHeading" style={styles.sectionTitle}>LEARNING PATH</Text>
      <View style={styles.circuit}>
        <View style={styles.pathRail} />
        {chapters.map((chapter, index) => {
          const chapterComplete = isChapterComplete(chapter, learningProgress);
          return (
            <Pressable
              key={chapter.id}
              accessibilityLabel={`Chapter ${chapter.numberLabel}, ${chapter.title}${chapterComplete ? ', complete' : ''}`}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/chapter/[chapterId]', params: { chapterId: chapter.id } })}
              style={({ pressed }) => [
                styles.pathRow,
                index === chapters.length - 1 && styles.lastPathRow,
                pressed && styles.pressed,
              ]}>
              <View style={[styles.circuitNode, styles.activeNode]} />
              <View style={styles.pathCopy}>
                <Text variant="label" style={styles.pathLabel}>CHAPTER {chapter.numberLabel}{chapterComplete ? ' / COMPLETE' : ''}</Text>
                <Text variant="sectionHeading" style={styles.pathTitle}>{chapter.title}</Text>
                <Text variant="technical" style={styles.muted}>{String(chapter.lessons.length).padStart(2, '0')} LESSONS / 01 LAB / {String(chapter.quiz.length).padStart(2, '0')} QUESTIONS</Text>
              </View>
              <AppIcon name={chapterComplete ? 'check' : 'arrow-right'} size={20} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.xxl },
  logo: { width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.accentSoft, borderWidth: 1, borderColor: Palette.accent, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: Palette.accentBright, fontFamily: Fonts.semibold },
  brand: { marginLeft: Space.md, color: Palette.text, fontFamily: Fonts.semibold },
  hero: { marginBottom: Space.xxl },
  title: { color: Palette.text, fontFamily: Fonts.semibold },
  subtitle: { color: Palette.textMuted, marginTop: Space.md, maxWidth: 430 },
  continueCard: { backgroundColor: Palette.surface, borderRadius: Radius.lg, padding: Space.xl, gap: Space.lg, borderWidth: 1, borderColor: Palette.border },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  chapterBadge: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Palette.greenSoft, borderWidth: 1, borderColor: Palette.green, alignItems: 'center', justifyContent: 'center' },
  chapterBadgeText: { color: Palette.green, fontFamily: Fonts.semibold },
  cardTitleGroup: { flex: 1, minWidth: 0, marginLeft: Space.md },
  cardEyebrow: { color: Palette.textMuted, fontFamily: Fonts.medium },
  cardTitle: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xs, textTransform: 'uppercase' },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.xs },
  muted: { color: Palette.textMuted },
  progressPercent: { color: Palette.accentBright },
  sectionTitle: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xxl, marginBottom: Space.lg },
  pressed: { opacity: 0.7 },
  circuit: { position: 'relative', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, paddingVertical: Space.sm },
  pathRail: { position: 'absolute', left: 21, top: 0, bottom: 0, width: 1, backgroundColor: Palette.border },
  pathRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.lg, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Palette.border },
  lastPathRow: { borderBottomWidth: 0 },
  circuitNode: { width: 12, height: 12, zIndex: 1 },
  activeNode: { backgroundColor: Palette.active },
  pathCopy: { flex: 1, minWidth: 0, marginLeft: Space.lg },
  pathLabel: { color: Palette.accentBright, fontFamily: Fonts.medium },
  pathTitle: { color: Palette.text, fontFamily: Fonts.medium, marginVertical: Space.xs, textTransform: 'uppercase' },
});
