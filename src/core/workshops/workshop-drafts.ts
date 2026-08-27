import type { WorkshopAttemptDraft } from '@/core/workshops/types';

export function getCompatibleWorkshopDraft(draft: WorkshopAttemptDraft | undefined, versionId: string, questionIds: string[]) {
  if (!draft) return { answers: {} as Record<string, string>, requestId: undefined };
  const allowed = new Set(questionIds);
  const answers = Object.fromEntries(Object.entries(draft.answers).filter(([questionId]) => allowed.has(questionId)));
  return { answers, requestId: draft.versionId === versionId ? draft.requestId : undefined };
}
