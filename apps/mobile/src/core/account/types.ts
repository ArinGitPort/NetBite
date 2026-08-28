import type { ActivityEvent, ReviewSignal, SavedLearningItem } from '@/core/learning/adaptive-learning';
import type { CourseAchievement } from '@/content/types';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'action-needed';
export type ProgressMergeChoice = 'merge' | 'cloud' | 'cancel';
export type PurchaseStatus = 'idle' | 'preparing' | 'presenting' | 'verifying' | 'owned' | 'failed';

export interface CloudProgressSnapshot {
  schemaVersion: number;
  completedLessonIds: string[];
  completedLabIds: string[];
  quizScores: Record<string, number>;
  quizContentVersions: Record<string, number>;
  reviewedFlashcardChapterIds: string[];
  flashcardContentVersions: Record<string, number>;
  flashcardPositions: Record<string, number>;
  cliGuideSeen: boolean;
  hapticsEnabled: boolean;
  motionPreference: 'system' | 'reduced';
  reviewSignals: Record<string, ReviewSignal>;
  savedLearningItems: Record<string, SavedLearningItem>;
  activityHistory: ActivityEvent[];
  readinessScores: Record<string, number>;
  completedCapstoneIds: string[];
  courseAchievements: Record<string, CourseAchievement>;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface Entitlement {
  productId: 'netbite_pro';
  status: 'active' | 'revoked';
  source: 'stripe_test' | 'manual_test';
  grantedAt: string;
}

export interface ProPayment {
  clientSecret: string;
  paymentIntentId: string;
  amount: 14900;
  currency: 'php';
  productId: 'netbite_pro';
}
