import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { chapterOneFlashcards } from '@/content/chapter-one';
import { AppButton } from '@/shared/components/app-button';
import { AppIcon } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { IconButton } from '@/shared/components/icon-button';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

type FlashcardFront = 'term' | 'definition';

export default function FlashcardsScreen() {
  const markReviewed = useGameStore((state) => state.markFlashcardsReviewed);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [frontSide, setFrontSide] = useState<FlashcardFront>('term');
  const card = chapterOneFlashcards[index];
  const showingTerm = frontSide === 'term' ? !revealed : revealed;

  const chooseFrontSide = (side: FlashcardFront) => {
    setFrontSide(side);
    setRevealed(false);
  };

  const previous = () => {
    if (index === 0) return;
    setIndex((current) => current - 1);
    setRevealed(false);
  };

  const next = () => {
    if (index === chapterOneFlashcards.length - 1) {
      markReviewed();
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
    setRevealed(false);
  };

  if (finished) {
    return (
      <Screen>
        <View style={styles.finished}>
          <AppIcon name="check" size={32} />
          <Text style={styles.eyebrow}>REVIEW COMPLETE</Text>
          <Text style={styles.finishedTitle}>Five new network terms</Text>
          <Text style={styles.finishedCopy}>You can return to these cards whenever you want a quick refresher.</Text>
        </View>
        <AppButton label="Back to chapter" leadingIcon="arrow-left" onPress={() => router.replace('/chapter/1')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close flashcards" icon="close" onPress={() => router.dismissTo('/chapter/1')} />
        <View style={styles.progress}><ProgressBar progress={(index + 1) / chapterOneFlashcards.length} /></View>
        <Text style={styles.count}>{index + 1}/{chapterOneFlashcards.length}</Text>
      </View>
      <Text style={styles.modeLabel}>SHOW FIRST</Text>
      <View style={styles.modeSelector}>
        <Pressable
          accessibilityLabel="Show the term first"
          accessibilityRole="radio"
          accessibilityState={{ checked: frontSide === 'term' }}
          onPress={() => chooseFrontSide('term')}
          style={({ pressed }) => [styles.modeOption, frontSide === 'term' && styles.modeOptionSelected, pressed && styles.pressed]}>
          <Text style={[styles.modeOptionText, frontSide === 'term' && styles.modeOptionTextSelected]}>TERM FIRST</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Show the definition first"
          accessibilityRole="radio"
          accessibilityState={{ checked: frontSide === 'definition' }}
          onPress={() => chooseFrontSide('definition')}
          style={({ pressed }) => [styles.modeOption, frontSide === 'definition' && styles.modeOptionSelected, pressed && styles.pressed]}>
          <Text style={[styles.modeOptionText, frontSide === 'definition' && styles.modeOptionTextSelected]}>DEFINITION FIRST</Text>
        </Pressable>
      </View>
      <Text style={styles.eyebrow}>TAP THE CARD TO REVEAL</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={showingTerm
          ? `${card.term}. Tap to ${revealed ? 'show the definition' : 'reveal the definition'}.`
          : `${card.definition}. Tap to ${revealed ? 'show the term' : 'reveal the term'}.`}
        onPress={() => setRevealed((current) => !current)}
        style={({ pressed }) => [styles.card, revealed && styles.cardRevealed, pressed && styles.pressed]}>
        <Text style={styles.cardLabel}>{showingTerm ? 'NETWORK TERM' : 'DEFINITION'}</Text>
        <Text style={showingTerm ? styles.term : styles.definition}>{showingTerm ? card.term : card.definition}</Text>
        {revealed ? (
          <View style={styles.example}>
            <Text style={styles.exampleLabel}>EXAMPLE</Text>
            <Text style={styles.exampleText}>{card.example}</Text>
          </View>
        ) : (
          <Text style={styles.tapHint}>Tap to flip</Text>
        )}
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
          label={index === chapterOneFlashcards.length - 1 ? 'Finish review' : 'Next card'}
          trailingIcon={index === chapterOneFlashcards.length - 1 ? 'check' : 'arrow-right'}
          onPress={next}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.xxl },
  progress: { flex: 1 },
  count: { width: 48, textAlign: 'right', color: Palette.textMuted, fontSize: 11, letterSpacing: 1.5 },
  modeLabel: { color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, marginBottom: Space.sm },
  modeSelector: { flexDirection: 'row', marginBottom: Space.lg },
  modeOption: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  modeOptionSelected: { borderColor: Palette.accent, backgroundColor: Palette.accentSoft },
  modeOptionText: { color: Palette.textMuted, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.2, textAlign: 'center' },
  modeOptionTextSelected: { color: Palette.accentBright },
  eyebrow: { color: Palette.accentBright, fontFamily: Fonts.medium, textAlign: 'center', fontSize: 11, letterSpacing: 1.5, marginBottom: Space.lg },
  card: { minHeight: 390, borderRadius: Radius.lg, borderWidth: 1, borderColor: Palette.accent, padding: Space.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.surfaceRaised },
  cardRevealed: { backgroundColor: Palette.accentSoft },
  cardLabel: { color: Palette.accentBright, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  term: { color: Palette.white, textAlign: 'center', fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 24, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: Space.lg },
  definition: { color: Palette.white, textAlign: 'center', fontSize: 13, lineHeight: 21, marginTop: Space.lg },
  tapHint: { position: 'absolute', bottom: Space.xl, color: Palette.textMuted, fontFamily: Fonts.regular, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  example: { alignSelf: 'stretch', backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, padding: Space.lg, borderRadius: Radius.md, marginTop: Space.xxl },
  exampleLabel: { color: Palette.accentBright, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  exampleText: { color: Palette.white, fontSize: 12, lineHeight: 20, marginTop: Space.xs },
  pressed: { opacity: 0.85 },
  spacer: { flex: 1, minHeight: Space.xl },
  navigationActions: { gap: Space.md },
  finished: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 72 },
  finishedTitle: { color: Palette.text, fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 24, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' },
  finishedCopy: { color: Palette.textMuted, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: Space.md, maxWidth: 380 },
});
