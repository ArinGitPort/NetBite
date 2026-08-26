import { Pressable, StyleSheet, Text, View } from 'react-native';

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#151216', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  mark: { width: 64, height: 64, borderWidth: 1, borderColor: '#C04848', backgroundColor: '#3A171C', alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#E56B6F', fontSize: 18, fontWeight: '700' },
  title: { color: '#DDD8DA', fontSize: 18, fontWeight: '700', letterSpacing: 1.2 },
  phase: { color: '#D18B5A', fontSize: 12, letterSpacing: 1.2, textAlign: 'center' },
  detail: { color: '#AAA3A8', fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 420 },
  track: { width: 180, height: 2, backgroundColor: '#303633', overflow: 'hidden' },
  signal: { width: 72, height: 2, backgroundColor: '#C04848' },
  actions: { width: '100%', maxWidth: 420, gap: 8, marginTop: 8 },
  button: { minHeight: 44, borderWidth: 1, borderColor: '#C04848', alignItems: 'center', justifyContent: 'center', padding: 8 },
  buttonText: { color: '#DDD8DA', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
});
