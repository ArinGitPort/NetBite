import { cliLabDefinitions, createInterVlanState, createRoutingState, createVlanState, requiredStaticRoutes } from '@/features/cli/cli-lab-definitions';
import { deriveCliLabObjectives, deriveNextCliLabAction } from '@/features/cli/guided-cli-objectives';

describe('guided CLI objectives', () => {
  test('reports per-router static-route requirements without revealing next-hop answers', () => {
    const objectives = deriveCliLabObjectives({
      definition: cliLabDefinitions['static-route-board'],
      network: createRoutingState(), events: [],
    });
    const routes = objectives[0];
    expect(routes.progress).toBe('0 OF 4');
    expect(routes.details?.map(({ label, value }) => [label, value])).toEqual([
      ['R1', '0 OF 1'], ['R2', '0 OF 2'], ['R3', '0 OF 1'],
    ]);
    expect(routes.details?.map(({ description }) => description).join(' ')).not.toContain('10.0.12.2');
    expect(deriveNextCliLabAction(objectives)).toMatchObject({ deviceId: 'r1', label: 'OPEN CLI ON R1' });
    expect(objectives[1].state).toBe('blocked');
  });

  test('makes both ping checks ready only after the exact route state is present', () => {
    const network = createRoutingState();
    for (const required of requiredStaticRoutes) {
      network.devices.find(({ id }) => id === required.deviceId)!.routes.push({
        prefix: required.prefix, prefixLength: required.prefixLength, nextHop: required.nextHop, source: 'static', exitInterface: '',
      });
    }
    const objectives = deriveCliLabObjectives({ definition: cliLabDefinitions['static-route-board'], network, events: [] });
    expect(objectives.map(({ state }) => state)).toEqual(['complete', 'ready', 'ready']);
    expect(deriveNextCliLabAction(objectives)).toMatchObject({ deviceId: 'pc-a', label: 'VERIFY FROM PC1' });
  });

  test('marks conflicting extra static routes as needing attention', () => {
    const network = createRoutingState();
    network.devices.find(({ id }) => id === 'r1')!.routes.push({ prefix: '203.0.113.0', prefixLength: 24, nextHop: '10.0.12.2', source: 'static', exitInterface: '' });
    const routes = deriveCliLabObjectives({ definition: cliLabDefinitions['static-route-board'], network, events: [] })[0];
    expect(routes.state).toBe('attention');
    expect(routes.blockingReason).toMatch(/extra or incorrect static route/i);
  });

  test('orders VLAN work from database through access ports, trunks, and evidence', () => {
    const objectives = deriveCliLabObjectives({ definition: cliLabDefinitions['vlan-port-desk'], network: createVlanState(), events: [], vlanPredictions: {} });
    expect(objectives.map(({ state }) => state)).toEqual(['not-started', 'blocked', 'blocked', 'blocked']);
    expect(deriveNextCliLabAction(objectives)).toMatchObject({ deviceId: 'sw-a', label: 'OPEN CLI ON SW1' });
  });

  test('orders inter-VLAN work from trunk through gateways and verification', () => {
    const objectives = deriveCliLabObjectives({ definition: cliLabDefinitions['inter-vlan-routing-desk'], network: createInterVlanState(), events: [] });
    expect(objectives.map(({ state }) => state)).toEqual(['not-started', 'complete', 'blocked', 'blocked', 'blocked']);
    expect(deriveNextCliLabAction(objectives)).toMatchObject({ deviceId: 'sw-1', label: 'OPEN CLI ON SW1' });
  });

  test('turns diagnostic evidence into a completed objective', () => {
    const definition = cliLabDefinitions['ping-diagnostic-desk'];
    const network = definition.diagnosticScenarios![0].createState();
    expect(deriveCliLabObjectives({ definition, network, events: [], diagnosticEvidenceReady: false })[0].state).toBe('ready');
    expect(deriveCliLabObjectives({ definition, network, events: [], diagnosticEvidenceReady: true })[0].state).toBe('complete');
  });
});
