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
import { AppIcon } from '@/shared/components/app-icon';
import { DisclosureSection } from '@/shared/components/disclosure-section';
import { PageHeader } from '@/shared/components/page-header';
import { SemanticIcon, type SemanticIconName } from '@/shared/components/semantic-icon';
import { Text } from '@/shared/components/console-text';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Radius, Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';
import { useResearchStore } from '@/store/use-research-store';

export default function LearningHomeScreen() {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
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

  const learningTools: { color: string; detail: string; icon: SemanticIconName; label: string; onPress: () => void; softColor: string; status: string }[] = [
    { label: 'Progress & Review', status: 'LEARNING STATUS', detail: 'Mastery, weak topics, and recent activity', icon: 'quiz', color: colors.accentBright, softColor: colors.accentSoft, onPress: () => router.push(AppRoutes.progress) },
    { label: 'Saved Learning', status: 'YOUR BOOKMARKS', detail: 'Bookmarked lessons and references', icon: 'bookmark', color: colors.green, softColor: colors.greenSoft, onPress: () => router.push(AppRoutes.saved) },
    { label: 'Network Rulebook', status: 'OFFICIAL SOURCES', detail: 'See where ARP, DHCP, TCP, and other networking rules come from', icon: 'lesson', color: colors.orange, softColor: colors.orangeSoft, onPress: () => router.push(AppRoutes.standards) },
  ];

  return (
    <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to course library', icon: 'arrow-left', label: 'BACK / COURSES', onPress: () => router.replace(AppRoutes.courses) }} status={`NETBITE / ${course.shortTitle.toUpperCase()}`} />}>
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
        <DisclosureSection title="Learning tools" summary="Progress, bookmarks, and network standards">
          {learningTools.map((tool) => <Pressable
            key={tool.label}
            accessibilityHint={`Opens ${tool.label}`}
            accessibilityRole="button"
            onPress={tool.onPress}
            style={({ pressed }) => [styles.toolRow, { borderLeftColor: tool.color }, pressed && styles.pressed]}
          >
            <View style={[styles.toolIcon, { backgroundColor: tool.softColor, borderColor: tool.color }]}><SemanticIcon color={tool.color} name={tool.icon} size={22} /></View>
            <View style={styles.toolCopy}>
              <Text variant="technical" style={[styles.toolStatus, { color: tool.color }]}>{tool.status}</Text>
              <Text variant="label" style={styles.toolTitle}>{tool.label}</Text>
              <Text variant="bodySmall" style={styles.toolDetail}>{tool.detail}</Text>
            </View>
            <AppIcon name="arrow-right" size={18} />
          </Pressable>)}
        </DisclosureSection>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  brand: { color: colors.textMuted },
  hero: { marginBottom: Space.xxl },
  title: { color: colors.text, fontFamily: Fonts.semibold },
  subtitle: { color: colors.textMuted, marginTop: Space.md, maxWidth: 430 },
  continueCard: { backgroundColor: colors.surface, borderRadius: Radius.lg, padding: Space.xl, gap: Space.lg, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  chapterBadge: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: colors.greenSoft, borderWidth: 1, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  chapterBadgeText: { color: colors.green, fontFamily: Fonts.semibold },
  cardTitleGroup: { flex: 1, minWidth: 0, marginLeft: Space.md },
  cardEyebrow: { color: colors.textMuted, fontFamily: Fonts.medium },
  cardTitle: { color: colors.text, fontFamily: Fonts.semibold, marginTop: Space.xs, textTransform: 'uppercase' },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.xs },
  muted: { color: colors.textMuted },
  progressPercent: { color: colors.accentBright },
  sectionTitle: { color: colors.accent, fontFamily: Fonts.semibold, marginTop: Space.xxl, marginBottom: Space.lg },
  learningUtilities: { marginTop: Space.md },
  toolRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.md, borderWidth: 1, borderLeftWidth: 4, borderColor: colors.border, backgroundColor: colors.background },
  toolIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  toolCopy: { flex: 1, minWidth: 0 },
  toolStatus: { fontFamily: Fonts.medium, marginBottom: Space.xs },
  toolTitle: { color: colors.text, fontFamily: Fonts.semibold, textTransform: 'uppercase' },
  toolDetail: { color: colors.textMuted, marginTop: Space.xs },
  pressed: { opacity: 0.7 },
  circuit: { position: 'relative', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingVertical: Space.sm },
  pathRail: { position: 'absolute', left: 21, top: 0, bottom: 0, width: 1, backgroundColor: colors.border },
  pathRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.lg, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastPathRow: { borderBottomWidth: 0 },
  circuitNode: { width: 12, height: 12, zIndex: 1 },
  activeNode: { backgroundColor: colors.active },
  currentNode: { backgroundColor: colors.orange, borderWidth: 1, borderColor: colors.text },
  completedNode: { backgroundColor: colors.green },
  lockedNode: { borderWidth: 1, borderColor: colors.textMuted, backgroundColor: colors.background },
  lockedRow: { opacity: 0.72 },
  currentPathRow: { borderLeftWidth: 4, borderLeftColor: colors.orange, backgroundColor: colors.surfaceRaised },
  completedPathRow: { opacity: 0.82 },
  pathCopy: { flex: 1, minWidth: 0, marginLeft: Space.lg },
  pathLabel: { color: colors.accentBright, fontFamily: Fonts.medium },
  currentPathLabel: { color: colors.orange },
  completedPathLabel: { color: colors.green },
  pathTitle: { color: colors.text, fontFamily: Fonts.medium, marginVertical: Space.xs, textTransform: 'uppercase' },
});
