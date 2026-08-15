import { fireEvent, render } from '@testing-library/react-native';

import { FormField } from '@/shared/components/form-field';
import { InlineFeedback } from '@/shared/components/inline-feedback';
import { SegmentedControl } from '@/shared/components/segmented-control';
import { SelectionControl } from '@/shared/components/selection-control';

describe('shared interaction controls', () => {
  test('selection controls expose semantic selected state without bracket markers', async () => {
    const onPress = jest.fn();
    const screen = await render(<SelectionControl label="SYSTEM" onPress={onPress} selected />);
    const control = screen.getByRole('radio', { name: 'SYSTEM' });
    expect(control.props.accessibilityState).toMatchObject({ selected: true, checked: true });
    expect(screen.queryByText('[X]')).toBeNull();
    await fireEvent.press(control);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('segmented controls provide one selected option and wrap labels', async () => {
    const onChange = jest.fn();
    const screen = await render(<SegmentedControl label="Motion" options={[{ id: 'system', label: 'SYSTEM' }, { id: 'reduced', label: 'REDUCED' }]} value="system" onChange={onChange} />);
    expect(screen.getByLabelText('Motion')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'REDUCED' }));
    expect(onChange).toHaveBeenCalledWith('reduced');
  });

  test('form fields keep instructions and validation adjacent to the input', async () => {
    const screen = await render(<FormField error="Enter a valid prefix." help="Accepted format: 24 or /24." label="PREFIX" onChangeText={jest.fn()} value="/99" />);
    expect(screen.getByLabelText('PREFIX')).toBeTruthy();
    expect(screen.getByText('Accepted format: 24 or /24.')).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid prefix.');
  });

  test('inline feedback is compact and announces its meaning in text', async () => {
    const screen = await render(<InlineFeedback feedbackTone="success" live title="Configuration saved locally." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Configuration saved locally.');
  });
});
