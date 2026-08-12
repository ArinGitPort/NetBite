import type { Href } from 'expo-router';

// Static casts keep TypeScript usable before Expo regenerates its ignored typed-route cache.
export const AppRoutes = {
  menu: '/' as Href,
  learningPath: '/learn' as Href,
  courses: '/courses' as Href,
  readiness: '/readiness' as Href,
  certificate: '/certificate/network-foundations' as Href,
  settings: '/settings' as Href,
  sandbox: '/sandbox' as Href,
  account: '/account' as Href,
  auth: '/auth' as Href,
  authWelcome: '/auth/welcome' as Href,
  authRegister: '/auth/register' as Href,
  authForgotPassword: '/auth/forgot-password' as Href,
  pro: '/pro' as Href,
  progress: '/progress' as Href,
  review: '/review' as Href,
  saved: '/saved' as Href,
  diagnostics: '/diagnostics' as Href,
  standards: '/standards' as Href,
  research: '/research' as Href,
};

export const chapterRoute = (chapterId: string) => ({ pathname: '/chapter/[chapterId]', params: { chapterId } }) as Href;
export const lessonRoute = (lessonId: string, options?: { fromLabId?: string }) => ({
  pathname: '/lesson/[lessonId]',
  params: options?.fromLabId ? { lessonId, fromLabId: options.fromLabId } : { lessonId },
}) as Href;
export const labRoute = (labId: string) => ({ pathname: '/lab/[labId]', params: { labId } }) as Href;
export const quizRoute = (chapterId: string) => ({ pathname: '/quiz/[chapterId]', params: { chapterId } }) as Href;
export const flashcardsRoute = (chapterId: string) => ({ pathname: '/flashcards/[chapterId]', params: { chapterId } }) as Href;
