import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { canEnterOperations, getCourse, getCourseChapters } from '@/content/courses';
import type { CourseId } from '@/content/types';
import { getNextChapterActivity } from '@/content/next-activity';
import { getChapterProgress, isChapterComplete } from '@/content/progress';
import { canAccessChapter } from '@/core/account/access';
import { canOpenChapter } from '@/core/learning/course-access';
import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { ActionCard } from '@/shared/components/action-card';
import { AppIcon } from '@/shared/components/app-icon';
import { IconButton } from '@/shared/components/icon-button';
import { Text } from '@/shared/components/console-text';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';
import { useResearchStore } from '@/store/use-research-store';

export default function LearningHomeScreen() {
  const { courseId: routeCourseId } = useLocalSearchParams<{ courseId?: string }>();
  const courseId: CourseId = routeCourseId === 'network-operations' ? 'network-operations' : 'network-foundations';
  const course = getCourse(courseId)!;
  const chapters = getCourseChapters(courseId);
  const { hasContentAccess, presentationActive, testProEnabled } = useAuth();
  const accessBypass = presentationActive || testProEnabled;
  const completedLessonIds = useGameStore((state) => state.completedLessonIds);
  const completedLabIds = useGameStore((state) => state.completedLabIds);
  const quizScores = useGameStore((state) => state.quizScores);
  const quizContentVersions = useGameStore((state) => state.quizContentVersions);
  const reviewedFlashcardChapterIds = useGameStore((state) => state.reviewedFlashcardChapterIds);
  const flashcardContentVersions = useGameStore((state) => state.flashcardContentVersions);
  const readinessScores = useGameStore((state) => state.readinessScores);
  const recordResearchEvent = useResearchStore((state) => state.recordEvent);
  const learningProgress = { completedLessonIds, completedLabIds, quizScores, quizContentVersions, reviewedFlashcardChapterIds, flashcardContentVersions, readinessScores };
  const currentChapter = chapters.find((chapter) => canAccessChapter(chapter.id, hasContentAccess) && canOpenChapter(chapter, learningProgress, accessBypass) && !isChapterComplete(chapter, learningProgress))
    ?? [...chapters].reverse().find((chapter) => canAccessChapter(chapter.id, hasContentAccess) && canOpenChapter(chapter, learningProgress, accessBypass))
    ?? chapters[0];
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
      <View style={styles.topRow}>
        <IconButton accessibilityLabel="Back to course library" icon="arrow-left" label="COURSES" onPress={() => router.replace(AppRoutes.courses)} />
        <Text variant="label" style={styles.brand}>NETBITE / {course.shortTitle.toUpperCase()}</Text>
      </View>
      <View style={styles.hero}>
        <Text variant="screenTitle" style={styles.title}>{course.title.toUpperCase()}</Text>
        <Text variant="body" style={styles.subtitle}>{course.summary}</Text>
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
        <AppButton label={progress === 1 ? 'Review chapter' : progress > 0 ? 'Continue learning' : 'Start learning'} trailingIcon="arrow-right" onPress={continueLearning} />
      </View>
      <View style={styles.learningUtilities}>
        <ActionCard detail="Completion, quiz mastery, weak topics, and recent activity." icon="quiz" priority="utility" status="LEARNING STATUS" title="PROGRESS & REVIEW" onPress={() => router.push(AppRoutes.progress)} />
        <ActionCard detail="Bookmarks and personal notes." icon="lesson" priority="utility" status="PERSONAL REFERENCE" title="SAVED LEARNING" onPress={() => router.push(AppRoutes.saved)} />
        <ActionCard detail="Retrieve official RFC metadata from the IETF Datatracker." icon="lesson" priority="utility" status="OFFICIAL IETF API" title="NETWORK STANDARDS" onPress={() => router.push(AppRoutes.standards)} />
      </View>
      <Text variant="sectionHeading" style={styles.sectionTitle}>LEARNING PATH</Text>
      <View style={styles.circuit}>
        <View style={styles.pathRail} />
        {chapters.map((chapter, index) => {
          const chapterComplete = isChapterComplete(chapter, learningProgress);
          const locked = !canAccessChapter(chapter.id, hasContentAccess) || !canOpenChapter(chapter, learningProgress, accessBypass);
          const simulatorPending = chapter.courseId === 'network-operations' && chapter.simulationReleaseState !== 'released';
          const current = chapter.id === currentChapter.id;
          const previous = index > 0 ? chapters[index - 1] : undefined;
          const lockTarget = !canAccessChapter(chapter.id, hasContentAccess) ? AppRoutes.pro : simulatorPending ? { pathname: '/chapter/[chapterId]', params: { chapterId: chapter.id } } as const : !canEnterOperations(learningProgress) ? AppRoutes.readiness : previous ? { pathname: '/chapter/[chapterId]', params: { chapterId: previous.id } } as const : AppRoutes.readiness;
          return (
            <Pressable key={chapter.id} accessibilityHint={locked ? 'Opens the requirement needed for this module' : current ? 'Opens your current module' : 'Opens this module'} accessibilityLabel={`${courseId === 'network-operations' ? 'Module' : 'Chapter'} ${chapter.numberLabel}, ${chapter.title}${locked ? ', locked' : current ? ', current' : chapterComplete ? ', complete' : ''}`} accessibilityRole="button" onPress={() => { if (chapter.numberLabel === '05') recordResearchEvent('opened-subnetting'); if (locked) router.push(lockTarget); else router.push({ pathname: '/chapter/[chapterId]', params: { chapterId: chapter.id } }); }} style={({ pressed }) => [styles.pathRow, index === chapters.length - 1 && styles.lastPathRow, current && styles.currentPathRow, chapterComplete && !current && styles.completedPathRow, locked && styles.lockedRow, pressed && styles.pressed]}>
              <View style={[styles.circuitNode, locked ? styles.lockedNode : chapterComplete ? styles.completedNode : current ? styles.currentNode : styles.activeNode]} />
              <View style={styles.pathCopy}>
                <Text variant="label" style={[styles.pathLabel, current && styles.currentPathLabel, chapterComplete && !current && styles.completedPathLabel]}>{courseId === 'network-operations' ? 'MODULE' : 'CHAPTER'} {chapter.numberLabel}{simulatorPending ? ` / ${chapter.simulationReleaseState === 'validation' ? 'SIMULATOR IN VALIDATION' : 'COMING SOON'}` : locked ? ' / LOCKED' : current ? ' / CURRENT' : chapterComplete ? ' / COMPLETE' : ''}</Text>
                <Text variant="sectionHeading" style={styles.pathTitle}>{chapter.title}</Text>
                <Text variant="technical" style={styles.muted}>{String(chapter.lessons.length).padStart(2, '0')} LESSONS / 01 LAB / {String(chapter.quiz.length).padStart(2, '0')} QUESTIONS</Text>
              </View>
              <AppIcon name={locked ? 'lock' : chapterComplete ? 'check' : 'arrow-right'} size={20} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.md, marginBottom: Space.xl },
  brand: { color: Palette.textMuted },
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
  learningUtilities: { gap: Space.sm, marginTop: Space.md },
  pressed: { opacity: 0.7 },
  circuit: { position: 'relative', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, paddingVertical: Space.sm },
  pathRail: { position: 'absolute', left: 21, top: 0, bottom: 0, width: 1, backgroundColor: Palette.border },
  pathRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.lg, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Palette.border },
  lastPathRow: { borderBottomWidth: 0 },
  circuitNode: { width: 12, height: 12, zIndex: 1 },
  activeNode: { backgroundColor: Palette.active },
  currentNode: { backgroundColor: Palette.orange, borderWidth: 1, borderColor: Palette.white },
  completedNode: { backgroundColor: Palette.green },
  lockedNode: { borderWidth: 1, borderColor: Palette.textMuted, backgroundColor: Palette.background },
  lockedRow: { opacity: 0.72 },
  currentPathRow: { borderLeftWidth: 4, borderLeftColor: Palette.orange, backgroundColor: Palette.surfaceRaised },
  completedPathRow: { opacity: 0.82 },
  pathCopy: { flex: 1, minWidth: 0, marginLeft: Space.lg },
  pathLabel: { color: Palette.accentBright, fontFamily: Fonts.medium },
  currentPathLabel: { color: Palette.orange },
  completedPathLabel: { color: Palette.green },
  pathTitle: { color: Palette.text, fontFamily: Fonts.medium, marginVertical: Space.xs, textTransform: 'uppercase' },
});
