import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { Typography } from '@/shared/theme';

describe('ConsoleText', () => {
  test('uses body typography by default', async () => {
    const screen = await render(<Text>Readable body</Text>);
    expect(StyleSheet.flatten(screen.getByText('Readable body').props.style)).toMatchObject(Typography.body);
  });

  test('applies a selected typography role', async () => {
    const screen = await render(<Text variant="technical">PORT 1</Text>);
    expect(StyleSheet.flatten(screen.getByText('PORT 1').props.style)).toMatchObject(Typography.technical);
  });
});
