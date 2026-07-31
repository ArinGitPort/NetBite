export const FREE_CHAPTER_MAX = 4;

export function isPremiumChapter(chapterId: string | number) {
  const number = Number(chapterId);
  return Number.isFinite(number) && number > FREE_CHAPTER_MAX;
}

export function canAccessChapter(chapterId: string | number, hasPro: boolean) {
  return !isPremiumChapter(chapterId) || hasPro;
}

export function canAccessFeature(feature: 'learning' | 'sandbox', hasPro: boolean) {
  return feature === 'learning' || hasPro;
}
