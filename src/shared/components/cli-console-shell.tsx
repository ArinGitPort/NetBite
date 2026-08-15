import type { ReactNode, RefObject } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/shared/components/app-button';
import { PageHeader } from '@/shared/components/page-header';
import { SegmentedControl } from '@/shared/components/segmented-control';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space, Typography } from '@/shared/theme';

export interface CliConsoleLine {
  id: string | number;
  text: string;
  tone?: 'normal' | 'muted' | 'success' | 'warning';
}

export interface CliConsoleDeviceOption {
  id: string;
  label: string;
}

export interface CliConsoleShellProps {
  visible: boolean;
  accessibilityLabel: string;
  eyebrow: string;
  title: string;
  boundary: string;
  devices?: CliConsoleDeviceOption[];
  selectedDeviceId?: string;
  onSelectDevice?: (deviceId: string) => void;
  lines: CliConsoleLine[];
  transcriptRef?: RefObject<ScrollView | null>;
  suggestions: string[];
  input: string;
  prompt: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onHistoryPrevious?: () => void;
  onHistoryNext?: () => void;
  onClose: () => void;
  footerActions?: ReactNode;
  submitDisabled?: boolean;
  testID?: string;
}

export function CliConsoleShell({ visible, accessibilityLabel, eyebrow, title, boundary, devices = [], selectedDeviceId, onSelectDevice, lines, transcriptRef, suggestions, input, prompt, onInputChange, onSubmit, onHistoryPrevious, onHistoryNext, onClose, footerActions, submitDisabled, testID = 'cli-console-shell' }: CliConsoleShellProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView accessibilityLabel={accessibilityLabel} accessibilityViewIsModal edges={['top', 'right', 'bottom', 'left']} style={styles.safe} testID={testID}>
        <PageHeader leading={{ accessibilityLabel: 'Close CLI', icon: 'close', label: 'CLOSE', onPress: onClose }} status="FULL-SCREEN CONSOLE" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <View style={styles.console}>
            <View style={styles.heading}>
              <Text variant="label" style={styles.eyebrow}>{eyebrow}</Text>
              <Text variant="screenTitle" style={styles.title}>{title}</Text>
              <Text variant="technical" style={styles.boundary}>{boundary}</Text>
            </View>
            {devices.length > 1 && selectedDeviceId && onSelectDevice ? <View style={styles.devices}><SegmentedControl label="CLI device" options={devices} value={selectedDeviceId} onChange={onSelectDevice} /></View> : null}
            <ScrollView ref={transcriptRef} accessibilityLabel="CLI transcript" contentContainerStyle={styles.transcript} keyboardShouldPersistTaps="handled" style={styles.transcriptScroll} testID={`${testID}-transcript`}>
              {lines.map((line) => <Text key={line.id} variant="technical" style={[styles.line, line.tone === 'muted' && styles.muted, line.tone === 'success' && styles.success, line.tone === 'warning' && styles.warning]}>{line.text}</Text>)}
            </ScrollView>
            <View style={styles.suggestions}>{suggestions.map((suggestion) => <Pressable accessibilityRole="button" key={suggestion} onPress={() => onInputChange(suggestion)} style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}><Text variant="technical" style={styles.suggestionText}>{suggestion}</Text></Pressable>)}</View>
            <View style={styles.commandRow}>
              <Text variant="technical" style={styles.prompt}>{prompt}</Text>
              <TextInput accessibilityLabel="CLI command" autoCapitalize="none" autoCorrect={false} onChangeText={onInputChange} onSubmitEditing={onSubmit} placeholder="ENTER COMMAND" placeholderTextColor={Palette.textMuted} returnKeyType="send" selectionColor={Palette.orange} spellCheck={false} style={styles.input} value={input} />
              {onHistoryPrevious ? <Pressable accessibilityLabel="Previous command" accessibilityRole="button" onPress={onHistoryPrevious} style={styles.history}><Text variant="label">↑</Text></Pressable> : null}
              {onHistoryNext ? <Pressable accessibilityLabel="Next command" accessibilityRole="button" onPress={onHistoryNext} style={styles.history}><Text variant="label">↓</Text></Pressable> : null}
            </View>
            <View style={styles.actions}>
              <AppButton disabled={submitDisabled ?? !input.trim()} label="Run command" onPress={onSubmit} style={styles.action} />
              {footerActions}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background },
  keyboard: { flex: 1, minHeight: 0 },
  console: { width: '100%', maxWidth: 960, minWidth: 0, flex: 1, alignSelf: 'center', backgroundColor: '#100E11' },
  heading: { paddingHorizontal: Space.lg, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Palette.border },
  eyebrow: { color: Palette.orange },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: 2 },
  boundary: { color: Palette.textMuted, marginTop: 2 },
  devices: { padding: Space.sm, borderBottomWidth: 1, borderBottomColor: Palette.border },
  transcriptScroll: { flex: 1, minHeight: 0 },
  transcript: { flexGrow: 1, padding: Space.lg, gap: 4 },
  line: { color: Palette.text },
  muted: { color: Palette.textMuted },
  success: { color: Palette.green },
  warning: { color: Palette.orange },
  suggestions: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs, padding: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border },
  suggestion: { maxWidth: '100%', minWidth: 0, minHeight: 44, flexShrink: 1, justifyContent: 'center', paddingHorizontal: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  suggestionText: { minWidth: 0, flexShrink: 1, color: Palette.text },
  pressed: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  commandRow: { width: '100%', minWidth: 0, minHeight: 52, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderTopWidth: 1, borderTopColor: Palette.border },
  prompt: { minWidth: 0, maxWidth: '100%', flexShrink: 1, color: Palette.green, paddingLeft: Space.sm },
  input: { minWidth: 160, minHeight: 52, flex: 1, color: Palette.white, paddingHorizontal: Space.sm, fontFamily: Fonts.mono, ...Typography.bodySmall },
  history: { width: 44, minHeight: 52, borderLeftWidth: 1, borderLeftColor: Palette.border, alignItems: 'center', justifyContent: 'center' },
  actions: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: Space.sm, padding: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border },
  action: { minWidth: 0, flexBasis: 200, flexGrow: 1, flexShrink: 1 },
});
