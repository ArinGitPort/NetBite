import { deriveCliConsoleNetworkReference, deriveCliConsoleTaskContext, shouldPreserveCliDraft } from '@/features/cli/cli-console-context';
import { cliLabDefinitions, createRoutingState } from '@/features/cli/cli-lab-definitions';
import { deriveCliLabObjectives } from '@/features/cli/guided-cli-objectives';

describe('CLI console task context', () => {
  test('derives the selected router destination and mask without exposing its next hop', () => {
    const definition = cliLabDefinitions['static-route-board'];
    const network = createRoutingState();
    const objectives = deriveCliLabObjectives({ definition, network, events: [] });
    const context = deriveCliConsoleTaskContext({ definition, network, objectives, activeDeviceId: 'r1' });

    expect(context).toMatchObject({ title: 'CONFIGURE REMOTE ROUTES / R1', progress: '0 OF 4', commandFormat: 'ip route <network> <mask> <next-hop>' });
    expect(context?.facts).toEqual(expect.arrayContaining([
      { label: 'DESTINATION', value: '192.168.30.0/24' },
      { label: 'SUBNET MASK', value: '255.255.255.0' },
      { label: 'ROUTE STATE', value: 'REQUIRED' },
    ]));
    expect(JSON.stringify(context)).not.toContain('10.0.12.2');
  });

  test('derives complete readable link references from live topology state', () => {
    const references = deriveCliConsoleNetworkReference(createRoutingState());
    expect(references).toHaveLength(4);
    expect(references.map(({ context }) => context)).toEqual([
      '192.168.10.0/24', '10.0.12.0/30', '10.0.23.0/30', '192.168.30.0/24',
    ]);
    expect(references[1]).toMatchObject({ a: { deviceName: 'R1', interfaceName: 'G0/1' }, b: { deviceName: 'R2', interfaceName: 'G0/0' }, state: 'UP' });
  });

  test('preserves only a draft reopened on the same device', () => {
    expect(shouldPreserveCliDraft('r1', 'r1')).toBe(true);
    expect(shouldPreserveCliDraft('r1', 'r2')).toBe(false);
  });
});
