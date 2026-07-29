import { fireEvent, render } from '@testing-library/react-native';

import { LessonWorkedExample } from '@/features/lessons/components/lesson-worked-example';

describe('LessonWorkedExample', () => {
  test('renders ordered steps, values, and accessible descriptions', async () => {
    const screen = await render(<LessonWorkedExample example={{
      label: 'FIND A /26 RANGE',
      setup: 'Locate host 192.168.10.70/26.',
      steps: [
        { id: 'block', label: 'FIND BLOCK SIZE', explanation: 'Six host bits produce 64 addresses.', value: '64' },
        { id: 'locate', label: 'LOCATE THE HOST', explanation: 'The host lies after start 192.168.10.64.' },
        { id: 'end', label: 'FIND THE END', explanation: 'The next start is 192.168.10.128.', value: 'BROADCAST 192.168.10.127' },
      ],
      result: 'The complete range is now visible.',
    }} />);

    expect(screen.getByLabelText(/Step 1: FIND BLOCK SIZE/i)).toBeTruthy();
    expect(screen.getByLabelText(/Step 2: LOCATE THE HOST/i)).toBeTruthy();
    expect(screen.getByLabelText(/Step 3: FIND THE END/i)).toBeTruthy();
    expect(screen.getByText('BROADCAST 192.168.10.127')).toBeTruthy();
  });

  test('reveals guided steps one at a time and can show the complete method', async () => {
    const screen = await render(<LessonWorkedExample example={{
      label: 'GUIDED /26',
      setup: 'Follow one complete subnet method.',
      presentation: 'guided',
      visual: { illustration: 'block-size', stageIds: ['size', 'start', 'add'] },
      steps: [
        { id: 'size', label: 'FIND SIZE', explanation: 'A slash 26 contains 64 addresses.' },
        { id: 'start', label: 'START AT ZERO', explanation: 'The containing slash 24 begins at zero.' },
        { id: 'add', label: 'ADD 64', explanation: 'Repeated addition gives each network start.' },
      ],
      result: 'The starts are derived instead of guessed.',
    }} />);

    expect(screen.getByText('FIND SIZE')).toBeTruthy();
    expect(screen.queryByText('START AT ZERO')).toBeNull();
    expect(screen.queryByText('The starts are derived instead of guessed.')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Next step'));
    expect(screen.getByText('START AT ZERO')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Show all steps'));
    expect(screen.getByText('FIND SIZE')).toBeTruthy();
    expect(screen.getByLabelText(/Step 3: ADD 64/i)).toBeTruthy();
    expect(screen.getByText('The starts are derived instead of guessed.')).toBeTruthy();
  });
});
