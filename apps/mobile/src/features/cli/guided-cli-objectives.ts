import type { CliNetworkState } from '@/core/network/cli-simulator';
import { requiredStaticRoutes, type CliLabDefinition } from '@/features/cli/cli-lab-definitions';

export type GuidedCliObjectiveState = 'not-started' | 'in-progress' | 'ready' | 'attention' | 'complete' | 'blocked';

export interface GuidedCliNextAction {
  type: 'open-cli' | 'inspect' | 'continue' | 'none';
  label: string;
  instruction: string;
  deviceId?: string;
}

export interface GuidedCliObjectiveDetail {
  id: string;
  label: string;
  value?: string;
  complete: boolean;
  description: string;
}

export interface GuidedCliObjective {
  id: string;
  title: string;
  state: GuidedCliObjectiveState;
  progress?: string;
  requirement: string;
  evidence: string;
  blockingReason?: string;
  details?: GuidedCliObjectiveDetail[];
  nextAction?: GuidedCliNextAction;
}

export interface GuidedCliObjectiveContext {
  definition: CliLabDefinition;
  network: CliNetworkState;
  events: string[];
  diagnosticEvidenceReady?: boolean;
  diagnosticScenarioIndex?: number;
  diagnosticScenarioCount?: number;
  diagnosticConclusionCorrect?: boolean;
  vlanPredictions?: Record<string, boolean>;
}

function sameSet(values: number[] | undefined, expected: number[]) {
  return Boolean(values && values.length === expected.length && expected.every((value) => values.includes(value)));
}

function routeMatches(network: CliNetworkState, required: (typeof requiredStaticRoutes)[number]) {
  return Boolean(network.devices.find(({ id }) => id === required.deviceId)?.routes.some((route) =>
    route.prefix === required.prefix && route.prefixLength === required.prefixLength && route.nextHop === required.nextHop));
}

export function deriveStaticRouteProgress(network: CliNetworkState) {
  const configured = requiredStaticRoutes.filter((required) => routeMatches(network, required)).length;
  const staticCount = network.devices.flatMap(({ routes }) => routes).filter(({ source }) => source === 'static').length;
  const conflicting = Math.max(0, staticCount - configured);
  return { configured, staticCount, conflicting, exact: configured === requiredStaticRoutes.length && staticCount === requiredStaticRoutes.length };
}

function routingObjectives(context: GuidedCliObjectiveContext): GuidedCliObjective[] {
  const progress = deriveStaticRouteProgress(context.network);
  const devices = ['r1', 'r2', 'r3'].map((deviceId) => {
    const required = requiredStaticRoutes.filter((route) => route.deviceId === deviceId);
    const configured = required.filter((route) => routeMatches(context.network, route)).length;
    const name = context.network.devices.find(({ id }) => id === deviceId)?.name ?? deviceId.toUpperCase();
    const destinations = required.map((route) => `${route.prefix}/${route.prefixLength}`).join(' and ');
    return { deviceId, name, required, configured, destinations };
  });
  const nextDevice = devices.find(({ configured, required }) => configured < required.length);
  const routeState: GuidedCliObjectiveState = progress.exact
    ? 'complete'
    : progress.conflicting > 0
      ? 'attention'
      : progress.staticCount === 0
        ? 'not-started'
        : 'in-progress';
  const routeObjective: GuidedCliObjective = {
    id: 'routing-routes',
    title: 'CONFIGURE REMOTE ROUTES',
    state: routeState,
    progress: `${progress.configured} OF ${requiredStaticRoutes.length}`,
    requirement: 'Each router needs a static route for every remote LAN. Choose the adjacent router as the next hop.',
    evidence: 'Use SHOW IP ROUTE on R1, R2, and R3. The final state must contain the four required routes and no conflicting extras.',
    blockingReason: progress.conflicting > 0 ? `${progress.conflicting} extra or incorrect static route${progress.conflicting === 1 ? '' : 's'} must be removed or corrected.` : undefined,
    details: devices.map(({ deviceId, name, configured, required, destinations }) => ({
      id: `route-${deviceId}`,
      label: name,
      value: `${configured} OF ${required.length}`,
      complete: configured === required.length,
      description: `Needs ${required.length === 1 ? 'a route' : 'routes'} to ${destinations}.`,
    })),
    nextAction: progress.exact ? undefined : nextDevice ? {
      type: 'open-cli', deviceId: nextDevice.deviceId, label: `OPEN CLI ON ${nextDevice.name}`,
      instruction: `Configure ${nextDevice.name}'s route${nextDevice.required.length > 1 ? 's' : ''} to ${nextDevice.destinations}. Determine the next hop from the adjacent link.`,
    } : {
      type: 'inspect', deviceId: 'r1', label: 'INSPECT ROUTER ROUTES',
      instruction: 'All required destinations are present, but an extra or conflicting static route still needs correction.',
    },
  };
  const verifiedForward = context.events.includes('verified-forward');
  const verifiedReverse = context.events.includes('verified-reverse');
  const verification = (id: string, title: string, source: string, sourceId: string, targetName: string, target: string, eventComplete: boolean): GuidedCliObjective => ({
    id,
    title,
    state: eventComplete ? 'complete' : progress.exact ? 'ready' : 'blocked',
    requirement: `Confirm that an IPv4 Echo request and reply can travel from ${source} to ${targetName}.`,
    evidence: `Open ${source}'s CLI and run PING ${target}. A successful round trip completes this objective.`,
    blockingReason: progress.exact ? undefined : 'Finish the required static routes before testing this direction.',
    nextAction: eventComplete || !progress.exact ? undefined : { type: 'open-cli', deviceId: sourceId, label: `VERIFY FROM ${source}`, instruction: `Run PING ${target} from ${source}.` },
  });
  return [
    routeObjective,
    verification('routing-forward', 'VERIFY PC1 TO PC3', 'PC1', 'pc-a', 'PC3', '192.168.30.10', verifiedForward),
    verification('routing-reverse', 'VERIFY PC3 TO PC1', 'PC3', 'pc-c', 'PC1', '192.168.10.10', verifiedReverse),
  ];
}

function vlanObjectives(context: GuidedCliObjectiveContext): GuidedCliObjective[] {
  const sw1 = context.network.devices.find(({ id }) => id === 'sw-a');
  const sw2 = context.network.devices.find(({ id }) => id === 'sw-b');
  const port = (device: typeof sw1, name: string) => device?.interfaces.find((item) => item.name === name);
  const vlanReady = [sw1, sw2].every((device) => device && [10, 20].every((vlan) => device.vlans.includes(vlan)));
  const accessReady = port(sw1, 'F0/1')?.switchportMode === 'access' && port(sw1, 'F0/1')?.accessVlan === 10
    && port(sw2, 'F0/2')?.switchportMode === 'access' && port(sw2, 'F0/2')?.accessVlan === 10
    && port(sw2, 'F0/3')?.switchportMode === 'access' && port(sw2, 'F0/3')?.accessVlan === 20;
  const trunkReady = [port(sw1, 'F0/24'), port(sw2, 'F0/24')].every((item) => item?.switchportMode === 'trunk' && sameSet(item.allowedVlans, [10, 20]));
  const samePrediction = context.vlanPredictions?.same === true;
  const differentPrediction = context.vlanPredictions?.different === true;
  return [
    {
      id: 'vlan-database', title: 'CREATE VLAN 10 AND VLAN 20', state: vlanReady ? 'complete' : 'not-started',
      requirement: 'Both switches must know VLAN 10 and VLAN 20 before ports can carry them.', evidence: 'Run SHOW VLAN BRIEF on SW1 and SW2.',
      nextAction: vlanReady ? undefined : { type: 'open-cli', deviceId: !sw1?.vlans.includes(10) || !sw1?.vlans.includes(20) ? 'sw-a' : 'sw-b', label: `OPEN CLI ON ${!sw1?.vlans.includes(10) || !sw1?.vlans.includes(20) ? 'SW1' : 'SW2'}`, instruction: 'Create VLAN 10 and VLAN 20 in global configuration mode.' },
    },
    {
      id: 'vlan-access', title: 'ASSIGN ACCESS PORTS', state: accessReady ? 'complete' : vlanReady ? 'ready' : 'blocked',
      requirement: 'PC1 and PC2 use VLAN 10. PC3 uses VLAN 20.', evidence: 'SHOW VLAN BRIEF must list F0/1, F0/2, and F0/3 under the required VLANs.',
      blockingReason: vlanReady ? undefined : 'Create both VLANs on both switches first.',
      nextAction: accessReady || !vlanReady ? undefined : { type: 'open-cli', deviceId: 'sw-a', label: 'CONFIGURE ACCESS PORTS', instruction: 'Start with SW1 F0/1, then configure SW2 F0/2 and F0/3.' },
    },
    {
      id: 'vlan-trunks', title: 'CONFIGURE BOTH TRUNK ENDS', state: trunkReady ? 'complete' : vlanReady ? 'in-progress' : 'blocked',
      requirement: 'SW1 F0/24 and SW2 F0/24 must both be trunks allowing VLAN 10 and VLAN 20.', evidence: 'Run SHOW INTERFACES TRUNK on both switches.',
      blockingReason: vlanReady ? undefined : 'Create VLAN 10 and VLAN 20 first.',
      nextAction: trunkReady || !vlanReady ? undefined : { type: 'open-cli', deviceId: 'sw-a', label: 'CONFIGURE SW1 TRUNK', instruction: 'Configure F0/24 as a trunk allowing VLAN 10 and VLAN 20, then repeat on SW2.' },
    },
    {
      id: 'vlan-predictions', title: 'INTERPRET BOTH PATHS', state: samePrediction && differentPrediction ? 'complete' : vlanReady && accessReady && trunkReady ? 'ready' : 'blocked',
      requirement: 'Predict same-VLAN reachability and explain why different VLANs remain separated.', evidence: 'Submit both evidence-based predictions after the port and trunk state is complete.',
      blockingReason: vlanReady && accessReady && trunkReady ? undefined : 'Finish VLAN, access-port, and trunk configuration first.',
    },
  ];
}

function interVlanObjectives(context: GuidedCliObjectiveContext): GuidedCliObjective[] {
  const sw = context.network.devices.find(({ id }) => id === 'sw-1');
  const router = context.network.devices.find(({ id }) => id === 'r1');
  const trunk = sw?.interfaces.find(({ name }) => name === 'F0/24');
  const parent = router?.interfaces.find(({ name }) => name === 'G0/0');
  const vlan10 = router?.interfaces.find(({ name }) => name === 'G0/0.10');
  const vlan20 = router?.interfaces.find(({ name }) => name === 'G0/0.20');
  const trunkReady = trunk?.switchportMode === 'trunk' && sameSet(trunk.allowedVlans, [10, 20]);
  const parentReady = Boolean(parent?.adminUp && parent.linkUp && !parent.ipv4);
  const subinterfacesReady = Boolean(vlan10?.encapsulationVlan === 10 && vlan10.ipv4 === '192.168.10.1' && vlan10.prefix === 24 && vlan20?.encapsulationVlan === 20 && vlan20.ipv4 === '192.168.20.1' && vlan20.prefix === 24);
  const configured = trunkReady && parentReady && subinterfacesReady;
  return [
    { id: 'inter-vlan-trunk', title: 'CARRY BOTH VLANS TO R1', state: trunkReady ? 'complete' : 'not-started', requirement: 'SW1 F0/24 must be a trunk allowing VLAN 10 and VLAN 20.', evidence: 'Run SHOW INTERFACES TRUNK on SW1.', nextAction: trunkReady ? undefined : { type: 'open-cli', deviceId: 'sw-1', label: 'OPEN CLI ON SW1', instruction: 'Configure F0/24 as a trunk allowing VLAN 10 and VLAN 20.' } },
    { id: 'inter-vlan-parent', title: 'ENABLE THE PHYSICAL ROUTER LINK', state: parentReady ? 'complete' : trunkReady ? 'ready' : 'blocked', requirement: 'R1 G0/0 must be administratively up and must not use a conflicting physical IPv4 address.', evidence: 'Run SHOW IP INTERFACE BRIEF on R1.', blockingReason: trunkReady ? undefined : 'Configure the switch trunk first.', nextAction: parentReady || !trunkReady ? undefined : { type: 'open-cli', deviceId: 'r1', label: 'OPEN CLI ON R1', instruction: 'Enable G0/0 with NO SHUTDOWN.' } },
    { id: 'inter-vlan-gateways', title: 'CREATE BOTH VLAN GATEWAYS', state: subinterfacesReady ? 'complete' : trunkReady && parentReady ? 'in-progress' : 'blocked', requirement: 'Create G0/0.10 for VLAN 10 and G0/0.20 for VLAN 20 with the supplied gateway addresses.', evidence: 'SHOW IP INTERFACE BRIEF and SHOW IP ROUTE must show both active connected networks.', blockingReason: !trunkReady ? 'Configure the switch trunk first.' : !parentReady ? 'Enable the physical parent interface first.' : undefined, nextAction: subinterfacesReady || !trunkReady || !parentReady ? undefined : { type: 'open-cli', deviceId: 'r1', label: 'CONFIGURE R1 SUBINTERFACES', instruction: 'Configure the VLAN tag and gateway address on G0/0.10 and G0/0.20.' } },
    { id: 'inter-vlan-forward', title: 'VERIFY PC1 TO PC2', state: context.events.includes('verified-inter-vlan-forward') ? 'complete' : configured ? 'ready' : 'blocked', requirement: 'Verify routing from VLAN 10 to VLAN 20.', evidence: 'Run PING 192.168.20.20 from PC1.', blockingReason: configured ? undefined : 'Finish the trunk, parent interface, and both subinterfaces first.', nextAction: configured && !context.events.includes('verified-inter-vlan-forward') ? { type: 'open-cli', deviceId: 'pc-a', label: 'VERIFY FROM PC1', instruction: 'Run PING 192.168.20.20.' } : undefined },
    { id: 'inter-vlan-reverse', title: 'VERIFY PC2 TO PC1', state: context.events.includes('verified-inter-vlan-reverse') ? 'complete' : configured ? 'ready' : 'blocked', requirement: 'Verify the return direction from VLAN 20 to VLAN 10.', evidence: 'Run PING 192.168.10.10 from PC2.', blockingReason: configured ? undefined : 'Finish the trunk, parent interface, and both subinterfaces first.', nextAction: configured && !context.events.includes('verified-inter-vlan-reverse') ? { type: 'open-cli', deviceId: 'pc-b', label: 'VERIFY FROM PC2', instruction: 'Run PING 192.168.10.10.' } : undefined },
  ];
}

function diagnosticObjectives(context: GuidedCliObjectiveContext): GuidedCliObjective[] {
  const complete = Boolean(context.diagnosticEvidenceReady);
  const current = (context.diagnosticScenarioIndex ?? 0) + 1;
  const count = context.diagnosticScenarioCount ?? 1;
  return [{
    id: 'diagnostic-evidence', title: `COLLECT SCENARIO ${current} EVIDENCE`, state: complete ? 'complete' : 'ready', progress: `${current} OF ${count}`,
    requirement: 'Run the suggested evidence commands before choosing a conclusion.',
    evidence: 'The required command output must be present in the transcript for this scenario.',
    nextAction: complete ? undefined : { type: 'open-cli', deviceId: 'r1', label: 'OPEN CLI ON R1', instruction: 'Run the suggested diagnostic command and read what its output proves.' },
  }, {
    id: 'diagnostic-conclusion', title: 'CHOOSE THE SUPPORTED CONCLUSION',
    state: context.diagnosticConclusionCorrect ? 'complete' : complete ? 'ready' : 'blocked',
    requirement: 'Choose only the conclusion that the displayed command output proves.',
    evidence: 'The explanation must match the observed interface, configuration, route, or ping evidence without inventing another cause.',
    blockingReason: complete ? undefined : 'Collect the required command evidence first.',
  }];
}

export function deriveCliLabObjectives(context: GuidedCliObjectiveContext): GuidedCliObjective[] {
  if (context.definition.kind === 'routing') return routingObjectives(context);
  if (context.definition.kind === 'vlan') return vlanObjectives(context);
  if (context.definition.kind === 'inter-vlan') return interVlanObjectives(context);
  return diagnosticObjectives(context);
}

export function deriveNextCliLabAction(objectives: GuidedCliObjective[]) {
  return objectives.find((objective) => objective.state !== 'complete' && objective.nextAction)?.nextAction;
}
