import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { getChapter } from '@/content/chapters';
import { getNextChapterActivity } from '@/content/next-activity';
import { getChapterProgress, getQuizMasteryScore, isFlashcardsReviewed, isQuizMastered } from '@/content/progress';
import { canAccessChapter } from '@/core/account/access';
import { canOpenChapter, getChapterLockReason } from '@/core/learning/course-access';
import { useAuth } from '@/features/account/auth-context';
import { PremiumLockedScreen } from '@/features/account/components/premium-locked-screen';
import { ChapterRecap } from '@/features/chapters/components/chapter-recap';
import { SubnettingCheatSheet } from '@/features/chapters/components/subnetting-cheat-sheet';
import { AppButton } from '@/shared/components/app-button';
import { AppIcon } from '@/shared/components/app-icon';
import { SemanticIcon, type SemanticIconName } from '@/shared/components/semantic-icon';
import { ContentNotFound } from '@/shared/components/content-not-found';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { AppRoutes } from '@/shared/routes';
import { useGameStore } from '@/store/use-game-store';

interface ActivityRowProps {
  index: number;
  type: string;
  title: string;
  detail: string;
  complete: boolean;
  current?: boolean;
  icon: SemanticIconName;
  onPress: () => void;
}

function ActivityRow({ index, type, title, detail, complete, current, icon, onPress }: ActivityRowProps) {
  return (
    <Pressable
      accessibilityHint={current ? 'Opens the next unfinished activity' : `Opens this ${type.toLowerCase()}`}
      accessibilityLabel={`${type}: ${title}${current ? ', next activity' : complete ? ', complete' : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.activity, current && styles.currentActivity, complete && !current && styles.completedActivity, pressed && styles.pressed]}>
      <View style={[styles.activityNumber, complete && styles.activityComplete]}>
        {complete ? <AppIcon name="check" size={24} /> : <SemanticIcon color={current ? Palette.orange : Palette.textMuted} name={icon} size={22} />}
      </View>
      <View style={styles.activityCopy}>
        <Text variant="label" style={[styles.activityType, current && styles.currentActivityType]}>{current ? `NEXT / ${type}` : `${String(index).padStart(2, '0')} / ${type}`}</Text>
        <Text variant="sectionHeading" style={styles.activityTitle}>{title}</Text>
        <Text variant="bodySmall" style={styles.activityDetail}>{detail}</Text>
      </View>
      <AppIcon name="arrow-right" size={20} />
    </Pressable>
  );
}

export default function ChapterScreen() {
  const { hasContentAccess, presentationActive, testProEnabled } = useAuth();
  const accessBypass = presentationActive || testProEnabled;
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const completedLessonIds = useGameStore((state) => state.completedLessonIds);
  const completedLabIds = useGameStore((state) => state.completedLabIds);
  const quizScores = useGameStore((state) => state.quizScores);
  const quizContentVersions = useGameStore((state) => state.quizContentVersions);
  const reviewedFlashcardChapterIds = useGameStore((state) => state.reviewedFlashcardChapterIds);
  const flashcardContentVersions = useGameStore((state) => state.flashcardContentVersions);
  const chapter = getChapter(chapterId);
  const progress = { completedLessonIds, completedLabIds, quizScores, quizContentVersions, reviewedFlashcardChapterIds, flashcardContentVersions };

  if (!chapter) return <ContentNotFound label="Chapter" />;
  if (!canAccessChapter(chapter.id, hasContentAccess)) return <PremiumLockedScreen label={`CHAPTER ${chapter.numberLabel}`} />;
  if (!canOpenChapter(chapter, progress, accessBypass)) return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to course library', icon: 'arrow-left', label: 'BACK / COURSES', onPress: () => router.replace(AppRoutes.courses) }} />}><Text variant="label" style={styles.chapterLabel}>MODULE LOCKED</Text><Text variant="screenTitle" style={styles.title}>{chapter.title}</Text><Text variant="body" style={styles.subtitle}>{getChapterLockReason(chapter, progress)}</Text><AppButton label="Open requirement" onPress={() => router.replace(chapter.courseId === 'network-operations' ? AppRoutes.readiness : AppRoutes.courses)} /><AppButton label="Course library" variant="secondary" onPress={() => router.replace(AppRoutes.courses)} /></Screen>;
  const { completed, total } = getChapterProgress(chapter, progress);
  const labComplete = completedLabIds.includes(chapter.lab.id);
  const quizScore = quizScores[chapter.id];
  const quizVersionCurrent = quizContentVersions[chapter.id] === chapter.contentVersion;
  const quizMastered = isQuizMastered(chapter, quizScore, quizContentVersions[chapter.id] ?? 1);
  const quizDetail = quizScore === undefined
    ? `${chapter.quiz.length} beginner questions`
    : !quizVersionCurrent
      ? `Content updated • retake ${chapter.quiz.length} questions`
    : quizMastered
      ? `Mastered • ${quizScore}/${chapter.quiz.length}`
      : `Attempted • ${quizScore}/${chapter.quiz.length} • Reach ${getQuizMasteryScore(chapter)}/${chapter.quiz.length}`;
  const flashcardsReviewed = isFlashcardsReviewed(chapter, progress);
  const flashcardsPreviouslyReviewed = reviewedFlashcardChapterIds.includes(chapter.id);
  const flashcardDetail = flashcardsPreviouslyReviewed && !flashcardsReviewed
    ? `Content updated • review ${chapter.flashcards.length} cards`
    : `${chapter.flashcards.length} cards`;
  const chapterComplete = completed === total;
  const nextActivity = getNextChapterActivity(chapter, progress);

  return (
    <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to learning path', icon: 'arrow-left', label: 'BACK / LEARN', onPress: () => router.dismissTo({ pathname: '/learn', params: { courseId: chapter.courseId ?? 'network-foundations' } }) }} />}>
      <View style={styles.hero}>
        <Text variant="label" style={styles.chapterLabel}>CHAPTER {chapter.numberLabel}</Text>
        <Text variant="screenTitle" style={styles.title}>{chapter.title}</Text>
        <Text variant="body" style={styles.subtitle}>{chapter.summary}</Text>
        <ProgressBar progress={completed / total} />
        <Text variant="label" style={styles.progressText}>{completed} OF {total} ACTIVITIES COMPLETE</Text>
      </View>

      {chapterComplete ? <ChapterRecap recap={chapter.recap} /> : null}

      {chapter.id === '5' ? <SubnettingCheatSheet /> : null}

      <Text variant="sectionHeading" style={styles.sectionTitle}>LESSONS</Text>
      {chapter.lessons.map((lesson, index) => (
        <ActivityRow
          key={lesson.id}
          index={index + 1}
          type="LESSON"
          title={lesson.title}
          detail="About 1 minute"
          complete={completedLessonIds.includes(lesson.id)}
          current={nextActivity.type === 'lesson' && nextActivity.id === lesson.id}
          icon="lesson"
          onPress={() => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } })}
        />
      ))}

      <Text variant="sectionHeading" style={styles.sectionTitle}>PRACTICE</Text>
      <ActivityRow index={chapter.lessons.length + 1} type="MINI LAB" title={chapter.lab.title} detail={chapter.lab.detail} complete={labComplete} current={nextActivity.type === 'lab'} icon="lab" onPress={() => router.push({ pathname: '/lab/[labId]', params: { labId: chapter.lab.id } })} />
      <ActivityRow index={chapter.lessons.length + 2} type="QUIZ" title="Check your understanding" detail={quizDetail} complete={quizMastered} current={nextActivity.type === 'quiz'} icon="quiz" onPress={() => router.push({ pathname: '/quiz/[chapterId]', params: { chapterId: chapter.id } })} />
      <ActivityRow index={chapter.lessons.length + 3} type="FLASHCARDS" title="Recall the key ideas" detail={flashcardDetail} complete={flashcardsReviewed} current={nextActivity.type === 'flashcards'} icon="flashcards" onPress={() => router.push({ pathname: '/flashcards/[chapterId]', params: { chapterId: chapter.id } })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start' },
  hero: { backgroundColor: Palette.surfaceRaised, padding: Space.xl, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.accent, marginVertical: Space.lg, gap: Space.md },
  chapterLabel: { color: Palette.accentBright, fontFamily: Fonts.medium },
  title: { color: Palette.white, fontFamily: Fonts.semibold, textTransform: 'uppercase' },
  subtitle: { color: Palette.textMuted, marginBottom: Space.sm },
  progressText: { color: Palette.textMuted, fontFamily: Fonts.regular },
  sectionTitle: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xl, marginBottom: Space.md },
  activity: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, padding: Space.lg, marginBottom: Space.md },
  currentActivity: { borderLeftWidth: 4, borderColor: Palette.orange, backgroundColor: Palette.surfaceRaised },
  completedActivity: { opacity: 0.82 },
  pressed: { opacity: 0.7 },
  activityNumber: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm, backgroundColor: Palette.accentSoft },
  activityComplete: { backgroundColor: Palette.mint },
  activityNumberText: { color: Palette.accentBright, fontFamily: Fonts.medium },
  activityCopy: { flex: 1, minWidth: 0, marginLeft: Space.md },
  activityType: { color: Palette.accentBright, fontFamily: Fonts.medium },
  currentActivityType: { color: Palette.orange },
  activityTitle: { color: Palette.text, fontFamily: Fonts.medium, marginVertical: Space.xs, textTransform: 'uppercase' },
  activityDetail: { color: Palette.textMuted, textTransform: 'uppercase' },
});
