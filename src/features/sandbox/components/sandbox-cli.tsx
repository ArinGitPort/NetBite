import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCliPrompt, getCliSuggestions, type CliNetworkState, type CliOutputLine } from '@/core/network/cli-simulator';
import { createSandboxCliState, executeSandboxCliCommand, type SandboxWorkspace } from '@/core/network/sandbox';
import { AppButton } from '@/shared/components/app-button';
import { IconButton } from '@/shared/components/icon-button';
import { Text } from '@/shared/components/console-text';
import { useMeasuredResponsiveLayout } from '@/shared/responsive-layout';
import { Fonts, Palette, Space, Typography } from '@/shared/theme';

interface TranscriptEntry extends CliOutputLine { id: number }

interface SandboxCliProps { visible: boolean; workspace: SandboxWorkspace; initialDeviceId: string; onClose: () => void; onCommit: (workspace: SandboxWorkspace) => void }

export function SandboxCli(props: SandboxCliProps) {
  if (!props.visible) return null;
  return <SandboxCliSession key={props.initialDeviceId} {...props} />;
}

function SandboxCliSession({ visible, workspace, initialDeviceId, onClose, onCommit }: SandboxCliProps) {
  const { mode: responsiveMode, onLayout } = useMeasuredResponsiveLayout();
  const compact = responsiveMode === 'compact';
  const configurable = workspace.devices.filter((device) => device.type !== 'pc');
  const [deviceId, setDeviceId] = useState(initialDeviceId);
  const [session, setSession] = useState<CliNetworkState>(() => createSandboxCliState(workspace));
  const [input, setInput] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([{ id: 0, text: 'NETBITE CLI / BOUNDED EDUCATIONAL COMMAND MODEL', tone: 'muted' }]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const nextId = useRef(1);
  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: false }); }, [transcript]);

  const sessionDevice = session.devices.find((device) => device.id === deviceId) ?? session.devices[0];
  if (!sessionDevice) return null;
  const submit = () => {
    const command = input.trim(); if (!command) return;
    const prompt = getCliPrompt(sessionDevice);
    const execution = executeSandboxCliCommand(workspace, deviceId, command, session);
    const output: CliOutputLine[] = execution.error ? [{ text: execution.error, tone: 'warning' }] : execution.result?.output ?? [];
    setTranscript((current) => [...current, { id: nextId.current++, text: `${prompt} ${command}`, tone: 'normal' as const }, ...output.map((line) => ({ ...line, id: nextId.current++ }))].slice(-200));
    setHistory((current) => [...current.filter((item) => item !== command), command].slice(-50)); setHistoryIndex(0); setInput('');
    setSession(execution.sessionState);
    if (execution.workspaceMutated) onCommit(execution.state);
  };
  const navigateHistory = (direction: -1 | 1) => {
    const nextIndex = Math.max(0, Math.min(history.length, historyIndex + direction)); setHistoryIndex(nextIndex);
    setInput(nextIndex === 0 ? '' : history[history.length - nextIndex] ?? '');
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
          <View onLayout={onLayout} style={styles.console} testID="sandbox-cli-layout">
          <View style={styles.header}><View style={styles.headerCopy}><Text variant="label" style={styles.eyebrow}>NETWORK SANDBOX / CLI</Text><Text variant="screenTitle" style={styles.title}>DEVICE CONSOLE</Text></View><IconButton accessibilityLabel="Close CLI" icon="close" label="CLOSE" onPress={onClose} /></View>
          <View style={styles.devicePicker}>{configurable.map((device) => <Pressable key={device.id} accessibilityRole="button" accessibilityState={{ selected: device.id === deviceId }} onPress={() => setDeviceId(device.id)} style={[styles.deviceChoice, device.id === deviceId && styles.deviceChoiceActive]}><Text variant="label" style={device.id === deviceId ? styles.activeText : styles.choiceText}>{device.name}</Text></Pressable>)}</View>
          <View style={styles.boundary}><Text variant="technical" style={styles.boundaryText}>CISCO-LIKE SUBSET / ORIGINAL NETBITE OUTPUT / NO LIVE DEVICE OS</Text></View>
          <ScrollView ref={scrollRef} accessibilityLabel="CLI transcript" contentContainerStyle={styles.transcript} keyboardShouldPersistTaps="handled" style={styles.transcriptScroll}>
            {transcript.map((line) => <Text key={line.id} variant="technical" style={[styles.line, line.tone === 'muted' && styles.muted, line.tone === 'success' && styles.success, line.tone === 'warning' && styles.warning]}>{line.text}</Text>)}
          </ScrollView>
          <View style={styles.suggestions}>{getCliSuggestions(sessionDevice, session).map((suggestion) => <Pressable key={suggestion} accessibilityRole="button" onPress={() => setInput(suggestion)} style={styles.suggestion}><Text variant="technical" style={styles.suggestionText}>{suggestion}</Text></Pressable>)}</View>
          <View style={[styles.inputRow, compact && styles.inputRowCompact]} testID="sandbox-cli-input-row"><Text variant="technical" style={[styles.prompt, compact && styles.promptCompact]}>{getCliPrompt(sessionDevice)}</Text><TextInput accessibilityLabel="CLI command" autoCapitalize="none" autoCorrect={false} onChangeText={setInput} onSubmitEditing={submit} placeholder="ENTER COMMAND" placeholderTextColor={Palette.textMuted} selectionColor={Palette.orange} style={styles.input} value={input} /><Pressable accessibilityLabel="Previous command" accessibilityRole="button" onPress={() => navigateHistory(1)} style={styles.history}><Text variant="label">↑</Text></Pressable><Pressable accessibilityLabel="Next command" accessibilityRole="button" onPress={() => navigateHistory(-1)} style={styles.history}><Text variant="label">↓</Text></Pressable></View>
          <View style={styles.actions} testID="sandbox-cli-actions"><AppButton label="Run command" style={[styles.action, compact && styles.actionStacked]} onPress={submit} /><AppButton label="Help" style={[styles.action, compact && styles.actionStacked]} variant="secondary" onPress={() => setInput('help')} /></View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background },
  console: { width: '100%', maxWidth: 840, minWidth: 0, flex: 1, alignSelf: 'center' },
  header: { width: '100%', minWidth: 0, minHeight: 72, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.md, padding: Space.lg, borderBottomWidth: 1, borderBottomColor: Palette.border },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: Palette.orange },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xs },
  devicePicker: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, padding: Space.sm },
  deviceChoice: { minWidth: 0, minHeight: 44, flexBasis: 160, flexGrow: 1, flexShrink: 1, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center', padding: Space.sm },
  deviceChoiceActive: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  choiceText: { color: Palette.textMuted },
  activeText: { color: Palette.orange },
  boundary: { paddingHorizontal: Space.lg, paddingBottom: Space.sm },
  boundaryText: { color: Palette.textMuted },
  transcriptScroll: { flex: 1, minHeight: 0 },
  transcript: { flexGrow: 1, padding: Space.lg, gap: 4 },
  line: { color: Palette.text },
  muted: { color: Palette.textMuted },
  success: { color: Palette.green },
  warning: { color: Palette.orange },
  suggestions: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border, padding: Space.sm },
  suggestion: { maxWidth: '100%', minWidth: 0, minHeight: 44, flexShrink: 1, borderWidth: 1, borderColor: Palette.border, justifyContent: 'center', paddingHorizontal: Space.md },
  suggestionText: { minWidth: 0, flexShrink: 1, color: Palette.text },
  inputRow: { width: '100%', minWidth: 0, minHeight: 52, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Palette.border },
  inputRowCompact: { flexWrap: 'wrap' },
  prompt: { minWidth: 0, flexShrink: 1, color: Palette.green, paddingLeft: Space.sm },
  promptCompact: { width: '100%', minHeight: 36, paddingHorizontal: Space.sm, paddingTop: Space.sm, borderBottomWidth: 1, borderBottomColor: Palette.border },
  input: { minHeight: 52, flex: 1, minWidth: 0, color: Palette.white, paddingHorizontal: Space.sm, fontFamily: Fonts.mono, ...Typography.bodySmall },
  history: { width: 44, minHeight: 52, borderLeftWidth: 1, borderLeftColor: Palette.border, alignItems: 'center', justifyContent: 'center' },
  actions: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: Space.sm, padding: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border },
  action: { minWidth: 0, flexBasis: 200, flexGrow: 1, flexShrink: 1 },
  actionStacked: { width: '100%', flexBasis: '100%' },
});
