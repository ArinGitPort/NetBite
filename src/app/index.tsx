import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { chapters } from '@/content/chapters';
import { getNextChapterActivity } from '@/content/next-activity';
import { getChapterProgress, isChapterComplete } from '@/content/progress';
import { canAccessChapter } from '@/core/account/access';
import { useAuth } from '@/features/account/auth-context';
import { ActionCard } from '@/shared/components/action-card';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { ContextualGuide } from '@/shared/components/contextual-guide';
import { Screen } from '@/shared/components/screen';
import { AppRoutes } from '@/shared/routes';
import { navigateOnce } from '@/shared/navigation';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';
import { useSandboxStore } from '@/store/use-sandbox-store';
import { useResearchStore } from '@/store/use-research-store';

export default function MainMenuScreen() {
  const { status, profile, hasPro, hasContentAccess, presentationActive, syncStatus, accountEntryResolved } = useAuth();
  const completedLessonIds = useGameStore((state) => state.completedLessonIds);
  const completedLabIds = useGameStore((state) => state.completedLabIds);
  const quizScores = useGameStore((state) => state.quizScores);
  const quizContentVersions = useGameStore((state) => state.quizContentVersions);
  const reviewedFlashcardChapterIds = useGameStore((state) => state.reviewedFlashcardChapterIds);
  const flashcardContentVersions = useGameStore((state) => state.flashcardContentVersions);
  const sandboxDeviceCount = useSandboxStore((state) => state.workspace.devices.length);
  const recordResearchEvent = useResearchStore((state) => state.recordEvent);
  const progress = { completedLessonIds, completedLabIds, quizScores, quizContentVersions, reviewedFlashcardChapterIds, flashcardContentVersions };
  const currentChapter = chapters.find((chapter) => canAccessChapter(chapter.id, hasContentAccess) && !isChapterComplete(chapter, progress))
    ?? chapters.findLast((chapter) => canAccessChapter(chapter.id, hasContentAccess))
    ?? chapters[0];
  const started = completedLessonIds.length + completedLabIds.length + Object.keys(quizScores).length > 0;
  const nextActivity = getNextChapterActivity(currentChapter, progress);
  const chapterProgress = getChapterProgress(currentChapter, progress);
  const progressRatio = chapterProgress.total ? chapterProgress.completed / chapterProgress.total : 0;
  const nextTitle = nextActivity.type === 'lesson'
    ? currentChapter.lessons.find((lesson) => lesson.id === nextActivity.id)?.title ?? 'Next lesson'
    : nextActivity.type === 'lab'
      ? currentChapter.lab.title
      : nextActivity.type === 'quiz'
        ? 'Check your understanding'
        : nextActivity.type === 'flashcards'
          ? 'Recall the key ideas'
          : 'Review chapter';

  if (status === 'guest' && !accountEntryResolved) {
    return <Redirect href={AppRoutes.authWelcome} />;
  }

  const continueLearning = () => {
    recordResearchEvent('continued-learning');
    const activity = nextActivity;
    if (activity.type === 'lesson') navigateOnce({ pathname: '/lesson/[lessonId]', params: { lessonId: activity.id } });
    else if (activity.type === 'lab') navigateOnce({ pathname: '/lab/[labId]', params: { labId: activity.id } });
    else if (activity.type === 'quiz') navigateOnce({ pathname: '/quiz/[chapterId]', params: { chapterId: activity.id } });
    else if (activity.type === 'flashcards') navigateOnce({ pathname: '/flashcards/[chapterId]', params: { chapterId: activity.id } });
    else navigateOnce('/learn');
  };

  return (
    <Screen>
      <View style={styles.brandBlock}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('@/assets/images/branding/netbite-menu-logo-mobile.png')}
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
          status={`CHAPTER ${currentChapter.numberLabel} / ${nextActivity.type.toUpperCase()}`}
          title={started ? 'CONTINUE LEARNING' : 'START LEARNING'}
          tone="learning"
          onPress={continueLearning}
          testID="primary-learning-action"
          footer={<AppButton accessibilityHint="Opens the complete learning path" label="Browse all chapters" variant="utility" onPress={() => navigateOnce('/learn')} />}
        />
        <ContextualGuide id="menu-v1" eyebrow="FIRST SESSION" steps={[{ title: 'Continue is your next step', detail: 'The first panel always opens the next unfinished learning activity.' }, { title: 'Build when you are ready', detail: 'Network Sandbox is a separate tool for experimentation, while Account and Settings remain utilities.' }]} />

        <Text variant="label" style={styles.groupLabel}>BUILD & TEST</Text>
        <ActionCard
          accessibilityHint={hasContentAccess ? 'Opens the autosaved network workspace' : 'Explains how to unlock Network Sandbox access'}
          badge={hasContentAccess ? `${sandboxDeviceCount} DEVICE${sandboxDeviceCount === 1 ? '' : 'S'}` : 'VIEW PRO ACCESS'}
          detail={hasContentAccess ? 'Build and test a deterministic network.' : 'See what Pro unlocks before entering the tool.'}
          endIcon={hasContentAccess ? 'arrow-right' : 'lock'}
          icon="sandbox"
          status={presentationActive ? 'DEMO ACCESS / NOT PURCHASED' : hasPro ? 'PRO / AUTOSAVED' : 'PRO / LOCKED'}
          title="NETWORK SANDBOX"
          tone="sandbox"
          onPress={() => navigateOnce(hasContentAccess ? '/sandbox' : AppRoutes.pro)}
        />

        <Text variant="label" style={styles.groupLabel}>ACCOUNT & APP</Text>
        <ActionCard
          detail={status === 'authenticated' ? `Cloud progress: ${syncStatus.replace('-', ' ')}.` : 'Sign in later for cloud backup.'}
          icon="account"
          loading={status === 'authenticated' && syncStatus === 'syncing'}
          priority="utility"
          status={hasPro ? 'PRO ACTIVE' : status === 'authenticated' ? 'FREE ACCOUNT' : 'GUEST / LOCAL'}
          title={status === 'authenticated' ? (profile?.displayName?.toUpperCase() || 'MY ACCOUNT') : 'SIGN IN / REGISTER'}
          onPress={() => navigateOnce(status === 'authenticated' ? AppRoutes.account : AppRoutes.auth)}
        />
        <ActionCard detail="Preferences, cloud sync, presentation, and local data." icon="settings" priority="utility" status="APP CONTROLS" title="SETTINGS" onPress={() => navigateOnce('/settings')} />
      </View>
      <Text variant="technical" style={styles.boundary}>STATE-BASED EDUCATIONAL SIMULATION / NO LIVE PACKETS OR TIMING</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandBlock: { alignItems: 'center', paddingTop: Space.lg, paddingBottom: Space.xl },
  logo: { width: 64, height: 64, marginBottom: Space.sm },
  brand: { color: Palette.text, fontFamily: Fonts.semibold },
  system: { color: Palette.textMuted, marginTop: Space.sm, textAlign: 'center' },
  menu: { gap: Space.md },
  groupLabel: { color: Palette.textMuted, marginTop: Space.sm },
  boundary: { color: Palette.textMuted, textAlign: 'center', marginTop: Space.xxl },
});
