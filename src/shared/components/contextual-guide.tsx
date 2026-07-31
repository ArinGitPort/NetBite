import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, StyleSheet, View } from 'react-native';

import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';
import { type GuideId, useExperienceStore } from '@/store/use-experience-store';

interface GuideStep { title: string; detail: string }

export function ContextualGuide({ id, eyebrow, steps }: { id: GuideId; eyebrow: string; steps: GuideStep[] }) {
  const seen = useExperienceStore((state) => Boolean(state.seenGuides[id]));
  const markSeen = useExperienceStore((state) => state.markGuideSeen);
  const [index, setIndex] = useState(0);
  const guideRef = useRef<View>(null);
  useEffect(() => {
    if (index === 0) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(guideRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 50);
    return () => clearTimeout(timer);
  }, [index]);
  if (seen || !steps.length) return null;
  const step = steps[index];
  const finish = () => markSeen(id);
  return <View accessible accessibilityLabel={`${eyebrow}. ${step.title}. ${step.detail}`} accessibilityLiveRegion="polite" ref={guideRef} style={styles.guide}>
    <Text variant="label" style={styles.eyebrow}>{eyebrow} / {index + 1} OF {steps.length}</Text>
    <Text variant="sectionHeading" style={styles.title}>{step.title}</Text>
    <Text variant="bodySmall" style={styles.detail}>{step.detail}</Text>
    <View style={styles.actions}><AppButton label="Skip guide" variant="utility" onPress={finish} /><AppButton label={index === steps.length - 1 ? 'Got it' : 'Next tip'} onPress={() => index === steps.length - 1 ? finish() : setIndex((value) => value + 1)} /></View>
  </View>;
}

const styles = StyleSheet.create({ guide: { borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.greenSoft, padding: Space.lg, gap: Space.sm, marginBottom: Space.lg }, eyebrow: { color: Palette.green }, title: { color: Palette.text, fontFamily: Fonts.semibold, textTransform: 'uppercase' }, detail: { color: Palette.text }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginTop: Space.sm } });
