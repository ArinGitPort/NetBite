import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { getChapter } from '@/content/chapters';
import { canAccessChapter } from '@/core/account/access';
import { canOpenChapter, getChapterLockReason } from '@/core/learning/course-access';
import { useAuth } from '@/features/account/auth-context';
import { PremiumLockedScreen } from '@/features/account/components/premium-locked-screen';
import { CourseLockedScreen } from '@/features/account/components/course-locked-screen';
import { AppButton } from '@/shared/components/app-button';
import { AppIcon } from '@/shared/components/app-icon';
import { ContentNotFound } from '@/shared/components/content-not-found';
import { Text } from '@/shared/components/console-text';
import { IconButton } from '@/shared/components/icon-button';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { selectionHaptic, successHaptic } from '@/shared/haptics';
import { getEffectiveWidth, getResponsiveMode } from '@/shared/responsive-layout';
import { useAppReducedMotion } from '@/shared/use-app-reduced-motion';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';
import { returnToOwningChapter } from '@/shared/navigation';

const FLIP_DURATION_MS = 420;

export default function FlashcardsScreen() {
  const { hasContentAccess, presentationActive, testProEnabled } = useAuth();
  const accessBypass = presentationActive || testProEnabled;
  const progress = useGameStore();
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const chapter = getChapter(chapterId);
  const markReviewed = useGameStore((state) => state.markFlashcardsReviewed);
  const savedPosition = useGameStore((state) => state.flashcardPositions[chapterId ?? '']);
  const savedVersion = useGameStore((state) => state.flashcardContentVersions[chapterId ?? '']);
  const saveFlashcardPosition = useGameStore((state) => state.saveFlashcardPosition);
  const clearFlashcardPosition = useGameStore((state) => state.clearFlashcardPosition);
  const recordReviewResult = useGameStore((state) => state.recordReviewResult);
  const saveLearningItem = useGameStore((state) => state.saveLearningItem);
  const savedLearningItems = useGameStore((state) => state.savedLearningItems);
  const currentSavedPosition = chapter && savedVersion === chapter.flashcardVersion ? savedPosition : 0;
  const initialIndex = Math.min(currentSavedPosition ?? 0, Math.max(0, (chapter?.flashcards.length ?? 1) - 1));
  const initialQueue = chapter
    ? [...chapter.flashcards.slice(initialIndex), ...chapter.flashcards.slice(0, initialIndex)].map(({ id }) => id)
    : [];
  const [queue, setQueue] = useState(initialQueue);
  const [queueIndex, setQueueIndex] = useState(0);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() => new Set());
  const [retryIds, setRetryIds] = useState<Set<string>>(() => new Set());
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const flipProgress = useSharedValue(0);
  const reducedMotion = useAppReducedMotion();
  const { width, fontScale } = useWindowDimensions();
  const compactLayout = getResponsiveMode(getEffectiveWidth(width, fontScale)) === 'compact';
  const cardMinHeight = 380 * Math.max(fontScale, 1);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const card = chapter?.flashcards.find(({ id }) => id === queue[queueIndex]);

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 0.499, 0.5, 1], [1, 1, 0, 0]),
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 0.499, 0.5, 1], [0, 0, 1, 1]),
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` },
    ],
  }));

  useEffect(() => () => {
    if (flipTimer.current) clearTimeout(flipTimer.current);
  }, []);

  if (chapter && !canAccessChapter(chapter.id, hasContentAccess)) return <PremiumLockedScreen label={`CHAPTER ${chapter.numberLabel} FLASHCARDS`} />;
  if (chapter && !canOpenChapter(chapter, progress, accessBypass)) return <CourseLockedScreen reason={getChapterLockReason(chapter, progress) ?? 'Complete the prior requirement.'} />;
  if (!chapter || !card) return <ContentNotFound label="Flashcards" />;

  const resetFlip = () => {
    if (flipTimer.current) {
      clearTimeout(flipTimer.current);
      flipTimer.current = null;
    }
    cancelAnimation(flipProgress);
    flipProgress.set(0);
    setIsFlipping(false);
    setRevealed(false);
  };

  const revealAnswer = () => {
    if (isFlipping || revealed) return;
    const duration = reducedMotion ? 0 : FLIP_DURATION_MS;
    setRevealed(true);
    selectionHaptic();
    flipProgress.set(withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) }));
    if (duration === 0) return;
    setIsFlipping(true);
    flipTimer.current = setTimeout(() => {
      flipTimer.current = null;
      setIsFlipping(false);
    }, duration);
  };

  const advance = (nextQueue: string[], nextMastered: Set<string>) => {
    const nextQueueIndex = queueIndex + 1;
    setQueue(nextQueue);
    setMasteredIds(nextMastered);
    if (nextMastered.size === chapter.flashcards.length) {
      markReviewed(chapter.id, chapter.flashcardVersion);
      clearFlashcardPosition(chapter.id);
      successHaptic();
      setFinished(true);
      return;
    }
    const nextCardId = nextQueue[nextQueueIndex];
    const originalIndex = chapter.flashcards.findIndex(({ id }) => id === nextCardId);
    setQueueIndex(nextQueueIndex);
    saveFlashcardPosition(chapter.id, Math.max(0, originalIndex));
    resetFlip();
  };

  const reviewAgain = () => {
    recordReviewResult({ kind: 'flashcard', contentId: card.id, lessonId: card.lessonId, chapterId: chapter.id, contentVersion: chapter.flashcardVersion }, false);
    const nextRetryIds = new Set(retryIds).add(card.id);
    const isAlreadyQueued = queue.slice(queueIndex + 1).includes(card.id);
    setRetryIds(nextRetryIds);
    advance(isAlreadyQueued ? queue : [...queue, card.id], new Set(masteredIds));
  };

  const gotIt = () => {
    recordReviewResult({ kind: 'flashcard', contentId: card.id, lessonId: card.lessonId, chapterId: chapter.id, contentVersion: chapter.flashcardVersion }, true);
    advance(queue, new Set(masteredIds).add(card.id));
  };

  const saveCard = () => saveLearningItem({ targetType: 'flashcard', targetId: card.id, chapterId: chapter.id, title: card.prompt, note: savedLearningItems[`flashcard:${card.id}`]?.note ?? '' });

  const restart = () => {
    setQueue(chapter.flashcards.map(({ id }) => id));
    setQueueIndex(0);
    setMasteredIds(new Set());
    setRetryIds(new Set());
    setFinished(false);
    saveFlashcardPosition(chapter.id, 0);
    resetFlip();
  };

  if (finished) {
    return (
      <Screen>
        <View style={styles.finished}>
          <AppIcon name="check" size={32} />
          <Text variant="label" style={styles.eyebrow}>ACTIVE RECALL COMPLETE</Text>
          <Text variant="screenTitle" style={styles.finishedTitle}>{chapter.flashcards.length} ideas retrieved</Text>
          <Text variant="body" style={styles.finishedCopy}>
            {retryIds.size
              ? `${retryIds.size} ${retryIds.size === 1 ? 'card was' : 'cards were'} repeated until you recalled the answer.`
              : 'You recalled every answer on the first pass.'}
          </Text>
        </View>
        <View style={styles.navigationActions}>
          <AppButton label="Practice again" variant="secondary" onPress={restart} />
          <AppButton label="Back to chapter" leadingIcon="arrow-left" onPress={() => returnToOwningChapter('flashcards', chapter.id)} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close flashcards" icon="close" onPress={() => returnToOwningChapter('flashcards', chapter.id)} />
        <View style={styles.progress}><ProgressBar progress={masteredIds.size / chapter.flashcards.length} /></View>
        <Text variant="label" style={styles.count}>{masteredIds.size}/{chapter.flashcards.length}</Text>
      </View>
      <View style={styles.sessionStatus}>
        <Text variant="label" style={styles.modeLabel}>RECALL FROM MEMORY</Text>
        <Text variant="technical" style={styles.queueCount}>CARD {queueIndex + 1} / {queue.length}</Text>
      </View>
      <View style={styles.saveRow}><AppButton label={savedLearningItems[`flashcard:${card.id}`] && !savedLearningItems[`flashcard:${card.id}`].deletedAt ? 'Saved' : 'Save card'} selected={Boolean(savedLearningItems[`flashcard:${card.id}`] && !savedLearningItems[`flashcard:${card.id}`].deletedAt)} variant="utility" onPress={saveCard} /></View>
      <Text variant="bodySmall" style={styles.instructions}>Say the answer in your own words before revealing it. Then rate your recall honestly.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isFlipping }}
        accessibilityLabel={revealed
          ? `Answer: ${card.answer}. ${card.explanation}`
          : `Question: ${card.prompt}. Think of your answer, then tap to reveal.`}
        disabled={isFlipping}
        onPress={revealAnswer}
        style={({ pressed }) => [styles.cardPressable, { minHeight: cardMinHeight }, pressed && styles.pressed]}>
        <View style={styles.cardScene}>
          <Animated.View accessible={false} style={[styles.cardFace, styles.cardFront, styles.noPointerEvents, frontAnimatedStyle]}>
            <Text variant="label" style={styles.cardLabel}>QUESTION</Text>
            <Text variant="sectionHeading" style={styles.prompt}>{card.prompt}</Text>
            <Text variant="label" style={styles.tapHint}>Answer first / then tap to reveal</Text>
          </Animated.View>
          <Animated.View accessible={false} style={[styles.cardFace, styles.cardBack, styles.noPointerEvents, backAnimatedStyle]}>
            <Text variant="label" style={styles.cardLabel}>ANSWER</Text>
            <Text variant="body" style={styles.answer}>{card.answer}</Text>
            <View style={styles.explanation}>
              <Text variant="label" style={styles.explanationLabel}>WHY IT MATTERS</Text>
              <Text variant="bodySmall" style={styles.explanationText}>{card.explanation}</Text>
            </View>
          </Animated.View>
        </View>
      </Pressable>
      <View style={styles.spacer} />
      {!revealed ? (
        <AppButton label="Reveal answer" onPress={revealAnswer} />
      ) : (
        <View style={[styles.ratingActions, compactLayout && styles.ratingActionsCompact]}>
          <AppButton label="Review again" variant="secondary" style={styles.ratingButton} onPress={reviewAgain} />
          <AppButton label="Got it" trailingIcon="check" style={styles.ratingButton} onPress={gotIt} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.xl },
  progress: { flex: 1 },
  count: { width: 64, textAlign: 'right', color: Palette.textMuted },
  sessionStatus: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm },
  modeLabel: { color: Palette.accentBright, fontFamily: Fonts.medium },
  queueCount: { color: Palette.textMuted },
  instructions: { color: Palette.textMuted, marginTop: Space.sm, marginBottom: Space.lg },
  saveRow: { alignItems: 'flex-start', marginBottom: Space.md },
  cardPressable: { minHeight: 380 },
  cardScene: { flex: 1, minHeight: 380 },
  cardFace: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, minHeight: 380, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Space.lg, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' },
  cardFront: { backgroundColor: Palette.surfaceRaised, borderTopColor: Palette.accent, borderTopWidth: 2 },
  cardBack: { backgroundColor: Palette.surfaceRaised, borderTopColor: Palette.orange, borderTopWidth: 2 },
  noPointerEvents: { pointerEvents: 'none' },
  cardLabel: { color: Palette.accentBright, fontFamily: Fonts.medium },
  prompt: { color: Palette.white, textAlign: 'center', fontFamily: Fonts.semibold, marginTop: Space.lg },
  answer: { color: Palette.white, textAlign: 'center', marginTop: Space.lg },
  tapHint: { position: 'absolute', bottom: Space.xl, color: Palette.textMuted, fontFamily: Fonts.regular, textAlign: 'center' },
  explanation: { alignSelf: 'stretch', minWidth: 0, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, padding: Space.lg, borderRadius: Radius.md, marginTop: Space.xxl },
  explanationLabel: { color: Palette.orange, fontFamily: Fonts.medium },
  explanationText: { color: Palette.white, marginTop: Space.xs },
  pressed: { opacity: 0.85 },
  spacer: { flex: 1, minHeight: Space.xl },
  ratingActions: { flexDirection: 'row', gap: Space.md },
  ratingActionsCompact: { flexDirection: 'column' },
  ratingButton: { flex: 1, minWidth: 0 },
  navigationActions: { gap: Space.md },
  finished: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 72 },
  eyebrow: { color: Palette.accentBright, fontFamily: Fonts.medium, textAlign: 'center', marginBottom: Space.lg },
  finishedTitle: { color: Palette.text, fontFamily: Fonts.semibold, textTransform: 'uppercase', textAlign: 'center' },
  finishedCopy: { color: Palette.textMuted, textAlign: 'center', marginTop: Space.md, maxWidth: 420 },
});
