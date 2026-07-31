import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { chapters } from '@/content/chapters';
import { getNextChapterActivity } from '@/content/next-activity';
import { isChapterComplete } from '@/content/progress';
import { canAccessChapter } from '@/core/account/access';
import { useAuth } from '@/features/account/auth-context';
import { AppIcon } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { AppRoutes } from '@/shared/routes';
import { navigateOnce } from '@/shared/navigation';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';
import { useSandboxStore } from '@/store/use-sandbox-store';

function MenuCard({ title, detail, status, onPress }: { title: string; detail: string; status: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}>
      <View style={styles.cardCopy}>
        <Text variant="label" style={styles.status}>{status}</Text>
        <Text variant="sectionHeading" style={styles.cardTitle}>{title}</Text>
        <Text variant="bodySmall" style={styles.cardDetail}>{detail}</Text>
      </View>
      <AppIcon name="arrow-right" size={24} />
    </Pressable>
  );
}

export default function MainMenuScreen() {
  const { status, profile, hasPro, hasContentAccess, presentationActive, syncStatus, accountEntryResolved } = useAuth();
  const completedLessonIds = useGameStore((state) => state.completedLessonIds);
  const completedLabIds = useGameStore((state) => state.completedLabIds);
  const quizScores = useGameStore((state) => state.quizScores);
  const quizContentVersions = useGameStore((state) => state.quizContentVersions);
  const reviewedFlashcardChapterIds = useGameStore((state) => state.reviewedFlashcardChapterIds);
  const flashcardContentVersions = useGameStore((state) => state.flashcardContentVersions);
  const sandboxDeviceCount = useSandboxStore((state) => state.workspace.devices.length);
  const progress = { completedLessonIds, completedLabIds, quizScores, quizContentVersions, reviewedFlashcardChapterIds, flashcardContentVersions };
  const currentChapter = chapters.find((chapter) => canAccessChapter(chapter.id, hasContentAccess) && !isChapterComplete(chapter, progress))
    ?? chapters.findLast((chapter) => canAccessChapter(chapter.id, hasContentAccess))
    ?? chapters[0];
  const started = completedLessonIds.length + completedLabIds.length + Object.keys(quizScores).length > 0;

  if (status === 'guest' && !accountEntryResolved) {
    return <Redirect href={AppRoutes.authWelcome} />;
  }

  const continueLearning = () => {
    const activity = getNextChapterActivity(currentChapter, progress);
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
      <View style={styles.intro}>
        <Text variant="body" style={styles.introText}>Learn the fundamentals, then build and test your own deterministic network.</Text>
      </View>
      <View style={styles.menu}>
        <MenuCard title={status === 'authenticated' ? (profile?.displayName?.toUpperCase() || 'MY ACCOUNT') : 'SIGN IN / REGISTER'} detail={status === 'authenticated' ? `Cloud progress: ${syncStatus.toUpperCase()}.` : 'Optional account backup, Google sign-in, and purchase restoration.'} status={hasPro ? 'PRO ACTIVE' : status === 'authenticated' ? 'FREE ACCOUNT' : 'GUEST / LOCAL'} onPress={() => navigateOnce(status === 'authenticated' ? AppRoutes.account : AppRoutes.auth)} />
        <MenuCard title={started ? 'CONTINUE LEARNING' : 'START LEARNING'} detail={`Resume ${currentChapter.title}, or browse the complete learning path.`} status={`CHAPTER ${currentChapter.numberLabel}`} onPress={continueLearning} />
        <Pressable accessibilityRole="button" onPress={() => navigateOnce('/learn')} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text variant="label" style={styles.secondaryActionText}>BROWSE CHAPTERS</Text></Pressable>
        <MenuCard title="NETWORK SANDBOX" detail={hasContentAccess ? 'Build, configure, and test a bounded network with explained results.' : 'Available with the one-time NetBite Pro test unlock.'} status={presentationActive ? 'DEMO ACCESS / NOT PURCHASED' : hasPro ? (sandboxDeviceCount ? `${sandboxDeviceCount} DEVICES / AUTOSAVED` : 'PRO / EMPTY WORKSPACE') : 'PRO / LOCKED'} onPress={() => navigateOnce(hasContentAccess ? '/sandbox' : AppRoutes.pro)} />
        <MenuCard title="SETTINGS" detail="Control motion, haptics, and locally stored progress." status="APP CONTROLS" onPress={() => navigateOnce('/settings')} />
      </View>
      <Text variant="technical" style={styles.boundary}>STATE-BASED EDUCATIONAL SIMULATION / NO LIVE PACKETS OR TIMING</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandBlock: { alignItems: 'center', paddingVertical: Space.xxl },
  logo: { width: 96, height: 96, marginBottom: Space.md },
  brand: { color: Palette.text, fontFamily: Fonts.semibold },
  system: { color: Palette.textMuted, marginTop: Space.sm, textAlign: 'center' },
  intro: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: Palette.border, paddingVertical: Space.lg, marginBottom: Space.xl },
  introText: { color: Palette.text, textAlign: 'center' },
  menu: { gap: Space.md },
  menuCard: { minHeight: 112, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg, flexDirection: 'row', alignItems: 'center', gap: Space.md },
  cardCopy: { flex: 1, minWidth: 0 },
  status: { color: Palette.orange },
  cardTitle: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xs },
  cardDetail: { color: Palette.textMuted, marginTop: Space.sm },
  secondaryAction: { minHeight: 44, borderWidth: 1, borderColor: Palette.accent, alignItems: 'center', justifyContent: 'center', padding: Space.sm },
  secondaryActionText: { color: Palette.accentBright },
  pressed: { backgroundColor: Palette.accentSoft },
  boundary: { color: Palette.textMuted, textAlign: 'center', marginTop: Space.xxl },
});
