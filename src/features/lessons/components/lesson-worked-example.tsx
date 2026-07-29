import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import type { LessonExample } from '@/content/types';
import { EducationalLessonIllustration } from '@/features/lessons/components/educational-lesson-illustration';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

export function LessonWorkedExample({ example }: { example: LessonExample }) {
  const steps = example.steps ?? [];
  const guided = example.presentation === 'guided' && steps.length > 0;
  const [stepIndex, setStepIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const visibleSteps = guided && !showAll ? [steps[stepIndex]] : steps;
  const currentStageId = example.visual?.stageIds[stepIndex];
  const currentStep = steps[stepIndex];
  const goToStep = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(steps.length - 1, nextIndex));
    setStepIndex(boundedIndex);
    const step = steps[boundedIndex];
    AccessibilityInfo.announceForAccessibility(
      `Step ${boundedIndex + 1} of ${steps.length}. ${step.label}. ${step.explanation}${step.value ? ` Result: ${step.value}` : ''}`,
    );
  };
  const toggleShowAll = () => {
    const nextShowAll = !showAll;
    setShowAll(nextShowAll);
    AccessibilityInfo.announceForAccessibility(nextShowAll ? `Showing all ${steps.length} steps.` : `Showing step ${stepIndex + 1} of ${steps.length}.`);
  };

  return (
    <View accessibilityLabel={`Worked example: ${example.label}`} style={styles.example}>
      <Text variant="label" style={styles.label}>{example.label}</Text>
      <Text variant="bodySmall" style={styles.setup}>{example.setup}</Text>
      {guided && example.visual ? (
        <EducationalLessonIllustration
          stageId={showAll ? undefined : currentStageId}
          type={example.visual.illustration}
        />
      ) : null}
      {guided ? (
        <Text
          accessibilityLiveRegion="polite"
          variant="technical"
          style={styles.progress}>
          {showAll ? `SHOWING ALL ${steps.length} STEPS` : `STEP ${stepIndex + 1} OF ${steps.length} / ${currentStep?.label}`}
        </Text>
      ) : null}
      {visibleSteps.map((step) => {
        const originalIndex = steps.findIndex((candidate) => candidate.id === step.id);
        return (
        <View key={step.id} style={styles.step} accessibilityLabel={`Step ${originalIndex + 1}: ${step.label}. ${step.explanation}${step.value ? ` Result: ${step.value}` : ''}`}>
          <View style={styles.stepNumber}><Text variant="label" style={styles.stepNumberText}>{originalIndex + 1}</Text></View>
          <View style={styles.stepCopy}>
            <Text variant="label" style={styles.stepLabel}>{step.label}</Text>
            <Text variant="bodySmall" style={styles.stepText}>{step.explanation}</Text>
            {step.value ? <Text variant="technical" style={styles.stepValue}>{step.value}</Text> : null}
          </View>
        </View>
      )})}
      {guided ? (
        <View style={styles.controls}>
          {!showAll ? (
            <>
              <ExampleButton disabled={stepIndex === 0} label="Previous" onPress={() => goToStep(stepIndex - 1)} />
              <ExampleButton disabled={stepIndex === steps.length - 1} label="Next step" onPress={() => goToStep(stepIndex + 1)} />
            </>
          ) : null}
          <ExampleButton label={showAll ? 'Step mode' : 'Show all steps'} onPress={toggleShowAll} />
        </View>
      ) : null}
      {(!guided || showAll || stepIndex === steps.length - 1) ? <Text variant="body" style={styles.result}>{example.result}</Text> : null}
    </View>
  );
}

function ExampleButton({ disabled = false, label, onPress }: { disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.control, pressed && styles.controlPressed, disabled && styles.controlDisabled]}>
      <Text variant="label" style={[styles.controlText, disabled && styles.controlTextDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  example: { marginTop: Space.lg, padding: Space.lg, backgroundColor: Palette.surfaceRaised, borderWidth: 1, borderColor: Palette.border },
  label: { color: Palette.accentBright, fontFamily: Fonts.medium, marginBottom: Space.sm },
  setup: { color: Palette.textMuted, marginBottom: Space.xs },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginTop: Space.md, padding: Space.md, backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.border },
  stepNumber: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.orange },
  stepNumberText: { color: Palette.orange, fontFamily: Fonts.semibold },
  stepCopy: { flex: 1, minWidth: 0, marginLeft: Space.md },
  stepLabel: { color: Palette.text, fontFamily: Fonts.semibold },
  stepText: { color: Palette.textMuted, marginTop: Space.xs },
  stepValue: { color: Palette.green, marginTop: Space.sm },
  progress: { color: Palette.orange, marginTop: Space.md },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginTop: Space.md },
  control: { minWidth: 132, minHeight: 44, flexGrow: 1, flexBasis: 132, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space.md, paddingVertical: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
  controlPressed: { borderColor: Palette.orange, backgroundColor: Palette.surface },
  controlDisabled: { backgroundColor: Palette.surface, opacity: 0.55 },
  controlText: { color: Palette.text, fontFamily: Fonts.medium, textAlign: 'center' },
  controlTextDisabled: { color: Palette.textMuted },
  result: { color: Palette.text, marginTop: Space.md },
});
