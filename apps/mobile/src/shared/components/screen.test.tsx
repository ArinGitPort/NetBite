import { render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Screen } from '@/shared/components/screen';
import { ScreenActionBar } from '@/shared/components/screen-action-bar';
import { Text } from '@/shared/components/console-text';
import { DarkPalette, LightPalette } from '@/shared/theme';
import { FixedThemeProvider } from '@/shared/theme-context';

describe('Screen footer', () => {
  test('keeps the action footer outside the scrolling region', async () => {
    const screen = await render(
      <Screen footer={<ScreenActionBar label="NEXT STEP"><Text>RUN TEST</Text></ScreenActionBar>} scrollTestID="page-scroll">
        <Text>LONG PAGE CONTENT</Text>
      </Screen>,
    );

    expect(within(screen.getByTestId('page-scroll')).getByText('LONG PAGE CONTENT')).toBeTruthy();
    expect(within(screen.getByTestId('page-scroll')).queryByText('RUN TEST')).toBeNull();
    expect(within(screen.getByTestId('screen-footer')).getByText('RUN TEST')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('screen-footer').props.style).backgroundColor).toBe(DarkPalette.surfaceRaised);
  });

  test('uses the active light theme and exposes action errors as alerts', async () => {
    const screen = await render(
      <FixedThemeProvider theme="light">
        <Screen footer={<ScreenActionBar feedback="Enter a valid port." label="SAVE CONFIGURATION" tone="error"><Text>SAVE</Text></ScreenActionBar>}>
          <Text>FORM</Text>
        </Screen>
      </FixedThemeProvider>,
    );

    expect(StyleSheet.flatten(screen.getByTestId('screen-footer').props.style).backgroundColor).toBe(LightPalette.surfaceRaised);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid port.');
  });
});
