import { fireEvent, render } from '@testing-library/react-native';

import { HintHistoryPanel } from '@/shared/components/hint-history-panel';

describe('HintHistoryPanel', () => {
  test('collapses without deleting revealed hints', async () => {
    const screen = await render(<HintHistoryPanel hints={['Check the route.', 'Verify the return path.']} total={3} />);
    expect(screen.getByText('Check the route.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '2 of 3 hints revealed' }));
    expect(screen.queryByText('Check the route.')).toBeNull();
    expect(screen.getByText('SHOW')).toBeTruthy();
  });

  test('automatically reopens when a new hint is revealed', async () => {
    const screen = await render(<HintHistoryPanel hints={['First hint']} total={2} />);
    await fireEvent.press(screen.getByRole('button', { name: '1 of 2 hints revealed' }));
    await screen.rerender(<HintHistoryPanel hints={['First hint', 'Second hint']} total={2} />);
    expect(screen.getByText('Second hint')).toBeTruthy();
    expect(screen.getByText('HIDE HINTS')).toBeTruthy();
  });
});
