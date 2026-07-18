import { render } from '@testing-library/react-native';

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
});
