import { deriveCliLinkContext, prefixToSubnetMask, type CliNetworkState } from '@/core/network/cli-simulator';
import { requiredStaticRoutes, type CliLabDefinition } from '@/features/cli/cli-lab-definitions';
import type { GuidedCliObjective } from '@/features/cli/guided-cli-objectives';
import type { CliConsoleNetworkReference, CliConsoleTaskContext, CliConsoleTaskFact } from '@/shared/components/cli-console-shell';

function deviceName(network: CliNetworkState, deviceId: string) {
  return network.devices.find(({ id }) => id === deviceId)?.name ?? deviceId.toUpperCase();
}

export function deriveCliConsoleNetworkReference(network: CliNetworkState): CliConsoleNetworkReference[] {
  return network.links.map((link) => {
    const context = deriveCliLinkContext(network, link);
    return {
      a: { deviceName: deviceName(network, link.aDeviceId), interfaceName: link.aInterface },
      b: { deviceName: deviceName(network, link.bDeviceId), interfaceName: link.bInterface },
      context: context.kind === 'operational' ? context.networkLabel ?? context.label : context.label,
      state: context.kind === 'operational' ? context.label : context.tone === 'warning' ? 'ATTENTION' : 'UP',
    };
  });
}

function selectObjective(definition: CliLabDefinition, objectives: GuidedCliObjective[], activeDeviceId: string) {
  const unfinished = objectives.filter(({ state }) => state !== 'complete');
  if (definition.kind === 'routing') {
    if (activeDeviceId === 'pc-a') return objectives.find(({ id }) => id === 'routing-forward') ?? unfinished[0];
    if (activeDeviceId === 'pc-c') return objectives.find(({ id }) => id === 'routing-reverse') ?? unfinished[0];
    return objectives.find(({ id }) => id === 'routing-routes') ?? unfinished[0];
  }
  if (definition.kind === 'inter-vlan') {
    if (activeDeviceId === 'sw-1') return objectives.find(({ id, state }) => id === 'inter-vlan-trunk' && state !== 'complete') ?? objectives.find(({ id }) => id === 'inter-vlan-trunk');
    if (activeDeviceId === 'pc-a') return objectives.find(({ id }) => id === 'inter-vlan-forward');
    if (activeDeviceId === 'pc-b') return objectives.find(({ id }) => id === 'inter-vlan-reverse');
    return objectives.find(({ id, state }) => (id === 'inter-vlan-parent' || id === 'inter-vlan-gateways') && state !== 'complete') ?? objectives.find(({ id }) => id === 'inter-vlan-gateways');
  }
  return unfinished.find(({ nextAction }) => nextAction?.deviceId === activeDeviceId) ?? unfinished[0] ?? objectives.at(-1);
}

function routingFacts(network: CliNetworkState, activeDeviceId: string): CliConsoleTaskFact[] {
  return requiredStaticRoutes.filter(({ deviceId }) => deviceId === activeDeviceId).flatMap((route, index) => {
    const configured = network.devices.find(({ id }) => id === activeDeviceId)?.routes.some((item) => item.source === 'static' && item.prefix === route.prefix && item.prefixLength === route.prefixLength && item.nextHop === route.nextHop);
    const suffix = requiredStaticRoutes.filter(({ deviceId }) => deviceId === activeDeviceId).length > 1 ? ` ${index + 1}` : '';
    return [
      { label: `DESTINATION${suffix}`, value: `${route.prefix}/${route.prefixLength}` },
      { label: `SUBNET MASK${suffix}`, value: prefixToSubnetMask(route.prefixLength) ?? 'INVALID PREFIX' },
      { label: `ROUTE STATE${suffix}`, value: configured ? 'CONFIGURED' : 'REQUIRED' },
    ];
  });
}

export function deriveCliConsoleTaskContext({ definition, network, objectives, activeDeviceId, suggestedCommand }: {
  definition: CliLabDefinition;
  network: CliNetworkState;
  objectives: GuidedCliObjective[];
  activeDeviceId: string;
  suggestedCommand?: string;
}): CliConsoleTaskContext | undefined {
  const objective = selectObjective(definition, objectives, activeDeviceId);
  if (!objective) return undefined;
  const activeName = deviceName(network, activeDeviceId);
  const routeFacts = definition.kind === 'routing' ? routingFacts(network, activeDeviceId) : [];
  const facts: CliConsoleTaskFact[] = routeFacts.length
    ? routeFacts
    : [
      ...(objective.progress ? [{ label: 'LAB PROGRESS', value: objective.progress }] : []),
      ...(objective.details?.filter(({ id }) => id.endsWith(activeDeviceId)).map(({ label, value, complete }) => ({ label, value: `${value ?? ''}${value ? ' / ' : ''}${complete ? 'COMPLETE' : 'REQUIRED'}` })) ?? []),
    ];
  const commandFormat = definition.kind === 'routing' && routeFacts.length
    ? 'ip route <network> <mask> <next-hop>'
    : suggestedCommand;
  return {
    title: `${objective.title} / ${activeName}`,
    state: objective.state,
    progress: objective.progress,
    requirement: objective.requirement,
    facts,
    commandFormat,
    evidence: objective.evidence,
    nextAction: objective.blockingReason ?? objective.nextAction?.instruction,
    networkReference: deriveCliConsoleNetworkReference(network),
  };
}

export function shouldPreserveCliDraft(currentDeviceId: string, nextDeviceId: string) {
  return currentDeviceId === nextDeviceId;
}
