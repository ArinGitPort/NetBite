import { render } from '@testing-library/react-native';

import { NumberedStepRow, StatusRow } from '@/shared/components/status-row';

describe('StatusRow', () => {
  test.each([
    ['pending', 'PENDING'],
    ['complete', 'COMPLETE'],
    ['attention', 'NEEDS ATTENTION'],
    ['locked', 'LOCKED'],
    ['info', 'INFORMATION'],
  ] as const)('exposes the %s state without relying on color', async (state, spokenState) => {
    const screen = await render(<StatusRow label="ROUTES" state={state} value="1 OF 4" />);
    expect(screen.getByLabelText(`ROUTES, 1 OF 4. ${spokenState}`)).toBeTruthy();
    expect(screen.getByText(spokenState)).toBeTruthy();
  });

  test('supports wrapped descriptions and optional compact state labels', async () => {
    const screen = await render(<StatusRow description="PC1 needs a saved IPv4 address and prefix." label="SOURCE" showStateLabel={false} state="attention" />);
    expect(screen.getByLabelText('SOURCE. NEEDS ATTENTION. PC1 needs a saved IPv4 address and prefix.')).toBeTruthy();
    expect(screen.queryByText('NEEDS ATTENTION')).toBeNull();
  });

  test('renders static instructions as numbered steps rather than fake checkboxes', async () => {
    const screen = await render(<NumberedStepRow number={2}>Use the supplied values.</NumberedStepRow>);
    expect(screen.getByLabelText('Step 2. Use the supplied values.')).toBeTruthy();
    expect(screen.queryByText('[ ]')).toBeNull();
  });
});
