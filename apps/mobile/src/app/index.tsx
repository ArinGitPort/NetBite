import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { foundationChapters, operationsChapters } from '@/content/chapters';
import { canEnterOperations, isCourseComplete } from '@/content/courses';
import { getNextChapterActivity } from '@/content/next-activity';
import { getChapterProgress, isChapterComplete } from '@/content/progress';
import { canAccessChapter } from '@/core/account/access';
import { useAuth } from '@/features/account/auth-context';
import { ActionCard } from '@/shared/components/action-card';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { IconButton } from '@/shared/components/icon-button';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { AppRoutes } from '@/shared/routes';
import { navigateOnce } from '@/shared/navigation';
import { getSimulatorBoundaryCopy, getSyncStatusLabel } from '@/shared/learner-facing-copy';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';
import { useSandboxStore } from '@/store/use-sandbox-store';
import { useResearchStore } from '@/store/use-research-store';

export default function MainMenuScreen() {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { status, profile, accountRole, hasPro, hasContentAccess, testProEnabled, presentationActive, syncStatus, accountEntryResolved } = useAuth();
  const completedLessonIds = useGameStore((state) => state.completedLessonIds);
  const completedLabIds = useGameStore((state) => state.completedLabIds);
  const quizScores = useGameStore((state) => state.quizScores);
  const quizContentVersions = useGameStore((state) => state.quizContentVersions);
  const reviewedFlashcardChapterIds = useGameStore((state) => state.reviewedFlashcardChapterIds);
  const flashcardContentVersions = useGameStore((state) => state.flashcardContentVersions);
  const readinessScores = useGameStore((state) => state.readinessScores);
  const sandboxDeviceCount = useSandboxStore((state) => state.workspace.devices.length);
  const recordResearchEvent = useResearchStore((state) => state.recordEvent);
  const progress = { completedLessonIds, completedLabIds, quizScores, quizContentVersions, reviewedFlashcardChapterIds, flashcardContentVersions, readinessScores };
  const foundationsComplete = isCourseComplete('network-foundations', progress);
  const operationsReady = canEnterOperations(progress);
  const chapters = foundationsComplete && operationsReady && hasContentAccess ? operationsChapters : foundationChapters;
  const currentChapter = chapters.find((chapter) => canAccessChapter(chapter.id, hasContentAccess) && !isChapterComplete(chapter, progress))
    ?? chapters.findLast((chapter) => canAccessChapter(chapter.id, hasContentAccess))
    ?? chapters[0];
  const started = completedLessonIds.length + completedLabIds.length + Object.keys(quizScores).length > 0;
  const nextActivity = getNextChapterActivity(currentChapter, progress);
  const chapterProgress = getChapterProgress(currentChapter, progress);
  const progressRatio = chapterProgress.total ? chapterProgress.completed / chapterProgress.total : 0;
  const needsOperationsHandoff = foundationsComplete && (!operationsReady || !hasContentAccess);
  const nextTitle = needsOperationsHandoff ? 'Network Operations readiness' : nextActivity.type === 'lesson'
    ? currentChapter.lessons.find((lesson) => lesson.id === nextActivity.id)?.title ?? 'Next lesson'
    : nextActivity.type === 'lab'
      ? currentChapter.lab.title
      : nextActivity.type === 'quiz'
        ? 'Check your understanding'
        : nextActivity.type === 'flashcards'
          ? 'Recall the key ideas'
          : 'Review chapter';
  const accountTitle = status === 'authenticated' ? (profile?.displayName || 'My account') : 'Sign in or register';
  const accountDetail = status === 'authenticated' ? getSyncStatusLabel(syncStatus) : 'Guest account';
  const syncIndicator = status !== 'authenticated' ? colors.textMuted : syncStatus === 'synced' ? colors.green : colors.orange;

  if (status === 'guest' && !accountEntryResolved) {
    return <Redirect href={AppRoutes.authWelcome} />;
  }

  const continueLearning = () => {
    recordResearchEvent('continued-learning');
    if (needsOperationsHandoff) { navigateOnce(AppRoutes.courses); return; }
    const activity = nextActivity;
    if (activity.type === 'lesson') navigateOnce({ pathname: '/lesson/[lessonId]', params: { lessonId: activity.id } });
    else if (activity.type === 'lab') navigateOnce({ pathname: '/lab/[labId]', params: { labId: activity.id } });
    else if (activity.type === 'quiz') navigateOnce({ pathname: '/quiz/[chapterId]', params: { chapterId: activity.id } });
    else if (activity.type === 'flashcards') navigateOnce({ pathname: '/flashcards/[chapterId]', params: { chapterId: activity.id } });
    else navigateOnce('/learn');
  };

  return (
    <Screen
      header={
        <PageHeader
          trailingContent={
            <View accessibilityLabel="Account and app controls" style={styles.headerActions}>
              <View style={styles.accountAction}>
                <IconButton
                  accessibilityHint="Opens your account, access, and backup status"
                  accessibilityLabel={`${accountTitle}, ${accountDetail}`}
                  busy={status === 'authenticated' && syncStatus === 'syncing'}
                  onPress={() => navigateOnce(status === 'authenticated' ? AppRoutes.account : AppRoutes.auth)}
                  semanticIcon="account"
                />
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.syncIndicator, { backgroundColor: syncIndicator }]} />
              </View>
              <IconButton
                accessibilityHint="Opens preferences, backup controls, and saved data tools"
                accessibilityLabel="Settings"
                onPress={() => navigateOnce(AppRoutes.settings)}
                semanticIcon="settings"
              />
            </View>
          }
        />
      }
    >
      <View style={styles.brandBlock}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('@netbite/brand/logo.png')}
          style={styles.logo}
          testID="main-menu-logo"
        />
        <Text variant="screenTitle" style={styles.brand}>NETBITE</Text>
        <Text variant="technical" style={styles.system}>NETWORK TRAINING SYSTEM / MOBILE UNIT</Text>
      </View>
      <View style={styles.menu}>
        <ActionCard
          accessibilityHint={`Opens ${nextTitle}`}
          badge={`${chapterProgress.completed}/${chapterProgress.total}`}
          detail={`Next: ${nextTitle}`}
          icon="learn"
          priority="primary"
          progress={progressRatio}
          status={`${currentChapter.courseId === 'network-operations' ? 'OPERATIONS MODULE' : 'CHAPTER'} ${currentChapter.numberLabel} / ${needsOperationsHandoff ? 'NEXT COURSE' : nextActivity.type.toUpperCase()}`}
          title={needsOperationsHandoff ? 'OPEN COURSE LIBRARY' : started ? 'CONTINUE LEARNING' : 'START LEARNING'}
          tone="learning"
          onPress={continueLearning}
          testID="primary-learning-action"
          footer={<AppButton accessibilityHint="Opens the course library" label="Browse courses" variant="utility" onPress={() => navigateOnce(AppRoutes.courses)} />}
        />
        <Text variant="label" style={styles.groupLabel}>BUILD & TEST</Text>
        <ActionCard
          accessibilityHint={hasContentAccess ? 'Opens the autosaved network workspace' : 'Explains how to unlock Network Sandbox access'}
          badge={hasContentAccess ? `${sandboxDeviceCount} DEVICE${sandboxDeviceCount === 1 ? '' : 'S'}` : 'VIEW PRO ACCESS'}
          detail={hasContentAccess ? 'Build, configure, and test your own network.' : 'See what Pro unlocks before entering the tool.'}
          endIcon={hasContentAccess ? 'arrow-right' : 'lock'}
          icon="sandbox"
          status={presentationActive ? 'DEMO ACCESS / NOT PURCHASED' : testProEnabled ? 'TEST ACCESS / NOT PURCHASED' : hasPro ? 'PRO / AUTOSAVED' : status === 'guest' ? 'GUEST ACCESS / OFFLINE READY' : 'PRO / LOCKED'}
          title="NETWORK SANDBOX"
          tone="sandbox"
          onPress={() => navigateOnce(hasContentAccess ? '/sandbox' : AppRoutes.pro)}
        />

        <Text variant="label" style={styles.groupLabel}>INSTRUCTOR-LED LEARNING</Text>
        <ActionCard
          detail={status === 'authenticated' ? 'Open private classes, saved lessons, and instructor assessments.' : 'Sign in to join a private class with a code or link.'}
          icon="learn"
          priority="utility"
          status={accountRole === 'instructor' ? 'STUDENT & INSTRUCTOR ACCESS' : status === 'authenticated' ? 'PRIVATE CLASSES' : 'ACCOUNT REQUIRED'}
          title="MY CLASSES"
          onPress={() => navigateOnce(status === 'authenticated' ? AppRoutes.workshops : AppRoutes.auth)}
        />
      </View>
      <Text variant="technical" style={styles.boundary}>{getSimulatorBoundaryCopy('app')}</Text>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  brandBlock: { alignItems: 'center', paddingTop: Space.lg, paddingBottom: Space.xl },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  accountAction: { position: 'relative' },
  syncIndicator: {
    position: 'absolute',
    right: 5,
    bottom: 6,
    width: 7,
    height: 7,
    borderWidth: 1,
    borderColor: colors.background,
  },
  logo: { width: 64, height: 64, marginBottom: Space.sm },
  brand: { color: colors.text, fontFamily: Fonts.semibold },
  system: { color: colors.textMuted, marginTop: Space.sm, textAlign: 'center' as const },
  menu: { gap: Space.md },
  groupLabel: { color: colors.textMuted, marginTop: Space.sm },
  boundary: { color: colors.textMuted, textAlign: 'center' as const, marginTop: Space.xxl },
});
