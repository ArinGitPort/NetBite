import { router } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Pressable, Text } from 'react-native';

import { goBackOrReplace } from '@/shared/navigation';

function Menu() {
  return <Pressable accessibilityRole="button" onPress={() => router.push('/chapter/2')}><Text>OPEN CHAPTER</Text></Pressable>;
}

function Chapter() {
  return <Pressable accessibilityRole="button" onPress={() => goBackOrReplace('/')}><Text>SAFE BACK</Text></Pressable>;
}

describe('navigation route-stack integration', () => {
  test('returns through real stack history', async () => {
    const route = renderRouter({ index: Menu, 'chapter/[chapterId]': Chapter }, { initialUrl: '/' });
    await route;
    await fireEvent.press(screen.getByText('OPEN CHAPTER'));
    expect(route.getPathname()).toBe('/chapter/2');
    await fireEvent.press(screen.getByText('SAFE BACK'));
    expect(route.getPathname()).toBe('/');
  });

  test('uses a deterministic fallback after direct entry', async () => {
    const route = renderRouter({ index: Menu, 'chapter/[chapterId]': Chapter }, { initialUrl: '/chapter/2' });
    await route;
    await fireEvent.press(screen.getByText('SAFE BACK'));
    expect(route.getPathname()).toBe('/');
  });
});
