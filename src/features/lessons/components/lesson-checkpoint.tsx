import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LessonCheckpoint as LessonCheckpointDefinition } from '@/content/types';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

export function LessonCheckpoint({ checkpoint, onCorrect }: { checkpoint: LessonCheckpointDefinition; onCorrect: () => void }) {
  const [selectedId, setSelectedId] = useState<string>();
  const [hintCount, setHintCount] = useState(0);
  const selected = checkpoint.choices.find(({ id }) => id === selectedId);
  const isCorrect = selectedId === checkpoint.correctChoiceId;

  const choose = (choiceId: string) => {
    setSelectedId(choiceId);
    if (choiceId === checkpoint.correctChoiceId) onCorrect();
  };

  return (
    <View accessibilityLabel="Check your understanding" style={styles.panel}>
      <Text variant="label" style={styles.eyebrow}>QUICK CHECK</Text>
      <Text variant="body" style={styles.prompt}>{checkpoint.prompt}</Text>
      <View style={styles.choices}>
        {checkpoint.choices.map((choice) => {
          const selectedChoice = choice.id === selectedId;
          const correctChoice = selectedChoice && isCorrect;
          return (
            <Pressable
              key={choice.id}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedChoice }}
              onPress={() => choose(choice.id)}
              style={({ pressed }) => [
                styles.choice,
                selectedChoice && styles.choiceSelected,
                correctChoice && styles.choiceCorrect,
                pressed && styles.choicePressed,
              ]}>
              <Text variant="label" style={[styles.choiceText, correctChoice && styles.choiceTextCorrect]}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {selected ? (
        <View accessibilityLiveRegion="polite" style={[styles.feedback, isCorrect ? styles.feedbackCorrect : styles.feedbackRetry]}>
          <Text variant="label" style={isCorrect ? styles.correctLabel : styles.retryLabel}>{isCorrect ? 'CORRECT' : 'TRY AGAIN'}</Text>
          <Text variant="bodySmall" style={styles.feedbackText}>{selected.feedback}</Text>
        </View>
      ) : (
        <Text variant="technical" style={styles.hint}>CHOOSE AN ANSWER TO CONTINUE.</Text>
      )}
      {checkpoint.hints?.slice(0, hintCount).map((hint, index) => (
        <View key={`${index}-${hint}`} accessibilityLiveRegion="polite" style={styles.hintPanel}>
          <Text variant="label" style={styles.hintLabel}>HINT {index + 1}</Text>
          <Text variant="bodySmall" style={styles.hintText}>{hint}</Text>
        </View>
      ))}
      {checkpoint.hints && hintCount < checkpoint.hints.length ? (
        <Pressable accessibilityRole="button" onPress={() => setHintCount((count) => count + 1)} style={styles.hintButton}>
          <Text variant="label" style={styles.hintButtonText}>{hintCount === 0 ? 'SHOW A HINT' : 'SHOW NEXT HINT'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: Space.xl, padding: Space.lg, gap: Space.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.orange },
  eyebrow: { color: Palette.orange, fontFamily: Fonts.medium },
  prompt: { color: Palette.text },
  choices: { gap: Space.sm },
  choice: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Space.md, paddingVertical: Space.sm, backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.border },
  choiceSelected: { borderColor: Palette.orange },
  choiceCorrect: { borderColor: Palette.green, backgroundColor: Palette.greenSoft },
  choicePressed: { opacity: 0.82 },
  choiceText: { color: Palette.text, fontFamily: Fonts.medium, textAlign: 'center' },
  choiceTextCorrect: { color: Palette.green },
  feedback: { padding: Space.md, borderWidth: 1 },
  feedbackCorrect: { borderColor: Palette.green, backgroundColor: Palette.greenSoft },
  feedbackRetry: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  correctLabel: { color: Palette.green, fontFamily: Fonts.medium, marginBottom: Space.xs },
  retryLabel: { color: Palette.orange, fontFamily: Fonts.medium, marginBottom: Space.xs },
  feedbackText: { color: Palette.text },
  hint: { color: Palette.textMuted, textAlign: 'center' },
  hintPanel: { padding: Space.md, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
  hintLabel: { color: Palette.orange, fontFamily: Fonts.medium, marginBottom: Space.xs },
  hintText: { color: Palette.text },
  hintButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.border },
  hintButtonText: { color: Palette.textMuted, fontFamily: Fonts.medium },
});
