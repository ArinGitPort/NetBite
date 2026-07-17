import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { chapterOneFlashcards } from '@/content/chapter-one';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

export default function FlashcardsScreen() {
  const markReviewed = useGameStore((state) => state.markFlashcardsReviewed);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const card = chapterOneFlashcards[index];

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
          <Text style={styles.finishedEmoji}>[MEMORY OK]</Text>
          <Text style={styles.eyebrow}>REVIEW COMPLETE</Text>
          <Text style={styles.finishedTitle}>Five new network terms</Text>
          <Text style={styles.finishedCopy}>You can return to these cards whenever you want a quick refresher.</Text>
        </View>
        <AppButton label="Back to chapter" onPress={() => router.replace('/chapter/1')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text onPress={() => router.back()} style={styles.close}>[X]</Text>
        <View style={styles.progress}><ProgressBar progress={(index + 1) / chapterOneFlashcards.length} /></View>
        <Text style={styles.count}>{index + 1}/{chapterOneFlashcards.length}</Text>
      </View>
      <Text style={styles.eyebrow}>TAP THE CARD TO REVEAL</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={revealed ? `${card.term}: ${card.definition}` : `${card.term}. Tap to reveal the definition.`}
        onPress={() => setRevealed((current) => !current)}
        style={({ pressed }) => [styles.card, revealed && styles.cardRevealed, pressed && styles.pressed]}>
        <Text style={styles.cardLabel}>{revealed ? 'DEFINITION' : 'NETWORK TERM'}</Text>
        <Text style={revealed ? styles.definition : styles.term}>{revealed ? card.definition : card.term}</Text>
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
      <AppButton label={index === chapterOneFlashcards.length - 1 ? 'Finish review' : 'Next card'} disabled={!revealed} onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.xxl },
  close: { width: 44, color: Palette.text, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  progress: { flex: 1 },
  count: { width: 48, textAlign: 'right', color: Palette.textMuted, fontSize: 11, letterSpacing: 1.5 },
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
  finished: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 72 },
  finishedEmoji: { color: Palette.green, fontSize: 11, letterSpacing: 1.5 },
  finishedTitle: { color: Palette.text, fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 24, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' },
  finishedCopy: { color: Palette.textMuted, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: Space.md, maxWidth: 380 },
});
