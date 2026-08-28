import { getChapter } from '@/content/chapters';

export const FREE_CHAPTER_MAX = 4;

export function isPremiumChapter(chapterId: string | number) {
  const chapter = getChapter(String(chapterId));
  if (chapter?.accessTier) return chapter.accessTier === 'pro';
  const legacyNumber = Number(chapterId);
  return Number.isFinite(legacyNumber) && legacyNumber > FREE_CHAPTER_MAX;
}

export function canAccessChapter(chapterId: string | number, hasPro: boolean) {
  return !isPremiumChapter(chapterId) || hasPro;
}

export function canAccessFeature(feature: 'learning' | 'sandbox', hasPro: boolean) {
  return feature === 'learning' || hasPro;
}
