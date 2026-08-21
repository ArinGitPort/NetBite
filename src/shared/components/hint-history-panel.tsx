import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

export function HintHistoryPanel({ hints, total = hints.length, stripContext = false }: { hints: string[]; total?: number; stripContext?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const previousCount = useRef(hints.length);

  useEffect(() => {
    if (hints.length > previousCount.current) setExpanded(true);
    previousCount.current = hints.length;
  }, [hints.length]);

  if (!hints.length) return null;
  const heading = `${hints.length} HINT${hints.length === 1 ? '' : 'S'} REVEALED`;

  return <View style={styles.panel}>
    <Pressable accessibilityLabel={`${hints.length} of ${total} hints revealed`} accessibilityHint={`${expanded ? 'Hides' : 'Shows'} the revealed hints without deleting them`} accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
      <View style={styles.headerCopy}><Text variant="label" style={styles.title}>{heading}</Text><Text variant="technical" style={styles.count}>{hints.length} OF {total}</Text></View>
      <Text variant="label" style={styles.toggle}>{expanded ? 'HIDE HINTS' : 'SHOW'}</Text>
    </Pressable>
    {expanded ? <View style={styles.history}>{hints.map((hint, index) => <View key={`${index}-${hint}`} style={styles.hint}>
      <Text variant="label" style={styles.hintLabel}>HINT {index + 1}</Text>
      <Text accessibilityLiveRegion={index === hints.length - 1 ? 'polite' : 'none'} variant="bodySmall">{stripContext ? hint.replace(/^.*? \/ /, '') : hint}</Text>
    </View>)}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { minWidth: 0, borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.surface },
  header: { minHeight: 48, paddingHorizontal: Space.md, paddingVertical: Space.sm, flexDirection: 'row', alignItems: 'center', gap: Space.md },
  pressed: { backgroundColor: Palette.orangeSoft },
  headerCopy: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  title: { color: Palette.orange, fontFamily: Fonts.semibold }, count: { color: Palette.textMuted }, toggle: { color: Palette.text },
  history: { borderTopWidth: 1, borderTopColor: Palette.orange, padding: Space.sm, gap: Space.sm },
  hint: { minWidth: 0, gap: Space.xs, padding: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
  hintLabel: { color: Palette.orange, fontFamily: Fonts.semibold },
});
