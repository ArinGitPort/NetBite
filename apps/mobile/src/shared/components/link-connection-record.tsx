import { StyleSheet, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { useMeasuredResponsiveLayout } from '@/shared/responsive-layout';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export interface ConnectionEndpoint { deviceName: string; interfaceName: string }

export function LinkConnectionRecord({ index, a, b, context, state = 'UP' }: { index: number; a: ConnectionEndpoint; b: ConnectionEndpoint; context?: string; state?: string }) {
  const styles = useThemeStyles(createStyles);
  const { mode, onLayout } = useMeasuredResponsiveLayout();
  const warning = state !== 'UP' || /MISMATCH|NOT TRUNKED|NO COMMON|DOWN|NOT FOUND/i.test(context ?? '');
  return <View accessible accessibilityLabel={`Connection ${index}. ${a.deviceName} port ${a.interfaceName} is connected to ${b.deviceName} port ${b.interfaceName}. ${context ? `Context ${context}. ` : ''}State ${state}.`} onLayout={onLayout} style={styles.record}>
    <Text variant="label" style={styles.heading}>CONNECTION {index}</Text>
    <View style={[styles.endpoints, mode === 'compact' && styles.endpointsCompact]}>
      <Endpoint endpoint={a} />
      <View accessible={false} style={[styles.connector, mode === 'compact' && styles.connectorCompact]}><View style={styles.dot} /><View style={[styles.line, mode === 'compact' && styles.lineCompact]} /><Text variant="technical" style={styles.connected}>CONNECTED LINK</Text><View style={styles.dot} /></View>
      <Endpoint endpoint={b} />
    </View>
    {context ? <View style={styles.detail}><Text variant="technical" style={styles.detailLabel}>NETWORK / LINK</Text><Text variant="technical" style={[styles.detailValue, warning && styles.warning]}>{context}</Text></View> : null}
    <View style={styles.detail}><Text variant="technical" style={styles.detailLabel}>STATE</Text><Text variant="technical" style={[styles.detailValue, warning ? styles.warning : styles.success]}>{state}</Text></View>
  </View>;
}

function Endpoint({ endpoint }: { endpoint: ConnectionEndpoint }) {
  const styles = useThemeStyles(createStyles);
  return <View style={styles.endpoint}><Text variant="label" style={styles.device}>{endpoint.deviceName}</Text><Text variant="technical" style={styles.port}>PORT {endpoint.interfaceName}</Text></View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  record: { minWidth: 0, gap: Space.sm, padding: Space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  heading: { color: colors.orange, fontFamily: Fonts.semibold },
  endpoints: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm }, endpointsCompact: { flexDirection: 'column', alignItems: 'stretch' },
  endpoint: { flex: 1, minWidth: 0, gap: Space.xs, padding: Space.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  device: { color: colors.text, fontFamily: Fonts.semibold }, port: { color: colors.textMuted },
  connector: { flex: 1, minWidth: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, connectorCompact: { minHeight: 54, minWidth: 0, flexDirection: 'column' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green }, line: { flex: 1, height: 1, backgroundColor: colors.green }, lineCompact: { width: 1, height: 14, flex: 0 }, connected: { color: colors.green, paddingHorizontal: Space.xs, textAlign: 'center' },
  detail: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Space.sm },
  detailLabel: { color: colors.textMuted }, detailValue: { color: colors.text, flexShrink: 1, textAlign: 'right' }, success: { color: colors.green }, warning: { color: colors.orange },
});
