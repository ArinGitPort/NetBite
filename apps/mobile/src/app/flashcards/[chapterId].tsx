import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, StyleSheet, ToastAndroid, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
import { ContentNotFound } from '@/shared/components/content-not-found';
import { Text } from '@/shared/components/console-text';
import { IconButton } from '@/shared/components/icon-button';
import { PageHeader } from '@/shared/components/page-header';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { SegmentedControl } from '@/shared/components/segmented-control';
import { selectionHaptic, successHaptic } from '@/shared/haptics';
import { useAppReducedMotion } from '@/shared/use-app-reduced-motion';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useExperienceStore, type FlashcardOrientation } from '@/store/use-experience-store';
import { useGameStore } from '@/store/use-game-store';
import { returnToOwningChapter } from '@/shared/navigation';

const FLIP_DURATION_MS = 420;
const SWIPE_DISTANCE = 64;

export function getFlashcardSwipeDirection(translationX: number, translationY: number): 'previous' | 'next' | undefined {
  if (Math.abs(translationX) < SWIPE_DISTANCE || Math.abs(translationX) <= Math.abs(translationY) * 1.35) return undefined;
  return translationX > 0 ? 'previous' : 'next';
}

function SwipeableCard({ children, onNext, onPrevious }: PropsWithChildren<{ onNext: () => void; onPrevious: () => void }>) {
  const swipe = useMemo(() => Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-24, 24])
    .runOnJS(true)
    .onEnd(({ translationX, translationY }) => {
      const direction = getFlashcardSwipeDirection(translationX, translationY);
      if (direction === 'previous') onPrevious();
      if (direction === 'next') onNext();
    }), [onNext, onPrevious]);

  return <GestureDetector gesture={swipe}>{children}</GestureDetector>;
}

export default function FlashcardsScreen() {
  const { hasContentAccess, presentationActive, testProEnabled } = useAuth();
  const accessBypass = presentationActive || testProEnabled;
  const progress = useGameStore();
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const chapter = getChapter(chapterId);
  const markReviewed = useGameStore((state) => state.markFlashcardsReviewed);
  const savedPosition = useGameStore((state) => state.flashcardPositions[chapterId ?? '']);
  const savedVersion = useGameStore((state) => state.flashcardContentVersions[chapterId ?? '']);
  const savedStudySession = useGameStore((state) => state.flashcardStudySessions[chapterId ?? '']);
  const saveFlashcardPosition = useGameStore((state) => state.saveFlashcardPosition);
  const clearFlashcardPosition = useGameStore((state) => state.clearFlashcardPosition);
  const saveFlashcardStudySession = useGameStore((state) => state.saveFlashcardStudySession);
  const clearFlashcardStudySession = useGameStore((state) => state.clearFlashcardStudySession);
  const saveLearningItem = useGameStore((state) => state.saveLearningItem);
  const removeLearningItem = useGameStore((state) => state.removeLearningItem);
  const savedLearningItems = useGameStore((state) => state.savedLearningItems);
  const flashcardOrientation = useExperienceStore((state) => state.flashcardOrientation);
  const setFlashcardOrientation = useExperienceStore((state) => state.setFlashcardOrientation);
  const initialIndex = Math.min(savedPosition ?? 0, Math.max(0, (chapter?.flashcards.length ?? 1) - 1));
  const deckPreviouslyReviewed = Boolean(chapter
    && progress.reviewedFlashcardChapterIds.includes(chapter.id)
    && savedVersion === chapter.flashcardVersion);
  const initialStudiedIds = chapter
    ? savedStudySession?.contentVersion === chapter.flashcardVersion
      ? savedStudySession.studiedCardIds.filter((id) => chapter.flashcards.some((card) => card.id === id))
      : deckPreviouslyReviewed ? chapter.flashcards.map(({ id }) => id) : []
    : [];
  const [cardIndex, setCardIndex] = useState(initialIndex);
  const [studiedIds, setStudiedIds] = useState<Set<string>>(() => new Set(initialStudiedIds));
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const flipProgress = useSharedValue(0);
  const reducedMotion = useAppReducedMotion();
  const { fontScale } = useWindowDimensions();
  const cardMinHeight = 380 * Math.max(fontScale, 1);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const card = chapter?.flashcards[cardIndex];
  const savedCard = card ? savedLearningItems[`flashcard:${card.id}`] : undefined;
  const cardIsSaved = Boolean(savedCard && !savedCard.deletedAt);
  const firstSide: FlashcardOrientation = flashcardOrientation;
  const otherSide: FlashcardOrientation = firstSide === 'question' ? 'answer' : 'question';
  const visibleSide = isFlipped ? otherSide : firstSide;
  const deckComplete = Boolean(chapter && studiedIds.size === chapter.flashcards.length);

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

  const resetFlip = useCallback(() => {
    if (flipTimer.current) {
      clearTimeout(flipTimer.current);
      flipTimer.current = null;
    }
    cancelAnimation(flipProgress);
    flipProgress.set(0);
    setIsFlipping(false);
    setIsFlipped(false);
  }, [flipProgress, setIsFlipped, setIsFlipping]);

  const showCardIndex = useCallback((nextIndex: number) => {
    if (!chapter || nextIndex < 0 || nextIndex >= chapter.flashcards.length || nextIndex === cardIndex) return;
    setCardIndex(nextIndex);
    if (!deckComplete) saveFlashcardPosition(chapter.id, nextIndex);
    resetFlip();
    selectionHaptic();
  }, [cardIndex, chapter, deckComplete, resetFlip, saveFlashcardPosition]);

  const showPreviousCard = useCallback(() => showCardIndex(cardIndex - 1), [cardIndex, showCardIndex]);
  const showNextCard = useCallback(() => showCardIndex(cardIndex + 1), [cardIndex, showCardIndex]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') showPreviousCard();
      if (event.key === 'ArrowRight') showNextCard();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNextCard, showPreviousCard]);

  if (chapter && !canAccessChapter(chapter.id, hasContentAccess)) return <PremiumLockedScreen label={`CHAPTER ${chapter.numberLabel} FLASHCARDS`} />;
  if (chapter && !canOpenChapter(chapter, progress, accessBypass)) return <CourseLockedScreen reason={getChapterLockReason(chapter, progress) ?? 'Complete the prior requirement.'} />;
  if (!chapter || !card) return <ContentNotFound label="Flashcards" />;

  const toggleCardFace = () => {
    if (isFlipping) return;
    const duration = reducedMotion ? 0 : FLIP_DURATION_MS;
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    if (nextFlipped && !studiedIds.has(card.id)) {
      const nextStudiedIds = new Set(studiedIds).add(card.id);
      setStudiedIds(nextStudiedIds);
      if (nextStudiedIds.size === chapter.flashcards.length) {
        if (!deckPreviouslyReviewed) markReviewed(chapter.id, chapter.flashcardVersion);
        clearFlashcardStudySession(chapter.id);
        clearFlashcardPosition(chapter.id);
        successHaptic();
        AccessibilityInfo.announceForAccessibility('Deck reviewed. Every card has been viewed on both sides.');
      } else {
        saveFlashcardStudySession(chapter.id, chapter.flashcardVersion, [...nextStudiedIds]);
      }
    }
    selectionHaptic();
    flipProgress.set(withTiming(nextFlipped ? 1 : 0, { duration, easing: Easing.inOut(Easing.cubic) }));
    if (duration === 0) return;
    setIsFlipping(true);
    flipTimer.current = setTimeout(() => {
      flipTimer.current = null;
      setIsFlipping(false);
    }, duration);
  };

  const notifySaveAction = (message: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    else AccessibilityInfo.announceForAccessibility(message);
  };

  const toggleCardSaved = () => {
    if (cardIsSaved) {
      removeLearningItem(`flashcard:${card.id}`);
      successHaptic();
      notifySaveAction('Card unsaved');
      return;
    }
    saveLearningItem({ targetType: 'flashcard', targetId: card.id, chapterId: chapter.id, title: card.prompt, note: '' });
    successHaptic();
    notifySaveAction('Card saved');
  };

  const restart = () => {
    setCardIndex(0);
    setStudiedIds(new Set());
    saveFlashcardPosition(chapter.id, 0);
    saveFlashcardStudySession(chapter.id, chapter.flashcardVersion, []);
    resetFlip();
    setOptionsVisible(false);
    selectionHaptic();
  };

  const changeOrientation = (orientation: FlashcardOrientation) => {
    if (orientation === flashcardOrientation) return;
    setFlashcardOrientation(orientation);
    resetFlip();
    selectionHaptic();
  };

  return (
    <Screen header={<PageHeader
      leading={{ accessibilityLabel: 'Close flashcards', icon: 'close', label: 'CLOSE', onPress: () => returnToOwningChapter('flashcards', chapter.id) }}
      trailingContent={<View accessibilityLabel="Flashcard actions" style={styles.headerActions}>
        <IconButton
          accessibilityHint={cardIsSaved ? 'Removes this flashcard from Saved Learning.' : 'Saves this flashcard for later review.'}
          accessibilityLabel={cardIsSaved ? 'Unsave flashcard' : 'Save flashcard'}
          iconSize={22}
          label="CARD"
          onPress={toggleCardSaved}
          selected={cardIsSaved}
          semanticIcon={cardIsSaved ? 'saved' : 'bookmark'}
        />
        <IconButton
          accessibilityHint="Opens question-first and answer-first preferences."
          accessibilityLabel="Flashcard options"
          iconSize={22}
          onPress={() => setOptionsVisible(true)}
          selected={optionsVisible}
          semanticIcon="settings"
        />
      </View>}
    />}>
      <View style={styles.header}>
        <View style={styles.progress}><ProgressBar progress={studiedIds.size / chapter.flashcards.length} /></View>
        <Text variant="label" style={styles.count}>{studiedIds.size}/{chapter.flashcards.length}</Text>
      </View>
      <View style={styles.sessionStatus}>
        <Text variant="label" style={styles.modeLabel}>RECALL FROM MEMORY</Text>
        <Text variant="technical" style={styles.queueCount}>CARD {cardIndex + 1} / {chapter.flashcards.length}</Text>
      </View>
      {deckComplete ? <View accessibilityLiveRegion="polite" style={styles.deckReviewed}>
        <Text variant="label" style={styles.deckReviewedTitle}>DECK REVIEWED</Text>
        <Text variant="bodySmall" style={styles.deckReviewedCopy}>Every card has been viewed on both sides. You can keep browsing or close the deck.</Text>
      </View> : null}
      <Text variant="bodySmall" style={styles.instructions}>Think of the other side, then tap the card to flip it. Swipe or use the arrows to browse.</Text>
      <SwipeableCard onNext={showNextCard} onPrevious={showPreviousCard}>
        <Pressable
          accessibilityHint="Flips between the question and answer sides."
          accessibilityRole="button"
          accessibilityState={{ disabled: isFlipping }}
          accessibilityLabel={visibleSide === 'question'
            ? `Question: ${card.prompt}`
            : `Answer: ${card.answer}. ${card.explanation}`}
          disabled={isFlipping}
          onPress={toggleCardFace}
          style={({ pressed }) => [styles.cardPressable, { minHeight: cardMinHeight }, pressed && styles.pressed]}>
          <View style={styles.cardScene}>
            <Animated.View accessible={false} style={[styles.cardFace, styles.cardFront, styles.noPointerEvents, frontAnimatedStyle]}>
              {firstSide === 'question' ? (
                <>
                  <Text variant="label" style={styles.cardLabel}>QUESTION</Text>
                  <Text variant="sectionHeading" style={styles.prompt}>{card.prompt}</Text>
                </>
              ) : (
                <>
                  <Text variant="label" style={styles.cardLabel}>ANSWER</Text>
                  <Text variant="body" style={styles.answer}>{card.answer}</Text>
                  <View style={styles.explanation}>
                    <Text variant="label" style={styles.explanationLabel}>WHY IT MATTERS</Text>
                    <Text variant="bodySmall" style={styles.explanationText}>{card.explanation}</Text>
                  </View>
                </>
              )}
              <Text variant="label" style={styles.tapHint}>TAP TO FLIP</Text>
            </Animated.View>
            <Animated.View accessible={false} style={[styles.cardFace, styles.cardBack, styles.noPointerEvents, backAnimatedStyle]}>
              {otherSide === 'question' ? (
                <>
                  <Text variant="label" style={styles.cardLabel}>QUESTION</Text>
                  <Text variant="sectionHeading" style={styles.prompt}>{card.prompt}</Text>
                </>
              ) : (
                <>
                  <Text variant="label" style={styles.cardLabel}>ANSWER</Text>
                  <Text variant="body" style={styles.answer}>{card.answer}</Text>
                  <View style={styles.explanation}>
                    <Text variant="label" style={styles.explanationLabel}>WHY IT MATTERS</Text>
                    <Text variant="bodySmall" style={styles.explanationText}>{card.explanation}</Text>
                  </View>
                </>
              )}
              <Text variant="label" style={styles.tapHint}>TAP TO FLIP</Text>
            </Animated.View>
          </View>
        </Pressable>
      </SwipeableCard>
      <View style={styles.browseActions}>
        <AppButton disabled={cardIndex === 0} label="Previous" leadingIcon="arrow-left" style={styles.browseButton} variant="utility" onPress={showPreviousCard} />
        <AppButton disabled={cardIndex >= chapter.flashcards.length - 1} label="Next" trailingIcon="arrow-right" style={styles.browseButton} variant="utility" onPress={showNextCard} />
      </View>
      <Modal animationType="fade" onRequestClose={() => setOptionsVisible(false)} statusBarTranslucent transparent visible={optionsVisible}>
        <View style={styles.optionsBackdrop}>
          <View accessibilityViewIsModal style={styles.optionsPanel}>
            <View style={styles.optionsHeader}>
              <View style={styles.optionsHeading}>
                <Text variant="label" style={styles.optionsEyebrow}>FLASHCARD SETTINGS</Text>
                <Text variant="sectionHeading" style={styles.optionsTitle}>Choose the first side</Text>
              </View>
              <IconButton accessibilityLabel="Close flashcard options" icon="close" iconSize={20} onPress={() => setOptionsVisible(false)} />
            </View>
            <Text variant="bodySmall" style={styles.optionsCopy}>Every new card starts on this side. You can still flip either direction at any time.</Text>
            <SegmentedControl
              label="Choose which flashcard side appears first"
              onChange={changeOrientation}
              options={[
                { id: 'question', label: 'QUESTION FIRST' },
                { id: 'answer', label: 'ANSWER FIRST' },
              ]}
              value={flashcardOrientation}
            />
            <AppButton label="Restart deck" variant="secondary" onPress={restart} />
            <AppButton label="Done" onPress={() => setOptionsVisible(false)} />
          </View>
        </View>
      </Modal>
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
  deckReviewed: { marginTop: Space.md, padding: Space.md, borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.greenSoft },
  deckReviewedTitle: { color: Palette.green, fontFamily: Fonts.medium },
  deckReviewedCopy: { color: Palette.text, marginTop: Space.xs },
  headerActions: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  instructions: { color: Palette.textMuted, marginTop: Space.sm, marginBottom: Space.lg },
  cardPressable: { minHeight: 380 },
  cardScene: { flex: 1, minHeight: 380 },
  cardFace: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, minHeight: 380, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Space.lg, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' },
  cardFront: { backgroundColor: Palette.surfaceRaised, borderTopColor: Palette.accent, borderTopWidth: 2 },
  cardBack: { backgroundColor: Palette.surfaceRaised, borderTopColor: Palette.orange, borderTopWidth: 2 },
  noPointerEvents: { pointerEvents: 'none' },
  cardLabel: { color: Palette.accentBright, fontFamily: Fonts.medium },
  prompt: { color: Palette.white, textAlign: 'center', fontFamily: Fonts.semibold, marginTop: Space.lg },
  answer: { color: Palette.white, textAlign: 'center', marginTop: Space.lg },
  tapHint: { position: 'absolute', bottom: Space.lg, color: Palette.textMuted, fontFamily: Fonts.regular, textAlign: 'center' },
  explanation: { alignSelf: 'stretch', minWidth: 0, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, padding: Space.lg, borderRadius: Radius.md, marginTop: Space.xxl },
  explanationLabel: { color: Palette.orange, fontFamily: Fonts.medium },
  explanationText: { color: Palette.white, marginTop: Space.xs },
  pressed: { opacity: 0.85 },
  browseActions: { flexDirection: 'row', gap: Space.sm, marginTop: Space.md, marginBottom: Space.md },
  browseButton: { flex: 1, minWidth: 0 },
  optionsBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.xl, backgroundColor: 'rgba(10, 8, 11, 0.84)' },
  optionsPanel: { width: '100%', maxWidth: 460, gap: Space.lg, padding: Space.xl, backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border },
  optionsHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Space.md },
  optionsHeading: { minWidth: 0, flex: 1 },
  optionsEyebrow: { color: Palette.accentBright, fontFamily: Fonts.medium },
  optionsTitle: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xs },
  optionsCopy: { color: Palette.textMuted },
});
