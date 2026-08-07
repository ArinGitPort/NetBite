import { router, useLocalSearchParams } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Pressable, Text } from 'react-native';

import { goBackOrReplace, resolveLessonLabOrigin, returnToOriginatingLab } from '@/shared/navigation';
import { lessonRoute } from '@/shared/routes';

function Menu() {
  return <Pressable accessibilityRole="button" onPress={() => router.push('/chapter/2')}><Text>OPEN CHAPTER</Text></Pressable>;
}

function Chapter() {
  return <Pressable accessibilityRole="button" onPress={() => goBackOrReplace('/')}><Text>SAFE BACK</Text></Pressable>;
}

function Lab() {
  return <Pressable accessibilityRole="button" onPress={() => router.push(lessonRoute('what-is-a-network', { fromLabId: 'first-network' }))}><Text>REVIEW LESSON</Text></Pressable>;
}

function Lesson() {
  const { lessonId, fromLabId } = useLocalSearchParams<{ lessonId: string; fromLabId?: string }>();
  const origin = resolveLessonLabOrigin(fromLabId);
  return <>
    <Text>{`${lessonId} / ${origin ?? 'NO LAB'}`}</Text>
    <Pressable accessibilityRole="button" onPress={() => router.replace(lessonRoute('why-networks-exist', { fromLabId: origin }))}><Text>NEXT LESSON</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => origin && returnToOriginatingLab(origin)}><Text>BACK TO LAB</Text></Pressable>
  </>;
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

  test('preserves the lab origin through lesson replacement and returns to the mounted lab', async () => {
    const route = renderRouter({ 'lab/[labId]': Lab, 'lesson/[lessonId]': Lesson }, { initialUrl: '/lab/first-network' });
    await route;
    await fireEvent.press(screen.getByText('REVIEW LESSON'));
    expect(screen.getByText('what-is-a-network / first-network')).toBeTruthy();
    await fireEvent.press(screen.getByText('NEXT LESSON'));
    expect(screen.getByText('why-networks-exist / first-network')).toBeTruthy();
    await fireEvent.press(screen.getByText('BACK TO LAB'));
    expect(route.getPathname()).toBe('/lab/first-network');
  });

  test('reopens the originating lab after direct lesson entry without history', async () => {
    const route = renderRouter({ 'lab/[labId]': Lab, 'lesson/[lessonId]': Lesson }, { initialUrl: '/lesson/what-is-a-network?fromLabId=first-network' });
    await route;
    await fireEvent.press(screen.getByText('BACK TO LAB'));
    expect(route.getPathname()).toBe('/lab/first-network');
  });
});
