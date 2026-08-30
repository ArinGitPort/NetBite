export interface AssessmentQuestion {
  id: string;
  prompt: string;
  choices: Array<{ id: string; label: string }>;
  correctChoiceId: string;
  explanation?: string;
}

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
