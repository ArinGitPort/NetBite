import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import type { LessonCheckpoint as LessonCheckpointDefinition } from '@/content/types';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { HintHistoryPanel } from '@/shared/components/hint-history-panel';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

interface LessonCheckpointProps {
  checkpoint: LessonCheckpointDefinition;
  reviewLabel: string;
  reviewText: string;
  onIncorrect?: () => void;
  onCorrect: (result: { hadIncorrectAttempt: boolean }) => void;
}

export function LessonCheckpoint({ checkpoint, reviewLabel, reviewText, onIncorrect, onCorrect }: LessonCheckpointProps) {
  const styles = useThemeStyles(createStyles);
  const [choicesVisible, setChoicesVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [hintCount, setHintCount] = useState(0);
  const [ruleVisible, setRuleVisible] = useState(false);
  const [hadIncorrectAttempt, setHadIncorrectAttempt] = useState(false);
  const selected = checkpoint.choices.find(({ id }) => id === selectedId);
  const isCorrect = selectedId === checkpoint.correctChoiceId;
  const needsSupport = Boolean(selected && !isCorrect);

  const revealChoices = () => {
    setChoicesVisible(true);
    AccessibilityInfo.announceForAccessibility('Answer choices revealed. Choose the answer you formed.');
  };

  const choose = (choiceId: string) => {
    setSelectedId(choiceId);
    if (choiceId === checkpoint.correctChoiceId) {
      onCorrect({ hadIncorrectAttempt });
      return;
    }
    if (!hadIncorrectAttempt) onIncorrect?.();
    setHadIncorrectAttempt(true);
  };

  return (
    <View accessibilityLabel="Pause and apply" style={styles.panel}>
      <Text variant="label" style={styles.eyebrow}>PAUSE AND APPLY</Text>
      <Text variant="body" style={styles.prompt}>{checkpoint.prompt}</Text>
      {!choicesVisible ? (
        <View style={styles.thinkPanel}>
          <Text variant="label" style={styles.thinkLabel}>THINK OF THE ANSWER FIRST</Text>
          <Text variant="bodySmall" style={styles.thinkText}>Say the answer to yourself before viewing the choices.</Text>
          <AppButton label="I have an answer" onPress={revealChoices} />
        </View>
      ) : (
        <>
          <Text variant="technical" style={styles.instruction}>CHOOSE THE ANSWER YOU FORMED.</Text>
          <View accessibilityRole="radiogroup" style={styles.choices}>
            {checkpoint.choices.map((choice) => {
              const selectedChoice = choice.id === selectedId;
              const correctChoice = selectedChoice && isCorrect;
              return (
                <Pressable
                  key={choice.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedChoice }}
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
        </>
      )}
      {selected ? (
        <View accessibilityLiveRegion="assertive" style={[styles.feedback, isCorrect ? styles.feedbackCorrect : styles.feedbackRetry]}>
          <Text variant="label" style={isCorrect ? styles.correctLabel : styles.retryLabel}>{isCorrect ? 'CORRECT / CONTINUE UNLOCKED' : 'NOT YET / TRY AGAIN'}</Text>
          <Text variant="bodySmall" style={styles.feedbackText}>{selected.feedback}</Text>
        </View>
      ) : null}
      {needsSupport ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: ruleVisible }}
            onPress={() => setRuleVisible((visible) => !visible)}
            style={styles.reviewButton}>
            <Text variant="label" style={styles.reviewButtonText}>{ruleVisible ? 'HIDE THE RULE' : 'REVIEW THE RULE'}</Text>
          </Pressable>
          {ruleVisible ? (
            <View accessibilityLiveRegion="polite" style={styles.rulePanel}>
              <Text variant="label" style={styles.ruleLabel}>{reviewLabel}</Text>
              <Text variant="body" style={styles.ruleText}>{reviewText}</Text>
            </View>
          ) : null}
          <HintHistoryPanel hints={checkpoint.hints?.slice(0, hintCount) ?? []} total={checkpoint.hints?.length ?? 0} />
          {checkpoint.hints && hintCount < checkpoint.hints.length ? (
            <Pressable accessibilityRole="button" onPress={() => setHintCount((count) => count + 1)} style={styles.hintButton}>
              <Text variant="label" style={styles.hintButtonText}>{hintCount === 0 ? 'SHOW A HINT' : 'SHOW NEXT HINT'}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: { marginTop: Space.xl, padding: Space.lg, gap: Space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.orange },
  eyebrow: { color: colors.orange, fontFamily: Fonts.medium },
  prompt: { color: colors.text },
  thinkPanel: { gap: Space.md, padding: Space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  thinkLabel: { color: colors.accentBright, fontFamily: Fonts.medium },
  thinkText: { color: colors.textMuted },
  instruction: { color: colors.textMuted, textAlign: 'center' },
  choices: { gap: Space.sm },
  choice: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Space.md, paddingVertical: Space.sm, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  choiceSelected: { borderColor: colors.orange },
  choiceCorrect: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  choicePressed: { opacity: 0.82 },
  choiceText: { color: colors.text, fontFamily: Fonts.medium, textAlign: 'center' },
  choiceTextCorrect: { color: colors.green },
  feedback: { padding: Space.md, borderWidth: 1 },
  feedbackCorrect: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  feedbackRetry: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  correctLabel: { color: colors.green, fontFamily: Fonts.medium, marginBottom: Space.xs },
  retryLabel: { color: colors.orange, fontFamily: Fonts.medium, marginBottom: Space.xs },
  feedbackText: { color: colors.text },
  reviewButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.orange },
  reviewButtonText: { color: colors.orange, fontFamily: Fonts.medium },
  rulePanel: { padding: Space.md, borderWidth: 1, borderColor: colors.green, backgroundColor: colors.greenSoft },
  ruleLabel: { color: colors.green, fontFamily: Fonts.medium, marginBottom: Space.xs },
  ruleText: { color: colors.text },
  hintPanel: { padding: Space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  hintLabel: { color: colors.orange, fontFamily: Fonts.medium, marginBottom: Space.xs },
  hintText: { color: colors.text },
  hintButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  hintButtonText: { color: colors.textMuted, fontFamily: Fonts.medium },
});
