import { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';

import { getCliPrompt, getCliSuggestions, type CliNetworkState, type CliOutputLine } from '@/core/network/cli-simulator';
import { createSandboxCliState, executeSandboxCliCommand, type SandboxWorkspace } from '@/core/network/sandbox';
import { resolveCanonicalCliCommand } from '@/core/network/cli-command-catalog';
import { AppButton } from '@/shared/components/app-button';
import { CliConsoleShell } from '@/shared/components/cli-console-shell';
import { getSimulatorBoundaryCopy } from '@/shared/learner-facing-copy';
import { useGameStore } from '@/store/use-game-store';

interface TranscriptEntry extends CliOutputLine { id: number }

interface SandboxCliProps { visible: boolean; workspace: SandboxWorkspace; initialDeviceId: string; onClose: () => void; onCommit: (workspace: SandboxWorkspace) => void }

export function SandboxCli(props: SandboxCliProps) {
  if (!props.visible) return null;
  return <SandboxCliSession key={props.initialDeviceId} {...props} />;
}

function SandboxCliSession({ visible, workspace, initialDeviceId, onClose, onCommit }: SandboxCliProps) {
  const configurable = workspace.devices.filter((device) => device.type !== 'pc');
  const [deviceId, setDeviceId] = useState(initialDeviceId);
  const [session, setSession] = useState<CliNetworkState>(() => createSandboxCliState(workspace));
  const [input, setInput] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([{ id: 0, text: 'NETBITE CLI / SUPPORTED PRACTICE COMMANDS', tone: 'muted' }]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const nextId = useRef(1);
  const saveLearningItem = useGameStore((state) => state.saveLearningItem);
  const savedLearningItems = useGameStore((state) => state.savedLearningItems);
  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: false }); }, [transcript]);

  const sessionDevice = session.devices.find((device) => device.id === deviceId) ?? session.devices[0];
  if (!sessionDevice) return null;
  const canonicalCommand = resolveCanonicalCliCommand(input);
  const commandSaved = canonicalCommand ? Boolean(savedLearningItems[`cli-command:${canonicalCommand.id}`] && !savedLearningItems[`cli-command:${canonicalCommand.id}`].deletedAt) : false;
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
    <CliConsoleShell
      accessibilityLabel={`${sessionDevice.name} full-screen CLI`}
      boundary={getSimulatorBoundaryCopy('cli')}
      devices={configurable.map((device) => ({ id: device.id, label: device.name }))}
      eyebrow="NETWORK SANDBOX / CLI"
      footerActions={<><AppButton label="Help" variant="secondary" onPress={() => setInput('help')} />{canonicalCommand ? <AppButton accessibilityHint={canonicalCommand.description} disabled={commandSaved} label={commandSaved ? 'Command saved' : 'Save command reference'} variant="utility" onPress={() => saveLearningItem({ targetType: 'cli-command', targetId: canonicalCommand.id, chapterId: 'sandbox', title: canonicalCommand.command, note: '' })} /> : null}</>}
      input={input}
      lines={transcript}
      onClose={onClose}
      onHistoryNext={() => navigateHistory(-1)}
      onHistoryPrevious={() => navigateHistory(1)}
      onInputChange={setInput}
      onSelectDevice={setDeviceId}
      onSubmit={submit}
      prompt={getCliPrompt(sessionDevice)}
      selectedDeviceId={deviceId}
      suggestions={getCliSuggestions(sessionDevice, session)}
      testID="sandbox-cli-layout"
      title={`${sessionDevice.name} DEVICE CONSOLE`}
      transcriptRef={scrollRef}
      visible={visible}
    />
  );
}
