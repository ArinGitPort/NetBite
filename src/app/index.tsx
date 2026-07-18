import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { chapterOneLessons } from '@/content/chapter-one';
import { AppButton } from '@/shared/components/app-button';
import { AppIcon } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

export default function HomeScreen() {
  const completedLessonIds = useGameStore((state) => state.completedLessonIds);
  const labComplete = useGameStore((state) => state.labComplete);
  const quizScore = useGameStore((state) => state.quizScore);
  const flashcardsReviewed = useGameStore((state) => state.flashcardsReviewed);
  const completedSteps = completedLessonIds.length + Number(labComplete) + Number(quizScore !== undefined) + Number(flashcardsReviewed);
  const totalSteps = chapterOneLessons.length + 3;
  const progress = completedSteps / totalSteps;

  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.logo}><Text style={styles.logoText}>N</Text></View>
        <Text style={styles.brand}>NETBITE</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.title}>LEARN NETWORKING BY BUILDING</Text>
        <Text style={styles.subtitle}>Short lessons and focused labs for your first network.</Text>
      </View>

      <View style={styles.continueCard}>
        <View style={styles.cardTop}>
          <View style={styles.chapterBadge}><Text style={styles.chapterBadgeText}>01</Text></View>
          <View style={styles.cardTitleGroup}>
            <Text style={styles.cardEyebrow}>CURRENT CHAPTER</Text>
            <Text style={styles.cardTitle}>INTRODUCTION TO NETWORKS</Text>
          </View>
        </View>
        <ProgressBar progress={progress} />
        <View style={styles.progressRow}>
          <Text style={styles.muted}>{completedSteps} OF {totalSteps} ACTIVITIES</Text>
          <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
        </View>
        <AppButton label={progress > 0 ? 'Continue chapter' : 'Start chapter'} trailingIcon="arrow-right" onPress={() => router.push('/chapter/1')} />
      </View>

      <Text style={styles.sectionTitle}>LEARNING PATH</Text>
      <View style={styles.circuit}>
        <View style={styles.pathRail} />
        <Pressable onPress={() => router.push('/chapter/1')} style={({ pressed }) => [styles.pathRow, pressed && styles.pressed]}>
          <View style={[styles.circuitNode, styles.activeNode]} />
          <View style={styles.pathCopy}>
            <Text style={styles.pathLabel}>CHAPTER 01</Text>
            <Text style={styles.pathTitle}>INTRODUCTION TO NETWORKS</Text>
            <Text style={styles.muted}>04 LESSONS / 01 LAB / 05 QUESTIONS</Text>
          </View>
        </Pressable>
        <View style={[styles.pathRow, styles.lastPathRow, styles.locked]}>
          <View style={[styles.circuitNode, styles.lockedNode]} />
          <View style={styles.pathCopy}>
            <Text style={styles.pathLabel}>CHAPTER 02 / LOCKED</Text>
            <Text style={styles.pathTitle}>ETHERNET</Text>
            <Text style={styles.muted}>COMPLETE CH.01 TO UNLOCK</Text>
          </View>
          <AppIcon name="lock" size={24} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.xxl },
  logo: { width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Palette.accentSoft, borderWidth: 1, borderColor: Palette.accent, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: Palette.accent, fontFamily: Fonts.semibold, fontSize: 14 },
  brand: { marginLeft: Space.md, color: Palette.text, fontFamily: Fonts.semibold, fontSize: 14, letterSpacing: 1.5 },
  hero: { marginBottom: Space.xxl },
  title: { color: Palette.text, fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 24, letterSpacing: 1.5 },
  subtitle: { color: Palette.textMuted, fontSize: 12, lineHeight: 20, marginTop: Space.md, maxWidth: 430 },
  continueCard: { backgroundColor: Palette.surface, borderRadius: Radius.lg, padding: Space.xl, gap: Space.lg, borderWidth: 1, borderColor: Palette.border },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  chapterBadge: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Palette.greenSoft, borderWidth: 1, borderColor: Palette.green, alignItems: 'center', justifyContent: 'center' },
  chapterBadgeText: { color: Palette.green, fontFamily: Fonts.semibold, fontSize: 13 },
  cardTitleGroup: { flex: 1, marginLeft: Space.md },
  cardEyebrow: { color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  cardTitle: { color: Palette.text, fontFamily: Fonts.semibold, fontSize: 13, lineHeight: 20, marginTop: Space.xs, letterSpacing: 1.5 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: Palette.textMuted, fontSize: 11, lineHeight: 16, letterSpacing: 1.5 },
  progressPercent: { color: Palette.accentBright, fontSize: 11, letterSpacing: 1.5 },
  sectionTitle: { color: Palette.text, fontFamily: Fonts.semibold, fontSize: 13, letterSpacing: 1.5, marginTop: Space.xxl, marginBottom: Space.lg },
  pressed: { opacity: 0.7 },
  circuit: { position: 'relative', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, paddingVertical: Space.sm },
  pathRail: { position: 'absolute', left: 21, top: 0, bottom: 0, width: 1, backgroundColor: Palette.border },
  pathRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.lg, borderBottomWidth: 1, borderBottomColor: Palette.border },
  lastPathRow: { borderBottomWidth: 0 },
  circuitNode: { width: 12, height: 12, zIndex: 1 },
  activeNode: { backgroundColor: Palette.active },
  lockedNode: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.textMuted },
  pathCopy: { flex: 1, marginLeft: Space.lg },
  pathLabel: { color: Palette.accentBright, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  pathTitle: { color: Palette.text, fontFamily: Fonts.medium, fontSize: 12, letterSpacing: 1.5, marginVertical: Space.xs },
  locked: { opacity: 0.62 },
});
