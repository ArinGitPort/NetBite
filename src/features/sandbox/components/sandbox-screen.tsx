import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  addSandboxDevice,
  applyBeginnerLanSetup,
  clearSandboxLearnedState,
  configureSandboxDevice,
  connectSandboxInterfaces,
  createGuidedSandboxWorkspace,
  createReadyRoutedSandboxWorkspace,
  moveSandboxDevice,
  getSandboxPingReadiness,
  previewBeginnerLanSetup,
  processSandboxFrame,
  removeSandboxDevice,
  removeSandboxLink,
  simulateSandboxPing,
  validateSandboxTopology,
  type SandboxDevicePatch,
  type SandboxDeviceType,
  type SandboxTraceResult,
} from '@/core/network/sandbox';
import { SandboxCanvas } from '@/features/sandbox/components/sandbox-canvas';
import { SandboxCli } from '@/features/sandbox/components/sandbox-cli';
import { SandboxInspector } from '@/features/sandbox/components/sandbox-inspector';
import { AppButton } from '@/shared/components/app-button';
import { FeedbackModal } from '@/shared/components/feedback-modal';
import { IconButton } from '@/shared/components/icon-button';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { selectionHaptic, successHaptic, warningHaptic } from '@/shared/haptics';
import { Fonts, Palette, Space, Typography } from '@/shared/theme';
import { useSandboxStore } from '@/store/use-sandbox-store';

type Confirmation = 'new' | 'clear' | 'preset' | 'beginner-lan' | 'remove-device' | 'remove-link';
type SandboxTool = 'add' | 'connect' | 'configure' | 'test' | 'workspace';

function Option({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: Boolean(selected) }} onPress={onPress} style={[styles.option, selected && styles.optionActive]}>
      <Text variant="technical" style={[styles.optionText, selected && styles.optionTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ToolButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.toolButton, selected && styles.toolButtonActive]}>
      <Text variant="label" style={[styles.toolButtonText, selected && styles.toolButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function SandboxScreen() {
  const screenRef = useRef<ScrollView>(null);
  const workspace = useSandboxStore((state) => state.workspace);
  const guideSeen = useSandboxStore((state) => state.guideSeen);
  const pastCount = useSandboxStore((state) => state.past.length);
  const futureCount = useSandboxStore((state) => state.future.length);
  const commitWorkspace = useSandboxStore((state) => state.commitWorkspace);
  const replaceWorkspace = useSandboxStore((state) => state.replaceWorkspace);
  const undo = useSandboxStore((state) => state.undo);
  const redo = useSandboxStore((state) => state.redo);
  const newNetwork = useSandboxStore((state) => state.newNetwork);
  const markGuideSeen = useSandboxStore((state) => state.markGuideSeen);
  const [guideVisible, setGuideVisible] = useState(!guideSeen);
  const [guideActive, setGuideActive] = useState(false);
  const [presetGuideActive, setPresetGuideActive] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>();
  const [selectedLinkId, setSelectedLinkId] = useState<string>();
  const [connectionStartId, setConnectionStartId] = useState<string>();
  const [notice, setNotice] = useState('Workspace ready. Choose Add or select a device.');
  const [zoom, setZoom] = useState(0.9);
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [cliDeviceId, setCliDeviceId] = useState<string>();
  const [sourceId, setSourceId] = useState<string>();
  const [destinationId, setDestinationId] = useState<string>();
  const [broadcast, setBroadcast] = useState(false);
  const [pingTarget, setPingTarget] = useState('');
  const [trace, setTrace] = useState<SandboxTraceResult>();
  const [traceIndex, setTraceIndex] = useState(0);
  const [testType, setTestType] = useState<'frame' | 'ping'>();
  const [activeTool, setActiveTool] = useState<SandboxTool>();

  const selectedDevice = workspace.devices.find((device) => device.id === selectedDeviceId);
  const selectedLink = workspace.links.find((link) => link.id === selectedLinkId);
  const issues = useMemo(() => validateSandboxTopology(workspace), [workspace]);
  const endpoints = workspace.devices.filter((device) => device.type !== 'switch');
  const configuredPingTargets = endpoints.flatMap((device) => device.interfaces
    .filter((item) => item.adminUp && item.ipv4 && item.prefix !== undefined)
    .map((item) => ({ deviceId: device.id, deviceName: device.name, interfaceId: item.id, address: item.ipv4! })));
  const pingReadiness = useMemo(() => getSandboxPingReadiness(workspace, sourceId, pingTarget), [workspace, sourceId, pingTarget]);
  const beginnerLanSetup = useMemo(() => previewBeginnerLanSetup(workspace), [workspace]);
  const unconfiguredPcs = workspace.devices.filter((device) => device.type === 'pc' && !device.interfaces.some((item) => item.adminUp && item.ipv4 && item.prefix !== undefined));
  const guideConnections = guideActive ? workspace.links.filter((link) => link.a.deviceId === 'switch-1' || link.b.deviceId === 'switch-1').length : 0;
  const activeTraceEvent = trace?.events[traceIndex];
  const selectedSource = workspace.devices.find((device) => device.id === sourceId);
  const sourceReadinessIssue = pingReadiness.issues.find((issue) => issue.code.startsWith('source'));
  const destinationReadinessIssue = pingReadiness.issues.find((issue) => issue.code.startsWith('destination'));
  const selectedSourceInterface = selectedSource?.interfaces.find((item) => item.id === pingReadiness.sourceInterfaceId);
  const availablePingTargets = configuredPingTargets.filter((item) => item.deviceId !== sourceId);

  const commitWorkspaceChange = (nextWorkspace: typeof workspace) => {
    commitWorkspace(nextWorkspace);
    setTrace(undefined);
    setTraceIndex(0);
  };

  useEffect(() => {
    const shouldRevealPanel = activeTool === 'add'
      || activeTool === 'test'
      || activeTool === 'workspace'
      || (activeTool === 'configure' && Boolean(selectedDevice));

    if (!shouldRevealPanel) return;

    let layoutFrame: number | undefined;
    const renderFrame = requestAnimationFrame(() => {
      layoutFrame = requestAnimationFrame(() => screenRef.current?.scrollToEnd({ animated: true }));
    });

    return () => {
      cancelAnimationFrame(renderFrame);
      if (layoutFrame !== undefined) cancelAnimationFrame(layoutFrame);
    };
  }, [activeTool, selectedDevice, testType, trace]);

  const chooseTool = (tool: SandboxTool) => {
    if (activeTool === tool) {
      setActiveTool(undefined);
      setConnectionStartId(undefined);
      return;
    }
    setActiveTool(tool);
    setSelectedLinkId(undefined);
    setConnectionStartId(tool === 'connect' ? selectedDeviceId : undefined);
    if (tool === 'connect') setNotice(selectedDevice ? `Connect from ${selectedDevice.name}. Tap the second device.` : 'Tap the first device, then tap the device to connect.');
    if (tool === 'configure' && !selectedDevice) setNotice('Tap a device on the canvas to configure it.');
  };

  const selectDevice = (deviceId: string) => {
    if (activeTool === 'connect' && !connectionStartId) {
      const name = workspace.devices.find((device) => device.id === deviceId)?.name;
      setConnectionStartId(deviceId);
      setSelectedDeviceId(deviceId);
      setSelectedLinkId(undefined);
      setNotice(`${name} selected. Tap the device to connect.`);
      selectionHaptic();
      return;
    }
    if (activeTool === 'connect' && connectionStartId) {
      const result = connectSandboxInterfaces(workspace, connectionStartId, deviceId);
      setConnectionStartId(undefined);
      if (!result.ok) { setNotice(result.message); warningHaptic(); return; }
      commitWorkspaceChange(result.state);
      setSelectedDeviceId(deviceId);
      setSelectedLinkId(undefined);
      setActiveTool(undefined);
      setNotice(`${result.link.a.interfaceId} connected to ${result.link.b.interfaceId}. Choose another action when ready.`);
      successHaptic();
      return;
    }
    setSelectedDeviceId(deviceId);
    setSelectedLinkId(undefined);
    selectionHaptic();
  };

  const addDevice = (type: SandboxDeviceType) => {
    const index = workspace.devices.length;
    const result = addSandboxDevice(workspace, type, { x: 40 + (index % 4) * 160, y: 55 + Math.floor(index / 4) * 120 });
    if (!result.ok) { setNotice(result.message); warningHaptic(); return; }
    commitWorkspaceChange(result.state);
    setSelectedDeviceId(result.device.id);
    setSelectedLinkId(undefined);
    setNotice(`${result.device.name} added. Connect it or open Configure to edit it.`);
    selectionHaptic();
  };

  const configure = (patch: SandboxDevicePatch) => {
    if (!selectedDevice) return { ok: false, message: 'Select a device.' };
    const result = configureSandboxDevice(workspace, selectedDevice.id, patch);
    if (result.ok) { commitWorkspaceChange(result.state); selectionHaptic(); return { ok: true }; }
    warningHaptic();
    return { ok: false, message: result.message };
  };

  const runFrame = () => {
    if (!sourceId) { setNotice('Choose a source device first.'); return; }
    const destination = workspace.devices.find((device) => device.id === destinationId);
    if (!broadcast && !destination) { setNotice('Choose a destination or select broadcast.'); return; }
    const result = processSandboxFrame(workspace, sourceId, broadcast ? undefined : destination!.interfaces[0].macAddress);
    commitWorkspace(result.state);
    setTrace(result);
    setTraceIndex(0);
    setNotice(result.reason);
    if (result.success) successHaptic(); else warningHaptic();
  };

  const runPing = () => {
    if (!pingReadiness.ready || !pingReadiness.sourceDeviceId || !pingReadiness.destinationIp) {
      setTrace(undefined);
      setNotice(pingReadiness.issues[0]?.message ?? 'Complete the ping setup first.');
      warningHaptic();
      return;
    }
    const result = simulateSandboxPing(workspace, pingReadiness.sourceDeviceId, pingReadiness.destinationIp);
    commitWorkspace(result.state);
    setTrace(result);
    setTraceIndex(0);
    setNotice(result.reason);
    if (result.success) successHaptic(); else warningHaptic();
  };

  const choosePingTest = () => {
    const currentSource = endpoints.find((device) => device.id === sourceId && device.interfaces.some((item) => item.adminUp && item.ipv4));
    const preferredSource = currentSource
      ?? endpoints.find((device) => device.id === 'pc-1' && device.interfaces.some((item) => item.adminUp && item.ipv4))
      ?? endpoints.find((device) => device.type === 'pc' && device.interfaces.some((item) => item.adminUp && item.ipv4))
      ?? endpoints.find((device) => device.interfaces.some((item) => item.adminUp && item.ipv4))
      ?? endpoints.find((device) => device.id === 'pc-1')
      ?? endpoints.find((device) => device.type === 'pc')
      ?? endpoints[0];
    const preferredDestination = configuredPingTargets.find((item) => item.deviceId === 'pc-2' && item.deviceId !== preferredSource?.id)
      ?? configuredPingTargets.find((item) => item.deviceId !== preferredSource?.id && workspace.devices.find((device) => device.id === item.deviceId)?.type === 'pc')
      ?? configuredPingTargets.find((item) => item.deviceId !== preferredSource?.id);
    setTestType('ping');
    setTrace(undefined);
    if (preferredSource) setSourceId(preferredSource.id);
    if (!pingTarget && preferredDestination) setPingTarget(preferredDestination.address);
  };

  const choosePingSource = (deviceId: string) => {
    setSourceId(deviceId);
    setTrace(undefined);
    const targetBelongsToSource = configuredPingTargets.some((item) => item.deviceId === deviceId && item.address === pingTarget);
    if (!pingTarget || targetBelongsToSource) {
      const preferred = configuredPingTargets.find((item) => item.deviceId !== deviceId && workspace.devices.find((device) => device.id === item.deviceId)?.type === 'pc')
        ?? configuredPingTargets.find((item) => item.deviceId !== deviceId);
      setPingTarget(preferred?.address ?? '');
    }
  };

  const choosePingTarget = (address: string) => {
    setPingTarget(address);
    setTrace(undefined);
  };

  const configureDeviceFromTest = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setSelectedLinkId(undefined);
    setTrace(undefined);
    setActiveTool('configure');
    setNotice(`Configure ${workspace.devices.find((device) => device.id === deviceId)?.name}, then save its addressing.`);
  };

  const loadReadyNetwork = (keepUndo: boolean) => {
    const preset = createReadyRoutedSandboxWorkspace();
    if (keepUndo) commitWorkspace(preset); else replaceWorkspace(preset);
    markGuideSeen();
    setGuideActive(false);
    setPresetGuideActive(true);
    setSelectedDeviceId('pc-1');
    setSelectedLinkId(undefined);
    setConnectionStartId(undefined);
    setSourceId('pc-1');
    setDestinationId('pc-2');
    setBroadcast(false);
    setPingTarget('192.168.20.20');
    setTrace(undefined);
    setActiveTool(undefined);
    setNotice('Ready routed network loaded. Follow the guide, then change anything you want.');
    successHaptic();
  };

  const confirmAction = () => {
    if (confirmation === 'new') { newNetwork(); setSelectedDeviceId(undefined); setSelectedLinkId(undefined); setTrace(undefined); setNotice('New empty network created.'); }
    if (confirmation === 'clear') { commitWorkspace(clearSandboxLearnedState(workspace)); setTrace(undefined); setNotice('MAC and ARP tables cleared.'); }
    if (confirmation === 'preset') loadReadyNetwork(true);
    if (confirmation === 'beginner-lan') {
      const result = applyBeginnerLanSetup(workspace);
      if (result.ok) {
        commitWorkspace(result.state);
        setSourceId(result.preview.pcIds[0]);
        setDestinationId(result.preview.pcIds[1]);
        setPingTarget('192.168.10.20');
        setTestType('ping');
        setTrace(undefined);
        setTraceIndex(0);
        setActiveTool('test');
        setNotice('Beginner LAN ready. Both PCs are in 192.168.10.0/24, so no gateway is needed.');
        successHaptic();
      } else {
        setNotice(result.message);
        warningHaptic();
      }
    }
    if (confirmation === 'remove-device' && selectedDevice) { commitWorkspaceChange(removeSandboxDevice(workspace, selectedDevice.id)); setSelectedDeviceId(undefined); setActiveTool(undefined); setNotice(`${selectedDevice.name} removed.`); }
    if (confirmation === 'remove-link' && selectedLink) { commitWorkspaceChange(removeSandboxLink(workspace, selectedLink.id)); setSelectedLinkId(undefined); setNotice('Link removed.'); }
    setConfirmation(undefined);
  };

  const finishGuide = () => {
    markGuideSeen();
    setGuideActive(false);
    setNotice('Guided build complete. The workspace is now unrestricted.');
    successHaptic();
  };

  return (
    <Screen scrollRef={screenRef}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Back to main menu" icon="arrow-left" label="BACK / MENU" onPress={() => router.dismissTo('/')} />
        <AppButton label={activeTool === 'workspace' ? 'Close tools' : 'More'} variant="secondary" onPress={() => chooseTool('workspace')} />
      </View>
      <Text variant="label" style={styles.eyebrow}>FREE PLAY / DETERMINISTIC STATE MODEL</Text>
      <Text variant="screenTitle" style={styles.title}>NETWORK SANDBOX</Text>
      <Text variant="bodySmall" style={styles.subtitle}>Build, configure, and test a bounded Ethernet and IPv4 network. Results explain only what this modeled state proves.</Text>

      {guideActive ? (
        <View style={styles.guideBanner}>
          <Text variant="label" style={styles.guideTitle}>GUIDED BUILD / {Math.min(guideConnections, 2)} OF 2 LINKS</Text>
          <Text variant="bodySmall" style={styles.guideCopy}>{guideConnections === 0 ? 'Select PC-1, choose Connect, then tap SW-1.' : guideConnections === 1 ? 'Connect PC-2 to SW-1.' : 'Both PCs share the switch. Finish the guide to keep experimenting.'}</Text>
          {guideConnections >= 2 ? <AppButton label="Finish guide" onPress={finishGuide} /> : <AppButton label="Skip guide" variant="secondary" onPress={finishGuide} />}
        </View>
      ) : null}

      {presetGuideActive ? (
        <View style={styles.presetGuide}>
          <Text variant="label" style={styles.presetGuideTitle}>READY ROUTED NETWORK / TINKERING GUIDE</Text>
          <Text variant="bodySmall" style={styles.presetGuideCopy}>PC-1 is in 192.168.10.0/24 and PC-2 is in 192.168.20.0/24. R-1 joins the two LANs through one interface in each network.</Text>
          <View style={styles.guideStep}><Text variant="label" style={styles.guideStepNumber}>01</Text><Text variant="bodySmall" style={styles.guideStepCopy}>Inspect PC-1 and R-1. PC-1 uses 192.168.10.1 as its gateway; that address belongs to R-1 G0/0.</Text></View>
          <View style={styles.guideStep}><Text variant="label" style={styles.guideStepNumber}>02</Text><Text variant="bodySmall" style={styles.guideStepCopy}>Choose Test → Ping. PC-1 and 192.168.20.20 are preselected. Step through how R-1 forwards between the two networks.</Text></View>
          <View style={styles.guideStep}><Text variant="label" style={styles.guideStepNumber}>03</Text><Text variant="bodySmall" style={styles.guideStepCopy}>Select R-1 → Configure → Open CLI. Try `show ip interface brief` and `show ip route` to inspect its connected networks.</Text></View>
          <View style={styles.guideStep}><Text variant="label" style={styles.guideStepNumber}>04</Text><Text variant="bodySmall" style={styles.guideStepCopy}>Disable R-1 G0/1, repeat the ping, then use Undo under More to restore the working path.</Text></View>
          <View style={styles.guideActions}><AppButton label="Inspect PC-1" onPress={() => { setSelectedDeviceId('pc-1'); setActiveTool('configure'); setPresetGuideActive(false); setNotice('Inspect the current address, then select PC-2 when ready.'); }} /><AppButton label="Hide guide" variant="secondary" onPress={() => setPresetGuideActive(false)} /></View>
        </View>
      ) : null}

      <View accessibilityLabel="Sandbox actions" style={styles.toolDock}>
        <ToolButton label="Add" selected={activeTool === 'add'} onPress={() => chooseTool('add')} />
        <ToolButton label="Connect" selected={activeTool === 'connect'} onPress={() => chooseTool('connect')} />
        <ToolButton label="Configure" selected={activeTool === 'configure'} onPress={() => chooseTool('configure')} />
        <ToolButton label="Test" selected={activeTool === 'test'} onPress={() => chooseTool('test')} />
      </View>

      <SandboxCanvas
        workspace={workspace}
        selectedDeviceId={selectedDeviceId}
        selectedLinkId={selectedLinkId}
        connectionStartId={connectionStartId}
        connectMode={activeTool === 'connect'}
        traceEvent={activeTool === 'test' ? activeTraceEvent : undefined}
        zoom={zoom}
        onSelectDevice={selectDevice}
        onSelectLink={(linkId) => { setSelectedLinkId(linkId); setSelectedDeviceId(undefined); setConnectionStartId(undefined); setActiveTool(undefined); }}
        onMoveDevice={(deviceId, position) => commitWorkspaceChange(moveSandboxDevice(workspace, deviceId, position))}
      />

      <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.notice}>{notice}</Text>
      {selectedDevice ? <View style={styles.selectionBar}><View style={styles.selectionCopy}><Text variant="label" style={styles.selectionTitle}>SELECTED / {selectedDevice.name}</Text><Text variant="technical" style={styles.selectionDetail}>{selectedDevice.interfaces.filter((item) => workspace.links.some((link) => [link.a, link.b].some((endpoint) => endpoint.deviceId === selectedDevice.id && endpoint.interfaceId === item.id))).length} CONNECTED INTERFACES</Text></View></View> : null}
      {selectedLink ? <View style={styles.selectionBar}><View style={styles.selectionCopy}><Text variant="label" style={styles.selectionTitle}>SELECTED / ETHERNET LINK</Text><Text variant="technical" style={styles.selectionDetail}>{selectedLink.a.deviceId} {selectedLink.a.interfaceId} ↔ {selectedLink.b.deviceId} {selectedLink.b.interfaceId}</Text></View><AppButton label="Remove link" variant="secondary" onPress={() => setConfirmation('remove-link')} /></View> : null}

      {activeTool === 'add' ? (
        <View style={styles.actionPanel}>
          <Text variant="label" style={styles.actionEyebrow}>ADD A DEVICE</Text>
          <Text variant="bodySmall" style={styles.actionCopy}>Choose one device. It appears on the canvas and becomes selected.</Text>
          <View style={styles.controlGrid}><AppButton label="PC" variant="secondary" onPress={() => addDevice('pc')} /><AppButton label="Switch" variant="secondary" onPress={() => addDevice('switch')} /><AppButton label="Router" variant="secondary" onPress={() => addDevice('router')} /></View>
        </View>
      ) : null}

      {activeTool === 'connect' ? (
        <View style={styles.actionPanel}>
          <Text variant="label" style={styles.actionEyebrow}>CONNECT TWO DEVICES</Text>
          <Text variant="body" style={styles.actionCopy}>{connectionStartId ? `${workspace.devices.find((device) => device.id === connectionStartId)?.name} is the first device. Tap the second device on the canvas.` : 'Tap the first device on the canvas, then tap the second device.'}</Text>
          {connectionStartId ? <AppButton label="Cancel connection" variant="secondary" onPress={() => { setConnectionStartId(undefined); setActiveTool(undefined); setNotice('Connection cancelled.'); }} /> : null}
        </View>
      ) : null}

      {activeTool === 'configure' ? selectedDevice && !cliDeviceId ? (
        <SandboxInspector key={selectedDevice.id} device={selectedDevice} issues={issues} onConfigure={configure} onRemove={() => setConfirmation('remove-device')} onOpenCli={() => setCliDeviceId(selectedDevice.id)} />
      ) : (
        <View style={styles.actionPanel}><Text variant="label" style={styles.actionEyebrow}>CONFIGURE A DEVICE</Text><Text variant="body" style={styles.actionCopy}>Tap a PC, switch, or router on the canvas. Only settings supported by that device will appear.</Text></View>
      ) : null}

      {activeTool === 'test' ? (
        <View style={styles.testPanel}>
          <Text variant="label" style={styles.testEyebrow}>TEST THE NETWORK</Text>
          <Text variant="sectionHeading" style={styles.testTitle}>DETERMINISTIC TRACE</Text>
          <Text variant="bodySmall" style={styles.testDetail}>Choose one test. The sandbox will ask only for the information that test needs.</Text>
          <Text variant="technical" style={styles.pickerLabel}>TEST TYPE</Text>
          <View style={styles.optionRow}><Option label="ETHERNET FRAME" selected={testType === 'frame'} onPress={() => { setTestType('frame'); setTrace(undefined); }} /><Option label="PING" selected={testType === 'ping'} onPress={choosePingTest} /></View>
          {testType ? <><Text variant="technical" style={styles.pickerLabel}>SOURCE</Text><View style={styles.optionRow}>{endpoints.map((device) => <Option key={device.id} label={device.name} selected={sourceId === device.id} onPress={() => testType === 'ping' ? choosePingSource(device.id) : setSourceId(device.id)} />)}</View></> : null}
          {testType === 'frame' ? <View style={styles.testChoice}>
            <Text variant="label" style={styles.testChoiceTitle}>ETHERNET FRAME</Text>
            <Text variant="bodySmall" style={styles.testDetail}>Choose a destination or send a broadcast.</Text>
            <View style={styles.optionRow}><Option label="BROADCAST" selected={broadcast} onPress={() => { setBroadcast(true); setDestinationId(undefined); }} />{endpoints.filter((device) => device.id !== sourceId).map((device) => <Option key={device.id} label={device.name} selected={!broadcast && destinationId === device.id} onPress={() => { setBroadcast(false); setDestinationId(device.id); }} />)}</View>
            <AppButton label="Send frame" onPress={runFrame} />
          </View> : null}
          {testType === 'ping' ? <View style={styles.testChoice}>
            <Text variant="label" style={styles.testChoiceTitle}>PING</Text>
            <Text variant="bodySmall" style={styles.testDetail}>Choose a configured address or enter another IPv4 destination.</Text>
            {beginnerLanSetup?.requiresChanges ? <View style={styles.setupPanel}>
              <Text variant="label" style={styles.setupTitle}>BEGINNER LAN AVAILABLE</Text>
              <Text variant="bodySmall" style={styles.setupCopy}>This two-PC switched network can be prepared with a working local example. You will review the changes before they are applied.</Text>
              {beginnerLanSetup.changes.map((change) => <Text key={change.deviceId} variant="technical" style={styles.setupChange}>{change.deviceName} / {change.after}</Text>)}
              <AppButton label="Set up beginner LAN" variant="secondary" onPress={() => setConfirmation('beginner-lan')} />
            </View> : null}
            <View accessibilityLiveRegion="polite" style={styles.readinessPanel}>
              <Text variant="label" style={styles.readinessTitle}>PING READINESS</Text>
              <Text variant="bodySmall" style={sourceReadinessIssue ? styles.readinessMissing : styles.readinessReady}>{sourceReadinessIssue ? '[ ]' : '[X]'} SOURCE / {sourceReadinessIssue?.message ?? `${selectedSource?.name}${selectedSourceInterface ? ` ${selectedSourceInterface.id}` : ''} / ${pingReadiness.sourceAddress}${selectedSourceInterface?.prefix !== undefined ? `/${selectedSourceInterface.prefix}` : ''}`}</Text>
              <Text variant="bodySmall" style={destinationReadinessIssue ? styles.readinessMissing : styles.readinessReady}>{destinationReadinessIssue ? '[ ]' : '[X]'} DESTINATION / {destinationReadinessIssue?.message ?? pingTarget.trim()}</Text>
              {unconfiguredPcs.map((device) => <AppButton key={device.id} label={`Configure ${device.name}`} variant="secondary" onPress={() => configureDeviceFromTest(device.id)} />)}
            </View>
            {availablePingTargets.length ? <View style={styles.optionRow}>{availablePingTargets.map((item) => <Option key={`${item.deviceId}-${item.interfaceId}`} label={`${item.deviceName} / ${item.address}`} selected={pingTarget === item.address} onPress={() => choosePingTarget(item.address)} />)}</View> : <Text variant="bodySmall" style={styles.noTarget}>No other configured device address is available yet. Configure another PC or enter a valid address manually.</Text>}
            <TextInput accessibilityLabel="Ping destination IPv4 address" autoCapitalize="none" autoCorrect={false} onChangeText={choosePingTarget} placeholder="EXAMPLE / 192.168.1.20" placeholderTextColor={Palette.textMuted} selectionColor={Palette.orange} style={[styles.pingInput, destinationReadinessIssue?.code === 'destination-invalid' && styles.pingInputInvalid]} value={pingTarget} />
            <AppButton label="Run ping" disabled={!pingReadiness.ready} onPress={runPing} />
          </View> : null}
          {trace ? <View accessibilityLiveRegion="polite" style={[styles.tracePanel, trace.success ? styles.traceSuccess : styles.traceWarning]}><Text variant="label" style={trace.success ? styles.traceSuccessText : styles.traceWarningText}>{trace.success ? 'TRACE COMPLETE' : 'TRACE STOPPED'} / STEP {traceIndex + 1} OF {trace.events.length}</Text><Text variant="sectionHeading" style={styles.traceTitle}>{activeTraceEvent?.title}</Text><Text variant="body" style={styles.traceDetail}>{activeTraceEvent?.detail}</Text><Text variant="bodySmall" style={styles.traceConclusion}>{trace.conclusion}</Text>{trace.suggestion ? <Text variant="bodySmall" style={styles.traceSuggestion}>NEXT CHECK / {trace.suggestion}</Text> : null}<View style={styles.traceActions}><AppButton label="Previous step" variant="secondary" disabled={traceIndex === 0} onPress={() => setTraceIndex((value) => Math.max(0, value - 1))} /><AppButton label="Next step" disabled={traceIndex >= trace.events.length - 1} onPress={() => setTraceIndex((value) => Math.min(trace.events.length - 1, value + 1))} /></View></View> : null}
        </View>
      ) : null}

      {activeTool === 'workspace' ? (
        <View style={styles.actionPanel}>
          <Text variant="label" style={styles.actionEyebrow}>WORKSPACE TOOLS</Text>
          <Text variant="bodySmall" style={styles.actionCopy}>These controls affect the canvas or autosaved workspace, not an individual device.</Text>
          <View style={styles.controlGrid}><AppButton label="Load routed preset" variant="secondary" onPress={() => workspace.devices.length ? setConfirmation('preset') : loadReadyNetwork(true)} /><AppButton label="Undo" variant="secondary" disabled={pastCount === 0} onPress={() => { undo(); setTrace(undefined); setTraceIndex(0); }} /><AppButton label="Redo" variant="secondary" disabled={futureCount === 0} onPress={() => { redo(); setTrace(undefined); setTraceIndex(0); }} /><AppButton label="Zoom out" variant="secondary" disabled={zoom <= 0.75} onPress={() => setZoom((value) => Math.max(0.75, value - 0.15))} /><AppButton label="Zoom in" variant="secondary" disabled={zoom >= 1.2} onPress={() => setZoom((value) => Math.min(1.2, value + 0.15))} /><AppButton label="Reset view" variant="secondary" onPress={() => setZoom(0.9)} /><AppButton label="Clear learned state" variant="secondary" onPress={() => setConfirmation('clear')} /><AppButton label="New network" variant="secondary" onPress={() => setConfirmation('new')} /></View>
          <Text variant="technical" style={styles.footer}>SUPPORTED / ETHERNET, MAC LEARNING, ARP, IPV4, STATIC ROUTES, VLAN ACCESS + TRUNKS, ICMP ECHO</Text>
          <Text variant="technical" style={styles.footer}>NOT MODELED / STP, DYNAMIC ROUTING, DHCP, DNS, NAT, ACLS, TIMING, LOSS, OR LIVE PACKETS</Text>
        </View>
      ) : null}

      <SandboxCli visible={Boolean(cliDeviceId)} workspace={workspace} initialDeviceId={cliDeviceId ?? ''} onClose={() => setCliDeviceId(undefined)} onCommit={commitWorkspaceChange} />
      <FeedbackModal visible={guideVisible} eyebrow="FIRST SANDBOX SESSION" title="How do you want to begin?" message="Explore a complete routed network, or build a smaller switched LAN yourself." detail="The routed preset includes valid addresses, gateways, two switches, one router, a working ping, and CLI experiments." primaryAction={{ label: 'Explore routed network', onPress: () => { setGuideVisible(false); loadReadyNetwork(false); } }} secondaryAction={{ label: 'Build it myself', variant: 'secondary', onPress: () => { replaceWorkspace(createGuidedSandboxWorkspace()); setGuideVisible(false); setGuideActive(true); } }} onRequestClose={() => { markGuideSeen(); setGuideVisible(false); }} />
      <FeedbackModal visible={Boolean(confirmation)} tone="warning" eyebrow="CONFIRM SANDBOX ACTION" title={confirmation === 'new' ? 'Create a new network?' : confirmation === 'clear' ? 'Clear learned state?' : confirmation === 'preset' ? 'Load the routed preset?' : confirmation === 'beginner-lan' ? 'Apply beginner addresses?' : confirmation === 'remove-device' ? 'Remove this device?' : 'Remove this link?'} message={confirmation === 'new' ? 'All devices, links, and configuration in the autosaved workspace will be erased.' : confirmation === 'clear' ? 'MAC and ARP tables plus the current trace will be cleared. Topology and configuration remain.' : confirmation === 'preset' ? 'The current workspace will be replaced by a five-device, two-LAN routed example. You can undo this afterward.' : confirmation === 'beginner-lan' ? beginnerLanSetup?.changes.map((change) => `${change.deviceName}: ${change.before} → ${change.after}`).join('\n') ?? 'The beginner setup is no longer available.' : confirmation === 'remove-device' ? 'Connected links will also be removed.' : 'The two endpoint interfaces will become available.'} detail={confirmation === 'beginner-lan' ? `${beginnerLanSetup?.overwritesExistingConfiguration ? 'Existing addressing or switchport settings shown above will be replaced. ' : ''}Both PCs will use VLAN 1 and require no default gateway.` : undefined} primaryAction={{ label: confirmation === 'preset' ? 'Load routed preset' : confirmation === 'beginner-lan' ? 'Apply setup' : 'Confirm action', onPress: confirmAction }} secondaryAction={{ label: 'Keep working', variant: 'secondary', onPress: () => setConfirmation(undefined) }} onRequestClose={() => setConfirmation(undefined)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'center', gap: Space.sm, marginBottom: Space.lg },
  eyebrow: { color: Palette.orange },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xs },
  subtitle: { color: Palette.textMuted, marginTop: Space.sm, marginBottom: Space.lg },
  guideBanner: { borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.greenSoft, padding: Space.lg, gap: Space.sm, marginBottom: Space.lg },
  guideTitle: { color: Palette.green },
  guideCopy: { color: Palette.text },
  presetGuide: { borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.greenSoft, padding: Space.lg, gap: Space.md, marginBottom: Space.lg },
  presetGuideTitle: { color: Palette.green },
  presetGuideCopy: { color: Palette.text },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md, borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: Space.md },
  guideStepNumber: { color: Palette.orange, minWidth: 28 },
  guideStepCopy: { color: Palette.text, flex: 1, minWidth: 0 },
  guideActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  toolDock: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginBottom: Space.sm },
  toolButton: { minWidth: 140, minHeight: 48, flexBasis: 0, flexGrow: 1, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center', padding: Space.sm },
  toolButtonActive: { borderColor: Palette.accentBright, backgroundColor: Palette.accentSoft },
  toolButtonText: { color: Palette.text },
  toolButtonTextActive: { color: Palette.accentBright },
  notice: { color: Palette.orange, minHeight: 44, paddingVertical: Space.sm },
  selectionBar: { minHeight: 60, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.md, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.md, marginBottom: Space.lg },
  selectionCopy: { flex: 1, minWidth: 180 },
  selectionTitle: { color: Palette.accentBright },
  selectionDetail: { color: Palette.textMuted, marginTop: Space.xs },
  actionPanel: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg, gap: Space.md, marginBottom: Space.lg },
  actionEyebrow: { color: Palette.orange },
  actionCopy: { color: Palette.text },
  controlGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  testPanel: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg, gap: Space.md, marginBottom: Space.lg },
  testEyebrow: { color: Palette.orange },
  testTitle: { color: Palette.text, fontFamily: Fonts.semibold },
  testDetail: { color: Palette.textMuted },
  testChoice: { borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: Space.md, gap: Space.md },
  testChoiceTitle: { color: Palette.green },
  setupPanel: { borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.greenSoft, padding: Space.md, gap: Space.sm },
  setupTitle: { color: Palette.green },
  setupCopy: { color: Palette.text },
  setupChange: { color: Palette.text },
  readinessPanel: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background, padding: Space.md, gap: Space.sm },
  readinessTitle: { color: Palette.textMuted },
  readinessReady: { color: Palette.green },
  readinessMissing: { color: Palette.orange },
  noTarget: { color: Palette.orange },
  pickerLabel: { color: Palette.textMuted },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  option: { minWidth: 100, minHeight: 44, flexGrow: 1, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center', padding: Space.sm },
  optionActive: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  optionText: { color: Palette.textMuted },
  optionTextActive: { color: Palette.orange },
  pingInput: { minHeight: 48, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background, color: Palette.white, paddingHorizontal: Space.md, fontFamily: Fonts.mono, ...Typography.bodySmall },
  pingInputInvalid: { borderColor: Palette.orange },
  tracePanel: { borderWidth: 1, padding: Space.lg, gap: Space.sm },
  traceSuccess: { borderColor: Palette.green, backgroundColor: Palette.greenSoft },
  traceWarning: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  traceSuccessText: { color: Palette.green },
  traceWarningText: { color: Palette.orange },
  traceTitle: { color: Palette.text, fontFamily: Fonts.semibold },
  traceDetail: { color: Palette.text },
  traceConclusion: { color: Palette.textMuted },
  traceSuggestion: { color: Palette.orange },
  traceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginTop: Space.sm },
  footer: { color: Palette.textMuted },
});
