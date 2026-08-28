import { fireEvent, render } from '@testing-library/react-native';

import { Text } from '@/shared/components/console-text';
import { DisclosureSection } from '@/shared/components/disclosure-section';

describe('DisclosureSection', () => {
  test('keeps advanced content hidden until requested', async () => {
    const screen = await render(<DisclosureSection summary="Advanced options" title="MORE CONTROLS"><Text>Hidden action</Text></DisclosureSection>);
    expect(screen.queryByText('Hidden action')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /more controls/i }));
    expect(screen.getByText('Hidden action')).toBeTruthy();
  });
});
