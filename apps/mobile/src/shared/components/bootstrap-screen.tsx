import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

type BootstrapPhase = 'fonts' | 'storage' | 'auth' | 'degraded';

interface BootstrapScreenProps {
  phase: BootstrapPhase;
  detail?: string;
  onRetry?: () => void;
  onContinue?: () => void;
}

const phaseLabel: Record<BootstrapPhase, string> = {
  fonts: 'LOADING INTERFACE',
  storage: 'OPENING SAVED LEARNING',
  auth: 'CHECKING YOUR ACCOUNT',
  degraded: 'CONTINUE OFFLINE',
};

export function BootstrapScreen({ phase, detail, onRetry, onContinue }: BootstrapScreenProps) {
  const styles = useThemeStyles(createStyles);
  return (
    <View accessibilityRole="summary" style={styles.screen}>
      <View style={styles.mark}><Text style={styles.markText}>N</Text></View>
      <Text style={styles.title}>NETBITE</Text>
      <Text style={styles.phase}>{phaseLabel[phase]}</Text>
      <Text style={styles.detail}>{detail ?? 'Preparing NetBite for learning.'}</Text>
      <View style={styles.track}><View style={styles.signal} /></View>
      {onRetry || onContinue ? <View style={styles.actions}>
        {onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}><Text style={styles.buttonText}>TRY AGAIN</Text></Pressable> : null}
        {onContinue ? <Pressable accessibilityRole="button" onPress={onContinue} style={styles.button}><Text style={styles.buttonText}>CONTINUE OFFLINE</Text></Pressable> : null}
      </View> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 24, gap: 12 },
  mark: { width: 64, height: 64, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentSoft, alignItems: 'center' as const, justifyContent: 'center' as const },
  markText: { color: colors.accentBright, fontSize: 18, fontWeight: '700' as const },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' as const, letterSpacing: 1.2 },
  phase: { color: colors.orange, fontSize: 12, letterSpacing: 1.2, textAlign: 'center' as const },
  detail: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' as const, maxWidth: 420 },
  track: { width: 180, height: 2, backgroundColor: colors.border, overflow: 'hidden' as const },
  signal: { width: 72, height: 2, backgroundColor: colors.accent },
  actions: { width: '100%', maxWidth: 420, gap: 8, marginTop: 8 },
  button: { minHeight: 44, borderWidth: 1, borderColor: colors.accent, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 8 },
  buttonText: { color: colors.text, fontSize: 12, fontWeight: '700' as const, letterSpacing: 1.2 },
});
