import type { WorkshopAssessmentRow, WorkshopLessonRow } from "@/lib/api/types";
import type { AssessmentQuestion } from "@/features/workshops/assessment-types";

// Duplicate saved draft data only. Every identity that can be referenced by an
// editor or a submitted answer must be independent of the source snapshot.
export function duplicateLessonDraft(source: WorkshopLessonRow) {
  const stableId = `lesson-${crypto.randomUUID()}`;
  const blocks = Array.isArray(source.draft.blocks) ? source.draft.blocks : [];
  return {
    ...structuredClone(source.draft),
    id: stableId,
    title: `${String(source.draft.title ?? "Untitled lesson")} (copy)`,
    blocks: blocks.map((block) => {
      if (!block || typeof block !== "object") return block;
      const item = block as Record<string, unknown>;
      return {
        ...structuredClone(item),
        id: crypto.randomUUID(),
        commandGroups: Array.isArray(item.commandGroups)
          ? item.commandGroups.map((group) => ({ ...group, id: crypto.randomUUID() }))
          : item.commandGroups,
      };
    }),
  };
}

export function duplicateAssessmentDraft(source: WorkshopAssessmentRow) {
  const questions = Array.isArray(source.draft.questions) ? source.draft.questions : [];
  return {
    ...structuredClone(source.draft),
    questions: questions.map((question) => duplicateQuestion(question as AssessmentQuestion)),
  };
}

export function duplicateQuestion(question: AssessmentQuestion): AssessmentQuestion {
  const choices = question.choices.map((choice) => ({ ...structuredClone(choice), id: crypto.randomUUID() }));
  const correctIndex = question.choices.findIndex((choice) => choice.id === question.correctChoiceId);
  return { ...structuredClone(question), id: crypto.randomUUID(), choices, correctChoiceId: correctIndex >= 0 ? choices[correctIndex].id : choices[0]?.id ?? '' };
}
