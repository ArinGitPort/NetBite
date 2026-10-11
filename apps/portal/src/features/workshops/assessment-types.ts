import type { AssessmentQuestion } from '@/lib/api/types';
export type { AssessmentQuestion } from '@/lib/api/types';

export type AssessmentDraft = {
  instructions?: string;
  questions?: AssessmentQuestion[];
};

export type AssessmentSettings = {
  maximumAttempts?: number;
  passingPercentage?: number;
  gradePolicy?: "highest" | "latest" | "first";
  feedbackRelease?: "immediate" | "final-attempt" | "due-date";
  opensAt?: string;
  dueAt?: string;
};
