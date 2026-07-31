import { router, type Href } from 'expo-router';
import { Platform } from 'react-native';

import { chapters } from '@/content/chapters';
import { AppRoutes, chapterRoute } from '@/shared/routes';

export type ActivityRouteKind = 'lesson' | 'lab' | 'quiz' | 'flashcards';

export interface ActivityDestination {
  chapterId: string;
  chapterHref: Href;
}

const recentDestinations = new Map<string, number>();

/** Ignore only repeated navigation to the same destination during one tap burst. */
export function navigateOnce(destination: Href, windowMs = 500) {
  const key = typeof destination === 'string' ? destination : JSON.stringify(destination);
  const now = Date.now();
  if (now - (recentDestinations.get(key) ?? 0) < windowMs) return false;
  recentDestinations.set(key, now);
  router.push(destination);
  return true;
}

export function resolveActivityDestination(kind: ActivityRouteKind, activityId: string): ActivityDestination | undefined {
  const chapter = kind === 'lesson'
    ? chapters.find((item) => item.lessons.some((lesson) => lesson.id === activityId))
    : kind === 'lab'
      ? chapters.find((item) => item.lab.id === activityId)
      : chapters.find((item) => item.id === activityId);
  return chapter ? { chapterId: chapter.id, chapterHref: chapterRoute(chapter.id) } : undefined;
}

/** Navigate back when a native stack entry exists, otherwise open a known-safe route. */
export function goBackOrReplace(fallback: Href) {
  if (Platform.OS !== 'web' && router.canGoBack()) {
    router.back();
    return;
  }

  // On web, dismissTo replaces the current route when the target is not in the stack.
  if (Platform.OS === 'web') {
    router.dismissTo(fallback);
    return;
  }

  router.replace(fallback);
}

export function returnToMenu() {
  router.dismissTo(AppRoutes.menu);
}

export function returnToLearningPath() {
  router.dismissTo(AppRoutes.learningPath);
}

export function returnToOwningChapter(kind: ActivityRouteKind, activityId: string) {
  router.dismissTo(resolveActivityDestination(kind, activityId)?.chapterHref ?? AppRoutes.learningPath);
}
