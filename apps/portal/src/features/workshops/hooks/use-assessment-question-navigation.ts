import { useState } from "react";

import type { AssessmentQuestion } from "@/features/workshops/assessment-types";

export const ASSESSMENT_QUESTIONS_PER_PAGE = 8;

export function useAssessmentQuestionNavigation(questions: AssessmentQuestion[]) {
  const [selectedId, setSelectedId] = useState<string | undefined>(questions[0]?.id);
  const [requestedPage, setRequestedPage] = useState(1);
  const [focusQuestionId, setFocusQuestionId] = useState<string>();

  const selectedIndex = Math.max(
    0,
    questions.findIndex((question) => question.id === selectedId),
  );
  const selectedQuestion = questions[selectedIndex];
  const pageCount = Math.max(1, Math.ceil(questions.length / ASSESSMENT_QUESTIONS_PER_PAGE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const pageStart = (page - 1) * ASSESSMENT_QUESTIONS_PER_PAGE;

  const select = (id: string) => {
    const index = questions.findIndex((question) => question.id === id);
    if (index < 0) return;
    setSelectedId(id);
    setRequestedPage(pageForIndex(index));
  };

  const follow = (id: string, index: number, focus = false) => {
    setSelectedId(id);
    setRequestedPage(pageForIndex(index));
    setFocusQuestionId(focus ? id : undefined);
  };

  return {
    focusQuestionId,
    page,
    pageCount,
    pageStart,
    pageQuestions: questions.slice(pageStart, pageStart + ASSESSMENT_QUESTIONS_PER_PAGE),
    selectedIndex: questions.length ? selectedIndex : -1,
    selectedQuestion,
    select,
    setPage: setRequestedPage,
    follow,
    clearFocus: () => setFocusQuestionId(undefined),
  };
}

function pageForIndex(index: number) {
  return Math.floor(index / ASSESSMENT_QUESTIONS_PER_PAGE) + 1;
}
