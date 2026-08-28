import { fireEvent, render } from '@testing-library/react-native';

import { GuidedCliObjectivePanel } from '@/features/cli/components/guided-cli-objective-panel';

describe('GuidedCliObjectivePanel', () => {
  test('explains the requirement, proof, per-device progress, and next action', async () => {
    const onAction = jest.fn();
    const action = { type: 'open-cli' as const, deviceId: 'r1', label: 'OPEN CLI ON R1', instruction: 'Configure R1 next.' };
    const screen = await render(<GuidedCliObjectivePanel
      nextAction={action}
      objectives={[{
        id: 'routes', title: 'CONFIGURE REMOTE ROUTES', state: 'in-progress', progress: '1 OF 4',
        requirement: 'Each router needs routes to remote LANs.', evidence: 'Use SHOW IP ROUTE.',
        details: [{ id: 'r1', label: 'R1', value: '1 OF 1', complete: true, description: 'Needs a route to 192.168.30.0/24.' }],
        nextAction: action,
      }]}
      onAction={onAction}
    />);
    expect(screen.getByText('WHAT TO DO / ')).toBeTruthy();
    expect(screen.getByText('PROOF / ')).toBeTruthy();
    expect(screen.getByText('R1')).toBeTruthy();
    fireEvent.press(screen.getByText('OPEN CLI ON R1'));
    expect(onAction).toHaveBeenCalledWith(action);
  });
});
