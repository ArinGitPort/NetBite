import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getLesson } from '@/content/chapters';
import { LessonFieldNote } from '@/features/lessons/components/lesson-field-note';
import { LessonIllustration } from '@/features/lessons/components/lesson-illustration';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { selectionHaptic, successHaptic } from '@/shared/haptics';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const completeLesson = useGameStore((state) => state.completeLesson);
  const lessonResult = getLesson(lessonId);
  const [completionVisible, setCompletionVisible] = useState(false);

  if (!lessonResult) {
    return <Screen><Text variant="body">Lesson not found.</Text><AppButton label="Back to home" onPress={() => router.replace('/')} /></Screen>;
  }
  const { chapter, lesson, index } = lessonResult;
  const previousLesson = chapter.lessons[index - 1];

  const finish = () => {
    completeLesson(lesson.id);
    const nextLesson = chapter.lessons[index + 1];
    if (nextLesson) {
      selectionHaptic();
      router.replace({ pathname: '/lesson/[lessonId]', params: { lessonId: nextLesson.id } });
    } else {
      successHaptic();
      setCompletionVisible(true);
    }
  };

  const goToPreviousLesson = () => {
    if (!previousLesson) return;
    selectionHaptic();
    router.replace({ pathname: '/lesson/[lessonId]', params: { lessonId: previousLesson.id } });
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <IconButton accessibilityLabel="Close lessons and return to chapter" icon="close" onPress={() => router.dismissTo(`/chapter/${chapter.id}`)} />
        <View style={styles.progress}><ProgressBar progress={(index + 1) / chapter.lessons.length} /></View>
        <Text variant="label" style={styles.count}>{index + 1}/{chapter.lessons.length}</Text>
      </View>
      <Text variant="label" style={styles.eyebrow}>{lesson.eyebrow}</Text>
      <Text variant="screenTitle" style={styles.title}>{lesson.title}</Text>
      <LessonIllustration type={lesson.illustration} />
      <Text variant="body" style={styles.body}>{lesson.body}</Text>
      {lesson.fieldNote ? <LessonFieldNote note={lesson.fieldNote} /> : null}
      {lesson.termNote ? (
        <View style={styles.termNote}>
          <Text variant="label" style={styles.termNoteLabel}>WHAT IS {lesson.termNote.term}?</Text>
          <Text variant="body" style={styles.termNoteText}>{lesson.termNote.definition}</Text>
        </View>
      ) : null}
      <View style={styles.takeaway}>
        <Text variant="label" style={styles.takeawayLabel}>KEY IDEA</Text>
        <Text variant="body" style={styles.takeawayText}>{lesson.takeaway}</Text>
      </View>
      <View style={styles.spacer} />
      <View style={styles.navigationActions}>
        <AppButton
          label="Previous lesson"
          leadingIcon="arrow-left"
          disabled={!previousLesson}
          variant="secondary"
          onPress={goToPreviousLesson}
        />
        <AppButton
          label={index === chapter.lessons.length - 1 ? 'Finish lessons' : 'Next lesson'}
          trailingIcon={index === chapter.lessons.length - 1 ? 'check' : 'arrow-right'}
          onPress={finish}
        />
      </View>
      <FeedbackModal
        visible={completionVisible}
        tone="success"
        eyebrow="LESSONS COMPLETE"
        title="Ready for focused practice?"
        message={`You completed all ${chapter.lessons.length} Chapter ${chapter.id} lessons. The mini lab reinforces one practical chapter skill.`}
        detail="The chapter screen identifies the lesson connected to this practice. You can start now or return later."
        icon="check"
        onRequestClose={() => setCompletionVisible(false)}
        secondaryAction={{ label: 'Back to chapter', leadingIcon: 'arrow-left', variant: 'secondary', onPress: () => router.dismissTo(`/chapter/${chapter.id}`) }}
        primaryAction={{ label: 'Start mini lab', trailingIcon: 'arrow-right', onPress: () => router.replace({ pathname: '/lab/[labId]', params: { labId: chapter.lab.id } }) }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.xxl },
  progress: { flex: 1 },
  count: { width: 56, textAlign: 'right', color: Palette.textMuted },
  eyebrow: { color: Palette.accentBright, fontFamily: Fonts.medium, marginBottom: Space.sm },
  title: { color: Palette.text, fontFamily: Fonts.semibold, textTransform: 'uppercase', marginBottom: Space.xl },
  body: { color: Palette.text, marginTop: Space.xl },
  termNote: { backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border, padding: Space.lg, marginTop: Space.md },
  termNoteLabel: { color: Palette.accentBright, fontFamily: Fonts.medium, marginBottom: Space.xs },
  termNoteText: { color: Palette.text },
  takeaway: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.green, padding: Space.lg, borderRadius: Radius.md, marginTop: Space.xl },
  takeawayLabel: { color: Palette.green, fontFamily: Fonts.medium, marginBottom: Space.xs },
  takeawayText: { color: Palette.text },
  spacer: { flex: 1, minHeight: Space.xl },
  navigationActions: { gap: Space.md },
});
