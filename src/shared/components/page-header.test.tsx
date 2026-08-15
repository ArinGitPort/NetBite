import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { getPageHeaderGutter, PageHeader } from '@/shared/components/page-header';
import { Space } from '@/shared/theme';

describe('PageHeader', () => {
  test.each([320, 360, 390, 430])('uses the mobile safe-area gutter at %ipx', (width) => {
    expect(getPageHeaderGutter(width)).toBe(Space.lg);
  });

  test.each([500, 768, 1024])('uses the comfortable safe-area gutter at %ipx', (width) => {
    expect(getPageHeaderGutter(width)).toBe(Space.xl);
  });

  test('keeps the leading navigation action first in reading order', async () => {
    const onBack = jest.fn();
    const onHelp = jest.fn();
    const screen = await render(
      <PageHeader
        leading={{ accessibilityLabel: 'Back to chapter', icon: 'arrow-left', label: 'BACK / CHAPTER', onPress: onBack }}
        status="LOCAL AUTOSAVE"
        trailing={[{ accessibilityLabel: 'Open help', icon: 'check', label: 'HELP', onPress: onHelp }]}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0].props.accessibilityLabel).toBe('Back to chapter');
    expect(screen.getByText('LOCAL AUTOSAVE')).toBeTruthy();
    fireEvent.press(buttons[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('uses a full-width header and accessible touch target', async () => {
    const screen = await render(<PageHeader leading={{ accessibilityLabel: 'Close', icon: 'close', label: 'CLOSE', onPress: jest.fn() }} />);
    const style = StyleSheet.flatten(screen.getByTestId('page-header').props.style);
    const leadingStyle = StyleSheet.flatten(screen.getByTestId('page-header-leading').props.style);
    const buttonStyle = StyleSheet.flatten(screen.getByRole('button', { name: 'Close' }).props.style);

    expect(style.width).toBe('100%');
    expect(style.justifyContent).toBe('space-between');
    expect(style.alignItems).toBe('center');
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(leadingStyle.position).not.toBe('absolute');
    expect(leadingStyle.alignItems).toBe('flex-start');
    expect(buttonStyle.alignSelf).toBe('flex-start');
    expect(buttonStyle.minHeight).toBeGreaterThanOrEqual(44);
  });

  test('does not invoke a disabled action', async () => {
    const onBack = jest.fn();
    const screen = await render(<PageHeader leading={{ accessibilityLabel: 'Back', disabled: true, icon: 'arrow-left', onPress: onBack }} />);
    const button = screen.getByRole('button', { name: 'Back' });
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(onBack).not.toHaveBeenCalled();
  });
});
