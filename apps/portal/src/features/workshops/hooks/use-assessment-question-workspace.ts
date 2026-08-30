import type { AssessmentDraft, AssessmentQuestion } from "@/features/workshops/assessment-types";
import {
  ASSESSMENT_QUESTIONS_PER_PAGE,
  useAssessmentQuestionNavigation,
} from "@/features/workshops/hooks/use-assessment-question-navigation";
import type { WorkshopAssessmentRow } from "@/lib/api/types";

export function useAssessmentQuestionWorkspace(
  row: WorkshopAssessmentRow,
  onChange: (row: WorkshopAssessmentRow) => void,
) {
  const draft = row.draft as AssessmentDraft;
  const questions = draft.questions ?? [];
  const navigation = useAssessmentQuestionNavigation(questions);

  const setQuestions = (nextQuestions: AssessmentQuestion[]) =>
    onChange({ ...row, draft: { ...row.draft, questions: nextQuestions } });

  const addQuestion = () => {
    const question = createEmptyQuestion();
    const nextQuestions = [...questions, question];
    setQuestions(nextQuestions);
    navigation.follow(question.id, nextQuestions.length - 1, true);
  };

  const updateQuestion = (index: number, patch: Partial<AssessmentQuestion>) =>
    setQuestions(
      questions.map((question, current) =>
        current === index ? { ...question, ...patch } : question,
      ),
    );

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (!isValidMove(fromIndex, toIndex, questions.length)) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setQuestions(reordered);
    navigation.follow(moved.id, toIndex);
  };

  const removeQuestion = (index: number) => {
    const remaining = questions.filter((_, current) => current !== index);
    setQuestions(remaining);
    if (remaining.length) {
      const nextIndex = Math.min(index, remaining.length - 1);
      navigation.follow(remaining[nextIndex].id, nextIndex);
    } else {
      navigation.setPage(1);
    }
  };

  const changePage = (page: number) => {
    const firstIndex = (page - 1) * ASSESSMENT_QUESTIONS_PER_PAGE;
    const firstQuestion = questions[firstIndex];
    if (firstQuestion) navigation.select(firstQuestion.id);
    else navigation.setPage(page);
  };

  return {
    addQuestion,
    changePage,
    moveQuestion,
    navigation,
    questions,
    removeQuestion,
    updateQuestion,
  };
}

export type AssessmentQuestionWorkspace = ReturnType<typeof useAssessmentQuestionWorkspace>;

function createEmptyQuestion(): AssessmentQuestion {
  const first = crypto.randomUUID();
  const second = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    prompt: "",
    choices: [
      { id: first, label: "" },
      { id: second, label: "" },
    ],
    correctChoiceId: first,
    explanation: "",
  };
}

function isValidMove(fromIndex: number, toIndex: number, total: number) {
  return fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0 && fromIndex < total && toIndex < total;
}
