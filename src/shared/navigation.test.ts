import { router } from 'expo-router';

import { chapters } from '@/content/chapters';
import { goBackOrReplace, navigateOnce, resolveActivityDestination } from '@/shared/navigation';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(),
    dismissTo: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

const mockedRouter = router as jest.Mocked<typeof router>;

describe('goBackOrReplace', () => {
  beforeEach(() => jest.clearAllMocks());

  test('goes back when a native history entry exists', () => {
    mockedRouter.canGoBack.mockReturnValue(true);

    goBackOrReplace('/auth/welcome');

    expect(mockedRouter.back).toHaveBeenCalledTimes(1);
    expect(mockedRouter.replace).not.toHaveBeenCalled();
  });

  test('uses the fallback when the screen was opened directly', () => {
    mockedRouter.canGoBack.mockReturnValue(false);

    goBackOrReplace('/auth/welcome');

    expect(mockedRouter.back).not.toHaveBeenCalled();
    expect(mockedRouter.replace).toHaveBeenCalledWith('/auth/welcome');
  });
});

describe('navigateOnce', () => {
  test('blocks a duplicate destination in the same tap burst', () => {
    jest.spyOn(Date, 'now').mockReturnValue(10_000);
    expect(navigateOnce('/learn')).toBe(true);
    expect(navigateOnce('/learn')).toBe(false);
    expect(mockedRouter.push).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });
});

describe('activity ownership', () => {
  test('resolves every registered activity to its actual chapter', () => {
    for (const chapter of chapters) {
      for (const lesson of chapter.lessons) expect(resolveActivityDestination('lesson', lesson.id)?.chapterId).toBe(chapter.id);
      expect(resolveActivityDestination('lab', chapter.lab.id)?.chapterId).toBe(chapter.id);
      expect(resolveActivityDestination('quiz', chapter.id)?.chapterId).toBe(chapter.id);
      expect(resolveActivityDestination('flashcards', chapter.id)?.chapterId).toBe(chapter.id);
    }
  });

  test('rejects stale or malformed activity identifiers', () => {
    expect(resolveActivityDestination('lesson', 'missing')).toBeUndefined();
    expect(resolveActivityDestination('lab', '')).toBeUndefined();
  });
});
