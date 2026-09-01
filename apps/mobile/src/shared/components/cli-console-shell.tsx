import { useState, type ReactNode, type RefObject } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/shared/components/app-button';
import { LinkConnectionRecord, type ConnectionEndpoint } from '@/shared/components/link-connection-record';
import { PageHeader } from '@/shared/components/page-header';
import { SegmentedControl } from '@/shared/components/segmented-control';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space, Typography } from '@/shared/theme';
import { FixedThemeProvider } from '@/shared/theme-context';

export interface CliConsoleLine {
  id: string | number;
  text: string;
  tone?: 'normal' | 'muted' | 'success' | 'warning';
}

export interface CliConsoleDeviceOption {
  id: string;
  label: string;
}

export type CliConsoleTaskState = 'not-started' | 'in-progress' | 'ready' | 'attention' | 'complete' | 'blocked';

export interface CliConsoleTaskFact { label: string; value: string }

export interface CliConsoleNetworkReference {
  a: ConnectionEndpoint;
  b: ConnectionEndpoint;
  context?: string;
  state: string;
}

export interface CliConsoleTaskContext {
  title: string;
  state: CliConsoleTaskState;
  progress?: string;
  requirement: string;
  facts: CliConsoleTaskFact[];
  commandFormat?: string;
  evidence?: string;
  nextAction?: string;
  networkReference?: CliConsoleNetworkReference[];
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
  taskContext?: CliConsoleTaskContext;
  submitDisabled?: boolean;
  testID?: string;
}

const taskStateLabels: Record<CliConsoleTaskState, string> = {
  'not-started': 'NOT STARTED', 'in-progress': 'IN PROGRESS', ready: 'READY', attention: 'NEEDS ATTENTION', complete: 'COMPLETE', blocked: 'BLOCKED',
};

export function CliConsoleShell({ visible, accessibilityLabel, eyebrow, title, boundary, devices = [], selectedDeviceId, onSelectDevice, lines, transcriptRef, suggestions, input, prompt, onInputChange, onSubmit, onHistoryPrevious, onHistoryNext, onClose, footerActions, taskContext, submitDisabled, testID = 'cli-console-shell' }: CliConsoleShellProps) {
  const [taskExpanded, setTaskExpanded] = useState(false);
  const [referenceExpanded, setReferenceExpanded] = useState(false);
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <FixedThemeProvider theme="dark">
      <SafeAreaView accessibilityLabel={accessibilityLabel} accessibilityViewIsModal edges={['top', 'right', 'bottom', 'left']} style={styles.safe} testID={testID}>
        <PageHeader leading={{ accessibilityLabel: 'Close CLI', icon: 'close', label: 'CLOSE', onPress: onClose }} status="FULL-SCREEN CONSOLE" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <View style={styles.console}>
            <View style={styles.topContext} testID={`${testID}-top-context`}>
              <View style={styles.heading}>
                <Text variant="label" style={styles.eyebrow}>{eyebrow}</Text>
                <Text variant="screenTitle" style={styles.title}>{title}</Text>
                <Text variant="technical" style={styles.boundary}>{boundary}</Text>
              </View>
              {devices.length > 1 && selectedDeviceId && onSelectDevice ? <ScrollView contentContainerStyle={styles.deviceStrip} horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator style={styles.devices}><SegmentedControl grow={false} label="CLI device" optionWidth={88} options={devices} value={selectedDeviceId} wrap={false} onChange={onSelectDevice} /></ScrollView> : null}
              {taskContext ? <View style={styles.taskPanel} testID={`${testID}-task-context`}>
              <Pressable
                accessibilityHint="Shows the information needed for the current CLI task without closing the console."
                accessibilityLabel={`Current task. ${taskContext.title}. ${taskStateLabels[taskContext.state]}. ${taskContext.progress ?? ''}`.trim()}
                accessibilityRole="button"
                accessibilityState={{ expanded: taskExpanded }}
                onPress={() => setTaskExpanded((current) => !current)}
                style={({ pressed }) => [styles.taskToggle, pressed && styles.pressed]}
              >
                <View style={styles.taskHeading}><Text variant="label" style={styles.taskEyebrow}>CURRENT TASK</Text><Text variant="technical" style={styles.taskProgress}>{taskContext.progress ?? taskStateLabels[taskContext.state]}</Text></View>
                <View style={styles.taskSummary}><Text variant="bodySmall" style={styles.taskTitle}>{taskContext.title}</Text><Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" variant="label" style={styles.disclosureIcon}>{taskExpanded ? '−' : '+'}</Text></View>
              </Pressable>
              {taskExpanded ? <ScrollView contentContainerStyle={styles.taskDetails} keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.taskDetailsScroll}>
                <Text variant="bodySmall" style={styles.taskRequirement}>{taskContext.requirement}</Text>
                {taskContext.facts.map((fact) => <View key={`${fact.label}-${fact.value}`} style={styles.factRow}><Text variant="technical" style={styles.factLabel}>{fact.label}</Text><Text selectable variant="technical" style={styles.factValue}>{fact.value}</Text></View>)}
                {taskContext.commandFormat ? <View style={styles.factRow}><Text variant="technical" style={styles.factLabel}>COMMAND FORMAT</Text><Text selectable variant="technical" style={styles.factValue}>{taskContext.commandFormat}</Text></View> : null}
                {taskContext.evidence ? <View style={styles.guidance}><Text variant="label" style={styles.guidanceLabel}>EVIDENCE</Text><Text variant="bodySmall" style={styles.guidanceText}>{taskContext.evidence}</Text></View> : null}
                {taskContext.nextAction ? <View style={styles.guidance}><Text variant="label" style={styles.guidanceLabel}>NEXT ACTION</Text><Text variant="bodySmall" style={styles.guidanceText}>{taskContext.nextAction}</Text></View> : null}
                {taskContext.networkReference?.length ? <View style={styles.reference}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: referenceExpanded }} onPress={() => setReferenceExpanded((current) => !current)} style={({ pressed }) => [styles.referenceToggle, pressed && styles.pressed]}>
                    <Text variant="label" style={styles.referenceTitle}>NETWORK REFERENCE</Text><Text variant="label">{referenceExpanded ? 'HIDE' : 'SHOW'}</Text>
                  </Pressable>
                  {referenceExpanded ? <View style={styles.referenceList}>{taskContext.networkReference.map((link, index) => <LinkConnectionRecord key={`${link.a.deviceName}-${link.a.interfaceName}-${link.b.deviceName}-${link.b.interfaceName}`} index={index + 1} {...link} />)}</View> : null}
                </View> : null}
              </ScrollView> : null}
              </View> : null}
            </View>
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
            {input.trim() ? <Text accessibilityLiveRegion="polite" variant="technical" style={styles.draftNotice}>DRAFT KEPT WHEN CONSOLE CLOSES</Text> : null}
            <View style={styles.actions}>
              <AppButton disabled={submitDisabled ?? !input.trim()} label="Run command" onPress={onSubmit} style={styles.action} />
              {footerActions}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </FixedThemeProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.background },
  keyboard: { flex: 1, minHeight: 0 },
  console: { width: '100%', maxWidth: 960, minWidth: 0, flex: 1, alignSelf: 'center', backgroundColor: '#100E11' },
  topContext: { width: '100%', minWidth: 0, flexGrow: 0, flexShrink: 0, alignSelf: 'stretch' },
  heading: { paddingHorizontal: Space.lg, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Palette.border },
  eyebrow: { color: Palette.orange },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: 2 },
  boundary: { color: Palette.textMuted, marginTop: 2 },
  devices: { width: '100%', minWidth: 0, flexGrow: 0, flexShrink: 0, borderBottomWidth: 1, borderBottomColor: Palette.border },
  deviceStrip: { flexGrow: 0, alignItems: 'center', padding: Space.sm },
  taskPanel: { minWidth: 0, flexGrow: 0, flexShrink: 0, borderBottomWidth: 1, borderBottomColor: Palette.border, backgroundColor: Palette.surfaceRaised },
  taskToggle: { minHeight: 52, minWidth: 0, justifyContent: 'center', gap: 2, paddingHorizontal: Space.md, paddingVertical: Space.sm },
  taskHeading: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm },
  taskEyebrow: { color: Palette.orange, fontFamily: Fonts.semibold },
  taskProgress: { color: Palette.green },
  taskSummary: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  taskTitle: { minWidth: 0, flex: 1, color: Palette.text, fontFamily: Fonts.medium },
  disclosureIcon: { color: Palette.orange },
  taskDetailsScroll: { maxHeight: 360, minWidth: 0 },
  taskDetails: { minWidth: 0, gap: Space.sm, padding: Space.md, borderTopWidth: 1, borderTopColor: Palette.border },
  taskRequirement: { color: Palette.text },
  factRow: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm, paddingVertical: Space.xs, borderBottomWidth: 1, borderBottomColor: Palette.border },
  factLabel: { minWidth: 112, color: Palette.textMuted },
  factValue: { minWidth: 0, flex: 1, flexShrink: 1, color: Palette.text, textAlign: 'right' },
  guidance: { minWidth: 0, gap: 2, paddingLeft: Space.sm, borderLeftWidth: 2, borderLeftColor: Palette.orange },
  guidanceLabel: { color: Palette.orange },
  guidanceText: { color: Palette.text },
  reference: { minWidth: 0, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
  referenceToggle: { minHeight: 44, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm, paddingHorizontal: Space.sm },
  referenceTitle: { color: Palette.text },
  referenceList: { minWidth: 0, gap: Space.sm, padding: Space.sm },
  transcriptScroll: { minHeight: 0, flexBasis: 0, flexGrow: 1, flexShrink: 1 },
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
  draftNotice: { color: Palette.green, paddingHorizontal: Space.sm, paddingTop: Space.xs },
  actions: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: Space.sm, padding: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border },
  action: { minWidth: 0, flexBasis: 200, flexGrow: 1, flexShrink: 1 },
});
