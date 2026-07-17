import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { chapterOneLessons } from '@/content/chapter-one';
import { LessonIllustration } from '@/features/lessons/components/lesson-illustration';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const completeLesson = useGameStore((state) => state.completeLesson);
  const index = chapterOneLessons.findIndex((item) => item.id === lessonId);
  const lesson = chapterOneLessons[index];

  if (!lesson) {
    return <Screen><Text>Lesson not found.</Text><AppButton label="Back to chapter" onPress={() => router.replace('/chapter/1')} /></Screen>;
  }

  const finish = () => {
    completeLesson(lesson.id);
    const nextLesson = chapterOneLessons[index + 1];
    if (nextLesson) {
      router.replace({ pathname: '/lesson/[lessonId]', params: { lessonId: nextLesson.id } });
    } else {
      router.replace('/chapter/1');
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text onPress={() => router.back()} style={styles.close}>[X]</Text>
        <View style={styles.progress}><ProgressBar progress={(index + 1) / chapterOneLessons.length} /></View>
        <Text style={styles.count}>{index + 1}/{chapterOneLessons.length}</Text>
      </View>
      <Text style={styles.eyebrow}>{lesson.eyebrow}</Text>
      <Text style={styles.title}>{lesson.title}</Text>
      <LessonIllustration type={lesson.illustration} />
      <Text style={styles.body}>{lesson.body}</Text>
      <View style={styles.takeaway}>
        <Text style={styles.takeawayLabel}>KEY IDEA</Text>
        <Text style={styles.takeawayText}>{lesson.takeaway}</Text>
      </View>
      <View style={styles.spacer} />
      <AppButton label={index === chapterOneLessons.length - 1 ? 'Finish lessons' : 'Next lesson'} onPress={finish} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.xxl },
  close: { width: 44, color: Palette.text, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  progress: { flex: 1 },
  count: { width: 48, textAlign: 'right', color: Palette.textMuted, fontSize: 11, letterSpacing: 1.5 },
  eyebrow: { color: Palette.accentBright, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, marginBottom: Space.sm },
  title: { color: Palette.text, fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 24, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: Space.xl },
  body: { color: Palette.text, fontSize: 13, lineHeight: 21, marginTop: Space.xl },
  takeaway: { backgroundColor: Palette.greenSoft, borderWidth: 1, borderColor: Palette.green, padding: Space.lg, borderRadius: Radius.md, marginTop: Space.xl },
  takeawayLabel: { color: Palette.green, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, marginBottom: Space.xs },
  takeawayText: { color: Palette.text, fontSize: 12, lineHeight: 20 },
  spacer: { flex: 1, minHeight: Space.xl },
});
