import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { getChapter } from '@/content/chapters';
import { AppButton } from '@/shared/components/app-button';
import { AppIcon } from '@/shared/components/app-icon';
import { ContentNotFound } from '@/shared/components/content-not-found';
import { Text } from '@/shared/components/console-text';
import { IconButton } from '@/shared/components/icon-button';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { selectionHaptic, successHaptic } from '@/shared/haptics';
import { getEffectiveWidth, getResponsiveMode } from '@/shared/responsive-layout';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

type FlashcardFront = 'term' | 'definition';

const FLIP_DURATION_MS = 420;

export default function FlashcardsScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const chapter = getChapter(chapterId);
  const markReviewed = useGameStore((state) => state.markFlashcardsReviewed);
  const savedPosition = useGameStore((state) => state.flashcardPositions[chapterId ?? '']);
  const savedContentVersion = useGameStore((state) => state.flashcardContentVersions[chapterId ?? '']);
  const saveFlashcardPosition = useGameStore((state) => state.saveFlashcardPosition);
  const clearFlashcardPosition = useGameStore((state) => state.clearFlashcardPosition);
  const currentSavedPosition = chapter && savedContentVersion === chapter.contentVersion ? savedPosition : 0;
  const initialIndex = Math.min(currentSavedPosition ?? 0, Math.max(0, (chapter?.flashcards.length ?? 1) - 1));
  const [index, setIndex] = useState(initialIndex);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [frontSide, setFrontSide] = useState<FlashcardFront>('term');
  const [isFlipping, setIsFlipping] = useState(false);
  const flipProgress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const { width, fontScale } = useWindowDimensions();
  const compactLayout = getResponsiveMode(getEffectiveWidth(width, fontScale)) === 'compact';
  const cardMinHeight = 400 * Math.max(fontScale, 1);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const card = chapter?.flashcards[index];
  const showingTerm = frontSide === 'term' ? !revealed : revealed;
  const frontShowsTerm = frontSide === 'term';

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

  const flipCard = () => {
    if (isFlipping) return;

    const nextRevealed = !revealed;
    const duration = reducedMotion ? 0 : FLIP_DURATION_MS;
    setRevealed(nextRevealed);
    selectionHaptic();
    flipProgress.set(withTiming(nextRevealed ? 1 : 0, {
      duration,
      easing: Easing.inOut(Easing.cubic),
    }));

    if (duration === 0) return;
    setIsFlipping(true);
    flipTimer.current = setTimeout(() => {
      flipTimer.current = null;
      setIsFlipping(false);
    }, duration);
  };

  const chooseFrontSide = (side: FlashcardFront) => {
    if (side === frontSide) return;
    setFrontSide(side);
    resetFlip();
  };

  const previous = () => {
    if (index === 0) return;
    const nextIndex = index - 1;
    setIndex(nextIndex);
    saveFlashcardPosition(chapter.id, nextIndex);
    resetFlip();
  };

  const next = () => {
    if (index === chapter.flashcards.length - 1) {
    markReviewed(chapter.id, chapter.contentVersion);
      clearFlashcardPosition(chapter.id);
      successHaptic();
      setFinished(true);
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    saveFlashcardPosition(chapter.id, nextIndex);
    resetFlip();
  };

  if (finished) {
    return (
      <Screen>
        <View style={styles.finished}>
          <AppIcon name="check" size={32} />
          <Text variant="label" style={styles.eyebrow}>REVIEW COMPLETE</Text>
          <Text variant="screenTitle" style={styles.finishedTitle}>{chapter.flashcards.length} key terms reviewed</Text>
          <Text variant="body" style={styles.finishedCopy}>You can return to these cards whenever you want a quick refresher.</Text>
        </View>
        <AppButton label="Back to chapter" leadingIcon="arrow-left" onPress={() => router.replace({ pathname: '/chapter/[chapterId]', params: { chapterId: chapter.id } })} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close flashcards" icon="close" onPress={() => router.dismissTo({ pathname: '/chapter/[chapterId]', params: { chapterId: chapter.id } })} />
        <View style={styles.progress}><ProgressBar progress={(index + 1) / chapter.flashcards.length} /></View>
        <Text variant="label" style={styles.count}>{index + 1}/{chapter.flashcards.length}</Text>
      </View>
      <Text variant="label" style={styles.modeLabel}>SHOW FIRST</Text>
      <View style={[styles.modeSelector, compactLayout && styles.modeSelectorCompact]}>
        <Pressable
          accessibilityLabel="Show the term first"
          accessibilityRole="radio"
          accessibilityState={{ checked: frontSide === 'term' }}
          onPress={() => chooseFrontSide('term')}
          style={({ pressed }) => [styles.modeOption, frontSide === 'term' && styles.modeOptionSelected, pressed && styles.pressed]}>
          <Text variant="label" style={[styles.modeOptionText, frontSide === 'term' && styles.modeOptionTextSelected]}>TERM FIRST</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Show the definition first"
          accessibilityRole="radio"
          accessibilityState={{ checked: frontSide === 'definition' }}
          onPress={() => chooseFrontSide('definition')}
          style={({ pressed }) => [styles.modeOption, frontSide === 'definition' && styles.modeOptionSelected, pressed && styles.pressed]}>
          <Text variant="label" style={[styles.modeOptionText, frontSide === 'definition' && styles.modeOptionTextSelected]}>DEFINITION FIRST</Text>
        </Pressable>
      </View>
      <Text variant="label" style={styles.eyebrow}>TAP THE CARD TO REVEAL</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isFlipping }}
        accessibilityLabel={showingTerm
          ? `${card.term}. Tap to ${revealed ? 'show the definition' : 'reveal the definition'}.`
          : `${card.definition}. Tap to ${revealed ? 'show the term' : 'reveal the term'}.`}
        disabled={isFlipping}
        onPress={flipCard}
        style={({ pressed }) => [styles.cardPressable, { minHeight: cardMinHeight }, pressed && styles.pressed]}>
        <View style={styles.cardScene}>
          <Animated.View
            accessible={false}
            style={[styles.cardFace, styles.cardFront, styles.noPointerEvents, frontAnimatedStyle]}>
            <Text variant="label" style={styles.cardLabel}>{frontShowsTerm ? 'NETWORK TERM' : 'DEFINITION'}</Text>
            <Text variant={frontShowsTerm ? 'screenTitle' : 'body'} style={frontShowsTerm ? styles.term : styles.definition}>
              {frontShowsTerm ? card.term : card.definition}
            </Text>
            <Text variant="label" style={styles.tapHint}>Tap to flip</Text>
          </Animated.View>
          <Animated.View
            accessible={false}
            style={[styles.cardFace, styles.cardBack, styles.noPointerEvents, backAnimatedStyle]}>
            <Text variant="label" style={styles.cardLabel}>{frontShowsTerm ? 'DEFINITION' : 'NETWORK TERM'}</Text>
            <Text variant={frontShowsTerm ? 'body' : 'screenTitle'} style={frontShowsTerm ? styles.definition : styles.term}>
              {frontShowsTerm ? card.definition : card.term}
            </Text>
          <View style={styles.example}>
            <Text variant="label" style={styles.exampleLabel}>EXAMPLE</Text>
            <Text variant="body" style={styles.exampleText}>{card.example}</Text>
          </View>
          </Animated.View>
        </View>
      </Pressable>
      <View style={styles.spacer} />
      <View style={styles.navigationActions}>
        <AppButton
          label="Previous card"
          leadingIcon="arrow-left"
          disabled={index === 0}
          variant="secondary"
          onPress={previous}
        />
        <AppButton
          label={index === chapter.flashcards.length - 1 ? 'Finish review' : 'Next card'}
          trailingIcon={index === chapter.flashcards.length - 1 ? 'check' : 'arrow-right'}
          onPress={next}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.xxl },
  progress: { flex: 1 },
  count: { width: 56, textAlign: 'right', color: Palette.textMuted },
  modeLabel: { color: Palette.textMuted, fontFamily: Fonts.medium, marginBottom: Space.sm },
  modeSelector: { flexDirection: 'row', marginBottom: Space.lg },
  modeSelectorCompact: { flexDirection: 'column' },
  modeOption: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  modeOptionSelected: { borderColor: Palette.accent, backgroundColor: Palette.surfaceRaised },
  modeOptionText: { color: Palette.textMuted, fontFamily: Fonts.medium, textAlign: 'center' },
  modeOptionTextSelected: { color: Palette.accentBright },
  eyebrow: { color: Palette.accentBright, fontFamily: Fonts.medium, textAlign: 'center', marginBottom: Space.lg },
  cardPressable: { minHeight: 400 },
  cardScene: { flex: 1, minHeight: 400 },
  cardFace: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, minHeight: 400, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.border, padding: Space.lg, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' },
  cardFront: { backgroundColor: Palette.surfaceRaised, borderTopColor: Palette.accent, borderTopWidth: 2 },
  cardBack: { backgroundColor: Palette.surfaceRaised, borderTopColor: Palette.orange, borderTopWidth: 2 },
  noPointerEvents: { pointerEvents: 'none' },
  cardLabel: { color: Palette.accentBright, fontFamily: Fonts.medium },
  term: { color: Palette.white, textAlign: 'center', fontFamily: Fonts.semibold, textTransform: 'uppercase', marginTop: Space.lg },
  definition: { color: Palette.white, textAlign: 'center', marginTop: Space.lg },
  tapHint: { position: 'absolute', bottom: Space.xl, color: Palette.textMuted, fontFamily: Fonts.regular, textTransform: 'uppercase' },
  example: { alignSelf: 'stretch', minWidth: 0, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, padding: Space.lg, borderRadius: Radius.md, marginTop: Space.xxl },
  exampleLabel: { color: Palette.accentBright, fontFamily: Fonts.medium },
  exampleText: { color: Palette.white, marginTop: Space.xs },
  pressed: { opacity: 0.85 },
  spacer: { flex: 1, minHeight: Space.xl },
  navigationActions: { gap: Space.md },
  finished: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 72 },
  finishedTitle: { color: Palette.text, fontFamily: Fonts.semibold, textTransform: 'uppercase', textAlign: 'center' },
  finishedCopy: { color: Palette.textMuted, textAlign: 'center', marginTop: Space.md, maxWidth: 380 },
});
