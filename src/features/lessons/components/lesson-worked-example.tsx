import { StyleSheet, View } from 'react-native';

import type { LessonExample } from '@/content/types';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

export function LessonWorkedExample({ example }: { example: LessonExample }) {
  return (
    <View accessibilityLabel={`Worked example: ${example.label}`} style={styles.example}>
      <Text variant="label" style={styles.label}>{example.label}</Text>
      <Text variant="bodySmall" style={styles.setup}>{example.setup}</Text>
      {example.steps?.map((step, stepIndex) => (
        <View key={step.id} style={styles.step} accessibilityLabel={`Step ${stepIndex + 1}: ${step.label}. ${step.explanation}${step.value ? ` Result: ${step.value}` : ''}`}>
          <View style={styles.stepNumber}><Text variant="label" style={styles.stepNumberText}>{stepIndex + 1}</Text></View>
          <View style={styles.stepCopy}>
            <Text variant="label" style={styles.stepLabel}>{step.label}</Text>
            <Text variant="bodySmall" style={styles.stepText}>{step.explanation}</Text>
            {step.value ? <Text variant="technical" style={styles.stepValue}>{step.value}</Text> : null}
          </View>
        </View>
      ))}
      <Text variant="body" style={styles.result}>{example.result}</Text>
    </View>
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
  result: { color: Palette.text, marginTop: Space.md },
});
