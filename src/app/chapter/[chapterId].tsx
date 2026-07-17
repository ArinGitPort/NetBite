import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { chapterOneLessons } from '@/content/chapter-one';
import { Text } from '@/shared/components/console-text';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

interface ActivityRowProps {
  index: number;
  type: string;
  title: string;
  detail: string;
  complete: boolean;
  onPress: () => void;
}

function ActivityRow({ index, type, title, detail, complete, onPress }: ActivityRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.activity, pressed && styles.pressed]}>
      <View style={[styles.activityNumber, complete && styles.activityComplete]}>
        <Text style={[styles.activityNumberText, complete && styles.activityCompleteText]}>{complete ? 'OK' : index}</Text>
      </View>
      <View style={styles.activityCopy}>
        <Text style={styles.activityType}>{type}</Text>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityDetail}>{detail}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

export default function ChapterScreen() {
  const completedLessonIds = useGameStore((state) => state.completedLessonIds);
  const labComplete = useGameStore((state) => state.labComplete);
  const quizScore = useGameStore((state) => state.quizScore);
  const flashcardsReviewed = useGameStore((state) => state.flashcardsReviewed);
  const completed = completedLessonIds.length + Number(labComplete) + Number(quizScore !== undefined) + Number(flashcardsReviewed);
  const total = chapterOneLessons.length + 3;

  return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>[ BACK / HOME ]</Text></Pressable>
      <View style={styles.hero}>
        <Text style={styles.chapterLabel}>CHAPTER 01</Text>
        <Text style={styles.title}>INTRODUCTION TO NETWORKS</Text>
        <Text style={styles.subtitle}>Discover what networks are, meet the devices, then build your first connection.</Text>
        <ProgressBar progress={completed / total} />
        <Text style={styles.progressText}>{completed} OF {total} ACTIVITIES COMPLETE</Text>
      </View>

      <Text style={styles.sectionTitle}>LESSONS</Text>
      {chapterOneLessons.map((lesson, index) => (
        <ActivityRow
          key={lesson.id}
          index={index + 1}
          type="LESSON"
          title={lesson.title}
          detail="About 1 minute"
          complete={completedLessonIds.includes(lesson.id)}
          onPress={() => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } })}
        />
      ))}

      <Text style={styles.sectionTitle}>PRACTICE</Text>
      <ActivityRow index={5} type="MINI LAB" title="Build your first network" detail="Connect two PCs to a switch" complete={labComplete} onPress={() => router.push('/lab/first-network')} />
      <ActivityRow index={6} type="QUIZ" title="Check your understanding" detail="5 beginner questions" complete={quizScore !== undefined} onPress={() => router.push('/quiz/1')} />
      <ActivityRow index={7} type="FLASHCARDS" title="Review the key terms" detail="5 cards" complete={flashcardsReviewed} onPress={() => router.push('/flashcards/1')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backText: { color: Palette.accentBright, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  hero: { backgroundColor: Palette.surfaceRaised, padding: Space.xl, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.accent, marginVertical: Space.lg, gap: Space.md },
  chapterLabel: { color: Palette.accentBright, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  title: { color: Palette.white, fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 24, letterSpacing: 1.5 },
  subtitle: { color: Palette.textMuted, fontSize: 12, lineHeight: 20, marginBottom: Space.sm },
  progressText: { color: Palette.textMuted, fontFamily: Fonts.regular, fontSize: 11, letterSpacing: 1.5 },
  sectionTitle: { color: Palette.text, fontFamily: Fonts.semibold, fontSize: 13, letterSpacing: 1.5, marginTop: Space.xl, marginBottom: Space.md },
  activity: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, padding: Space.lg, marginBottom: Space.md },
  pressed: { opacity: 0.7 },
  activityNumber: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm, backgroundColor: Palette.accentSoft },
  activityComplete: { backgroundColor: Palette.mint },
  activityNumberText: { color: Palette.accentBright, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  activityCompleteText: { color: Palette.green },
  activityCopy: { flex: 1, marginLeft: Space.md },
  activityType: { color: Palette.accentBright, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  activityTitle: { color: Palette.text, fontFamily: Fonts.medium, fontSize: 12, lineHeight: 18, marginVertical: Space.xs, textTransform: 'uppercase', letterSpacing: 1.5 },
  activityDetail: { color: Palette.textMuted, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  arrow: { color: Palette.textMuted, fontSize: 16 },
});
