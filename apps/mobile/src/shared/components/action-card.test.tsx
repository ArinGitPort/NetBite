import { render } from '@testing-library/react-native';

import { ActionCard } from '@/shared/components/action-card';

describe('ActionCard', () => {
  test('exposes progress and a recognizable primary action', async () => {
    const screen = await render(<ActionCard icon="learn" priority="primary" progress={0.5} status="CHAPTER 02" title="Continue learning" tone="learning" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: /continue learning, chapter 02/i })).toBeTruthy();
    expect(screen.getByLabelText('Progress').props.accessibilityValue.now).toBe(50);
  });

  test('communicates loading and disabled states without color alone', async () => {
    const screen = await render(<ActionCard disabled disabledReason="Requires NetBite Pro" icon="sandbox" loading status="PRO / LOCKED" title="Network sandbox" onPress={jest.fn()} />);
    const button = screen.getByRole('button', { name: /network sandbox.*requires netbite pro/i });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    expect(screen.getByText('Requires NetBite Pro')).toBeTruthy();
  });

  test('announces selected and completed states', async () => {
    const screen = await render(<ActionCard completed icon="lesson" selected status="LESSON" title="Network basics" onPress={jest.fn()} />);
    const button = screen.getByRole('button', { name: /network basics.*selected.*complete/i });
    expect(button.props.accessibilityState.selected).toBe(true);
  });
});
