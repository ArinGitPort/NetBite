import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, BackHandler, Image, Linking, Platform, StyleSheet, ToastAndroid, View } from 'react-native';

import { chapters, getLesson } from '@/content/chapters';
import { canAccessChapter } from '@/core/account/access';
import { canOpenChapter, getChapterLockReason } from '@/core/learning/course-access';
import { useAuth } from '@/features/account/auth-context';
import { PremiumLockedScreen } from '@/features/account/components/premium-locked-screen';
import { CourseLockedScreen } from '@/features/account/components/course-locked-screen';
import { LessonFieldNote } from '@/features/lessons/components/lesson-field-note';
import { LessonIllustration } from '@/features/lessons/components/lesson-illustration';
import { LessonCheckpoint } from '@/features/lessons/components/lesson-checkpoint';
import { LessonWorkedExample } from '@/features/lessons/components/lesson-worked-example';
import { isLessonCheckpointBlocking } from '@/features/lessons/checkpoint-rules';
import { AppButton } from '@/shared/components/app-button';
import { ContentNotFound } from '@/shared/components/content-not-found';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { PageHeader } from '@/shared/components/page-header';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { StudyNavigation } from '@/shared/components/study-navigation';
import { selectionHaptic, successHaptic } from '@/shared/haptics';
import { Fonts, Radius, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';
import { resolveLessonLabOrigin, returnToOriginatingLab, returnToOwningChapter } from '@/shared/navigation';
import { labRoute, lessonRoute } from '@/shared/routes';

export default function LessonScreen() {
  const styles = useThemeStyles(createStyles);
  const { hasContentAccess, presentationActive, testProEnabled } = useAuth();
  const accessBypass = presentationActive || testProEnabled;
  const progress = useGameStore();
  const { lessonId, fromLabId } = useLocalSearchParams<{ lessonId: string; fromLabId?: string }>();
  const completeLesson = useGameStore((state) => state.completeLesson);
  const completedLessonIds = useGameStore((state) => state.completedLessonIds);
  const removeLearningItem = useGameStore((state) => state.removeLearningItem);
  const saveLearningItem = useGameStore((state) => state.saveLearningItem);
  const recordReviewResult = useGameStore((state) => state.recordReviewResult);
  const savedLearningItems = useGameStore((state) => state.savedLearningItems);
  const lessonResult = getLesson(lessonId);
  const originCandidate = resolveLessonLabOrigin(fromLabId);
  const originChapter = chapters.find((item) => item.lab.id === originCandidate);
  const originatingLabId = originCandidate
    && originChapter
    && canAccessChapter(originChapter.id, hasContentAccess)
    && canOpenChapter(originChapter, progress, accessBypass)
    ? originCandidate
    : undefined;
  const [completionVisible, setCompletionVisible] = useState(false);
  const [checkpointResult, setCheckpointResult] = useState<{ lessonId: string; passed: boolean }>({ lessonId: '', passed: false });

  useEffect(() => {
    if (Platform.OS !== 'android' || !originatingLabId) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      returnToOriginatingLab(originatingLabId);
      return true;
    });
    return () => subscription.remove();
  }, [originatingLabId]);

  if (!lessonResult) {
    return <ContentNotFound label="Lesson" />;
  }
  const { chapter, lesson, index } = lessonResult;
  if (!canAccessChapter(chapter.id, hasContentAccess)) return <PremiumLockedScreen label={`CHAPTER ${chapter.numberLabel} LESSON`} />;
  if (!canOpenChapter(chapter, progress, accessBypass)) return <CourseLockedScreen reason={getChapterLockReason(chapter, progress) ?? 'Complete the prior requirement.'} />;
  const checkpointPassed = checkpointResult.lessonId === lesson.id && checkpointResult.passed;
  const lessonWasCompleted = completedLessonIds.includes(lesson.id);
  const checkpointRequired = Boolean(lesson.checkpoint) && !lessonWasCompleted;
  const checkpointBlocking = isLessonCheckpointBlocking(lesson, completedLessonIds, checkpointPassed);
  const previousLesson = chapter.lessons[index - 1];
  const exampleOwnsIllustration = lesson.example?.presentation === 'guided'
    && lesson.example.visual?.illustration === lesson.illustration;
  const lessonSaved = savedLearningItems[`lesson:${lesson.id}`];
  const checkpointReviewInput = {
    kind: 'checkpoint' as const,
    contentId: lesson.checkpoint?.reviewIdentity ?? lesson.id,
    lessonId: lesson.id,
    chapterId: chapter.id,
    contentVersion: chapter.checkpointVersion ?? 1,
  };
  const checkpointRule = lesson.sections?.[0] ?? { heading: 'KEY IDEA', body: lesson.takeaway };

  const finish = () => {
    completeLesson(lesson.id);
    const nextLesson = chapter.lessons[index + 1];
    if (nextLesson) {
      selectionHaptic();
      router.replace(lessonRoute(nextLesson.id, { fromLabId: originatingLabId }));
    } else {
      successHaptic();
      setCompletionVisible(true);
    }
  };

  const goToPreviousLesson = () => {
    if (!previousLesson) return;
    selectionHaptic();
    router.replace(lessonRoute(previousLesson.id, { fromLabId: originatingLabId }));
  };

  const closeLesson = () => {
    if (originatingLabId) returnToOriginatingLab(originatingLabId);
    else returnToOwningChapter('lesson', lesson.id);
  };

  const lessonIsSaved = Boolean(lessonSaved && !lessonSaved.deletedAt);
  const notifySaveAction = (message: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    else AccessibilityInfo.announceForAccessibility(message);
  };
  const announceRemoval = () => {
    successHaptic();
    notifySaveAction('Lesson unsaved');
  };

  const removeSavedLesson = () => {
    removeLearningItem(`lesson:${lesson.id}`);
    announceRemoval();
  };

  const toggleLessonSaved = () => {
    if (lessonIsSaved) {
      removeSavedLesson();
      return;
    }
    saveLearningItem({ targetType: 'lesson', targetId: lesson.id, chapterId: chapter.id, title: lesson.title, note: '' });
    successHaptic();
    notifySaveAction('Lesson saved');
  };

  return (
    <Screen header={<PageHeader
      leading={{ accessibilityLabel: originatingLabId ? 'Back to the originating lab' : 'Close lessons and return to chapter', icon: originatingLabId ? 'arrow-left' : 'close', label: originatingLabId ? 'BACK / LAB' : 'CLOSE', onPress: closeLesson }}
      trailingContent={<View accessibilityLabel="Lesson save actions" style={styles.headerSaveActions}>
        <IconButton accessibilityHint={lessonIsSaved ? 'Removes the complete lesson from Saved.' : 'Saves the complete lesson for later.'} accessibilityLabel={lessonIsSaved ? 'Unsave lesson' : 'Save lesson'} iconSize={22} label="LESSON" onPress={toggleLessonSaved} selected={lessonIsSaved} semanticIcon={lessonIsSaved ? 'saved' : 'bookmark'} />
      </View>}
    />}>
      <View style={styles.headerRow}>
        <View style={styles.progress}><ProgressBar progress={(index + 1) / chapter.lessons.length} /></View>
        <Text variant="label" style={styles.count}>{index + 1}/{chapter.lessons.length}</Text>
      </View>
      <Text variant="label" style={styles.eyebrow}>{lesson.eyebrow}</Text>
      <Text variant="screenTitle" style={styles.title}>{lesson.title}</Text>
      {!exampleOwnsIllustration ? <LessonIllustration type={lesson.illustration} /> : null}
      <Text variant="body" style={styles.body}>{lesson.body}</Text>
      {lesson.sections?.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text variant="sectionHeading" style={styles.sectionHeading}>{section.heading}</Text>
          <Text variant="body" style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}
      {lesson.example ? <LessonWorkedExample example={lesson.example} /> : null}
      {lesson.supportingAssets?.map((asset) => <View key={asset.id} style={styles.supportingAsset}>
        <Image accessible accessibilityLabel={asset.altText} resizeMode="contain" source={{ uri: asset.url }} style={[styles.supportingImage, { aspectRatio: asset.width / asset.height }]} />
        <Text variant="bodySmall" style={styles.assetAlt}>{asset.altText}</Text>
      </View>)}
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
      {lesson.sources?.length ? <View style={styles.sources}>
        <Text variant="sectionHeading" style={styles.sectionHeading}>OFFICIAL REFERENCES</Text>
        {lesson.sources.map((source) => <View key={source.id} style={styles.sourceRow}>
          <Text variant="bodySmall" style={styles.sourceLabel}>{source.label}</Text>
          {source.notes ? <Text variant="bodySmall" style={styles.assetAlt}>{source.notes}</Text> : null}
          <AppButton label={`Open ${source.label}`} variant="utility" onPress={() => void Linking.openURL(source.url)} />
        </View>)}
      </View> : null}
      {lesson.checkpoint && checkpointRequired ? (
        <LessonCheckpoint
          checkpoint={lesson.checkpoint}
          reviewLabel={checkpointRule.heading}
          reviewText={checkpointRule.body}
          onIncorrect={() => recordReviewResult(checkpointReviewInput, false)}
          onCorrect={({ hadIncorrectAttempt }) => {
            setCheckpointResult({ lessonId: lesson.id, passed: true });
            if (!hadIncorrectAttempt) recordReviewResult(checkpointReviewInput, true);
          }}
        />
      ) : null}
      <View style={styles.spacer} />
      <StudyNavigation
        previous={{ label: 'Previous lesson', disabled: !previousLesson, onPress: goToPreviousLesson }}
        next={{ label: index === chapter.lessons.length - 1 ? 'Finish lessons' : 'Next lesson', disabled: checkpointBlocking, complete: index === chapter.lessons.length - 1, onPress: finish }}
      />
      <FeedbackModal
        visible={completionVisible}
        tone="success"
        eyebrow="LESSONS COMPLETE"
        title="Ready for focused practice?"
        message={`You completed all ${chapter.lessons.length} Chapter ${chapter.id} lessons. The mini lab reinforces one practical chapter skill.`}
        detail="The chapter screen identifies the lesson connected to this practice. You can start now or return later."
        icon="check"
        onRequestClose={() => setCompletionVisible(false)}
        secondaryAction={originatingLabId
          ? { label: 'Keep reviewing', variant: 'secondary', onPress: () => setCompletionVisible(false) }
          : { label: 'Back to chapter', leadingIcon: 'arrow-left', variant: 'secondary', onPress: closeLesson }}
        primaryAction={originatingLabId
          ? { label: 'Return to lab', leadingIcon: 'arrow-left', onPress: closeLesson }
          : { label: 'Start mini lab', trailingIcon: 'arrow-right', onPress: () => router.replace(labRoute(chapter.lab.id)) }}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.xxl },
  progress: { flex: 1 },
  count: { width: 56, textAlign: 'right', color: colors.textMuted },
  eyebrow: { color: colors.accentBright, fontFamily: Fonts.medium, marginBottom: Space.sm },
  title: { color: colors.text, fontFamily: Fonts.semibold, textTransform: 'uppercase', marginBottom: Space.xl },
  headerSaveActions: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  body: { color: colors.text, marginTop: Space.xl },
  section: { marginTop: Space.lg },
  sectionHeading: { color: colors.orange, fontFamily: Fonts.semibold, textTransform: 'uppercase', marginBottom: Space.xs },
  sectionBody: { color: colors.text },
  termNote: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: Space.lg, marginTop: Space.md },
  termNoteLabel: { color: colors.accentBright, fontFamily: Fonts.medium, marginBottom: Space.xs },
  termNoteText: { color: colors.text },
  supportingAsset: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: Space.md, gap: Space.sm, marginTop: Space.lg },
  supportingImage: { width: '100%', maxHeight: 360, backgroundColor: colors.background },
  assetAlt: { color: colors.textMuted },
  sources: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: Space.lg, gap: Space.md, marginTop: Space.lg },
  sourceRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Space.md, gap: Space.sm },
  sourceLabel: { color: colors.text, fontFamily: Fonts.medium },
  takeaway: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.green, padding: Space.lg, borderRadius: Radius.md, marginTop: Space.xl },
  takeawayLabel: { color: colors.green, fontFamily: Fonts.medium, marginBottom: Space.xs },
  takeawayText: { color: colors.text },
  spacer: { flex: 1, minHeight: Space.xl },
});
