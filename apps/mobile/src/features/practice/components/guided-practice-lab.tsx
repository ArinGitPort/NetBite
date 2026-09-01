import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { PracticeConfig } from '@/features/practice/practice-configs';
import { LabSetupSupport } from '@/features/practice/components/foundation-lab-support';
import { LabGoalPanel } from '@/features/practice/components/lab-goal-panel';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { HintHistoryPanel } from '@/shared/components/hint-history-panel';
import { PageHeader } from '@/shared/components/page-header';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { selectionHaptic, successHaptic, warningHaptic } from '@/shared/haptics';
import { Fonts, Radius, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';
import { returnToOwningChapter } from '@/shared/navigation';
import { WhyExplanation } from '@/shared/components/why-explanation';

export function GuidedPracticeLab({ config }: { config: PracticeConfig }) {
  const styles = useThemeStyles(createStyles);
  const completeLab = useGameStore((state) => state.completeLab);
  const [stageIndex, setStageIndex] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [resolved, setResolved] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const [hintCount, setHintCount] = useState(0);
  const [resetVisible, setResetVisible] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);
  const current = config.stages[stageIndex];
  const isFinal = stageIndex === config.stages.length - 1;

  const check = () => {
    if (selected === undefined || resolved) return;
    if (selected !== current.correctChoiceId) {
      setFeedback(current.choices.find((choice) => choice.id === selected)?.feedback ?? current.explanation);
      warningHaptic();
      return;
    }
    setResolved(true);
    setFeedback(current.result);
    successHaptic();
  };

  const advance = () => {
    if (!resolved) return;
    if (isFinal) {
      completeLab(config.id);
      setCompletionVisible(true);
      return;
    }
    setStageIndex((value) => value + 1);
    setSelected(undefined);
    setFeedback(undefined);
    setResolved(false);
    setHintCount(0);
    selectionHaptic();
  };

  const reset = () => {
    setStageIndex(0); setSelected(undefined); setResolved(false); setFeedback(undefined); setHintCount(0); setResetVisible(false);
  };

  return (
    <Screen header={<PageHeader leading={{ accessibilityLabel: `Back to Chapter ${config.chapterId}`, icon: 'arrow-left', label: 'BACK / CHAPTER', onPress: () => returnToOwningChapter('lab', config.id) }} trailing={[{ accessibilityLabel: 'Reset practice', icon: 'reset', label: 'RESET', onPress: () => setResetVisible(true) }]} />}>
      <Text variant="label" style={styles.eyebrow}>{config.eyebrow}</Text>
      <Text variant="screenTitle" style={styles.title}>{config.title}</Text>
      <LabGoalPanel goal={config.objective} style={styles.objective} />
      <Text variant="technical" style={styles.scope}>{config.scopeNote}</Text>
      <LabSetupSupport labId={config.id} />
      <ProgressBar progress={(stageIndex + (resolved ? 1 : 0)) / config.stages.length} />

      <View style={styles.stage} accessibilityLiveRegion="polite">
        <Text variant="technical" style={styles.stageCount}>STAGE {stageIndex + 1} OF {config.stages.length}</Text>
        <Text variant="bodySmall" style={styles.context}>{current.context}</Text>
        <Text variant="sectionHeading" style={styles.prompt}>{current.prompt}</Text>
        <View style={styles.choices}>
          {current.choices.map((choice) => {
            const active = selected === choice.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: active, disabled: resolved }}
                disabled={resolved}
                key={choice.id}
                onPress={() => { setSelected(choice.id); setFeedback(undefined); selectionHaptic(); }}
                style={[styles.choice, active && styles.choiceActive]}>
                <Text variant="label" style={[styles.choiceText, active && styles.choiceTextActive]}>{choice.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {feedback ? (
          <View style={[styles.feedback, resolved ? styles.feedbackSuccess : styles.feedbackWarning]}>
            <Text variant="label" style={resolved ? styles.successText : styles.warningText}>{resolved ? 'DECISION ACCEPTED' : 'CHECK THE RULE'}</Text>
            <Text variant="bodySmall" style={styles.feedbackText}>{feedback}</Text>
          </View>
        ) : null}
        {feedback ? <WhyExplanation observation={current.context} rule={current.explanation} proves={resolved ? current.result : feedback} nextCheck={!resolved ? current.hints?.[0] ?? 'Try another prediction using the stated rule.' : undefined} /> : null}
        <HintHistoryPanel hints={current.hints?.slice(0, hintCount) ?? []} total={current.hints?.length ?? 0} />
        {current.hints && hintCount < current.hints.length && !resolved ? (
          <Pressable accessibilityRole="button" onPress={() => setHintCount((count) => count + 1)} style={styles.hintButton}>
            <Text variant="label" style={styles.hintButtonText}>{hintCount === 0 ? 'SHOW A HINT' : 'SHOW NEXT HINT'}</Text>
          </Pressable>
        ) : null}
      </View>
      {resolved
        ? <AppButton label={isFinal ? 'Complete practice' : 'Continue'} trailingIcon="arrow-right" onPress={advance} />
        : <AppButton label="Check prediction" leadingIcon="check" disabled={selected === undefined} onPress={check} />}

      <FeedbackModal visible={resetVisible} tone="warning" eyebrow="CONFIRM ACTION" title="Reset this practice?" message="Return to stage one and clear the current decisions." icon="reset" onRequestClose={() => setResetVisible(false)} secondaryAction={{ label: 'Keep working', variant: 'secondary', onPress: () => setResetVisible(false) }} primaryAction={{ label: 'Reset practice', variant: 'danger', onPress: reset }} />
      <FeedbackModal visible={completionVisible} tone="success" eyebrow="PRACTICE COMPLETE" title={config.title} message={config.completion} detail="Your progress has been saved." icon="check" onRequestClose={() => setCompletionVisible(false)} secondaryAction={{ label: 'Review practice', variant: 'secondary', onPress: () => setCompletionVisible(false) }} primaryAction={{ label: 'Back to chapter', leadingIcon: 'arrow-left', onPress: () => returnToOwningChapter('lab', config.id) }} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: Space.sm, minHeight: 44 },
  eyebrow: { color: colors.orange, fontFamily: Fonts.medium, marginTop: Space.md },
  title: { color: colors.text, fontFamily: Fonts.semibold, marginTop: Space.sm },
  objective: { marginTop: Space.lg },
  scope: { color: colors.textMuted, marginVertical: Space.md },
  stage: { marginVertical: Space.lg, padding: Space.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: Radius.md },
  stageCount: { color: colors.green },
  context: { color: colors.textMuted, marginTop: Space.md },
  prompt: { color: colors.text, fontFamily: Fonts.semibold, marginTop: Space.lg },
  choices: { gap: Space.sm, marginTop: Space.lg },
  choice: { minHeight: 48, justifyContent: 'center', padding: Space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, borderRadius: Radius.sm },
  choiceActive: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  choiceText: { color: colors.textMuted, textAlign: 'center' },
  choiceTextActive: { color: colors.text },
  feedback: { marginTop: Space.lg, padding: Space.md, borderWidth: 1 },
  feedbackSuccess: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  feedbackWarning: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  successText: { color: colors.green }, warningText: { color: colors.orange },
  feedbackText: { color: colors.text, marginTop: Space.xs },
  hintPanel: { marginTop: Space.md, padding: Space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  hintLabel: { color: colors.orange, fontFamily: Fonts.medium, marginBottom: Space.xs },
  hintText: { color: colors.text },
  hintButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Space.md, borderWidth: 1, borderColor: colors.border },
  hintButtonText: { color: colors.textMuted, fontFamily: Fonts.medium },
});
