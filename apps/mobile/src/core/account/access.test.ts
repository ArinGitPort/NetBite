import { canAccessChapter, canAccessFeature, isPremiumChapter } from '@/core/account/access';

describe('account access rules', () => {
  test('keeps Chapters 1 through 4 available to guests', () => {
    for (let chapterId = 1; chapterId <= 4; chapterId += 1) {
      expect(canAccessChapter(chapterId, false)).toBe(true);
      expect(isPremiumChapter(chapterId)).toBe(false);
    }
  });

  test('requires Pro for Chapters 5 through 12 and the sandbox', () => {
    for (let chapterId = 5; chapterId <= 12; chapterId += 1) {
      expect(canAccessChapter(chapterId, false)).toBe(false);
      expect(canAccessChapter(chapterId, true)).toBe(true);
    }
    expect(canAccessFeature('learning', false)).toBe(true);
    expect(canAccessFeature('sandbox', false)).toBe(false);
    expect(canAccessFeature('sandbox', true)).toBe(true);
  });

  test('does not accidentally treat invalid chapter IDs as premium content', () => {
    expect(isPremiumChapter('unknown')).toBe(false);
  });
});
