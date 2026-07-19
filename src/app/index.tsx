import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { chapters } from '@/content/chapters';
import { getNextChapterActivity } from '@/content/next-activity';
import { isChapterComplete } from '@/content/progress';
import { AppIcon } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
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
  const completedLessonIds = useGameStore((state) => state.completedLessonIds);
  const completedLabIds = useGameStore((state) => state.completedLabIds);
  const quizScores = useGameStore((state) => state.quizScores);
  const quizContentVersions = useGameStore((state) => state.quizContentVersions);
  const reviewedFlashcardChapterIds = useGameStore((state) => state.reviewedFlashcardChapterIds);
  const flashcardContentVersions = useGameStore((state) => state.flashcardContentVersions);
  const sandboxDeviceCount = useSandboxStore((state) => state.workspace.devices.length);
  const progress = { completedLessonIds, completedLabIds, quizScores, quizContentVersions, reviewedFlashcardChapterIds, flashcardContentVersions };
  const currentChapter = chapters.find((chapter) => !isChapterComplete(chapter, progress)) ?? chapters[chapters.length - 1];
  const started = completedLessonIds.length + completedLabIds.length + Object.keys(quizScores).length > 0;

  const continueLearning = () => {
    const activity = getNextChapterActivity(currentChapter, progress);
    if (activity.type === 'lesson') router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: activity.id } });
    else if (activity.type === 'lab') router.push({ pathname: '/lab/[labId]', params: { labId: activity.id } });
    else if (activity.type === 'quiz') router.push({ pathname: '/quiz/[chapterId]', params: { chapterId: activity.id } });
    else if (activity.type === 'flashcards') router.push({ pathname: '/flashcards/[chapterId]', params: { chapterId: activity.id } });
    else router.push('/learn');
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
        <MenuCard title={started ? 'CONTINUE LEARNING' : 'START LEARNING'} detail={`Resume ${currentChapter.title}, or browse the complete learning path.`} status={`CHAPTER ${currentChapter.numberLabel}`} onPress={continueLearning} />
        <Pressable accessibilityRole="button" onPress={() => router.push('/learn')} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text variant="label" style={styles.secondaryActionText}>BROWSE CHAPTERS</Text></Pressable>
        <MenuCard title="NETWORK SANDBOX" detail="Build, configure, and test a bounded network with explained results." status={sandboxDeviceCount ? `${sandboxDeviceCount} DEVICES / AUTOSAVED` : 'EMPTY WORKSPACE'} onPress={() => router.push('/sandbox')} />
        <MenuCard title="SETTINGS" detail="Control motion, haptics, and locally stored progress." status="APP CONTROLS" onPress={() => router.push('/settings')} />
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
