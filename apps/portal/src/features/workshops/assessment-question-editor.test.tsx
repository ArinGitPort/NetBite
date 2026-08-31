import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AssessmentQuestionEditor } from "@/features/workshops/assessment-question-editor";
import type { AssessmentQuestion } from "@/features/workshops/assessment-types";

const initialQuestion: AssessmentQuestion = {
  id: "question-1",
  prompt: "Which route should R1 use?",
  choices: [
    { id: "choice-a", label: "Route A" },
    { id: "choice-b", label: "Route B" },
  ],
  correctChoiceId: "choice-a",
  explanation: "Route A has the required destination.",
};

function QuestionHarness() {
  const [question, setQuestion] = useState(initialQuestion);
  return (
    <TooltipProvider>
      <AssessmentQuestionEditor
        index={0}
        onChange={(patch) => setQuestion((current) => ({ ...current, ...patch }))}
        onMove={vi.fn()}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        onRemove={vi.fn()}
        question={question}
        total={1}
      />
    </TooltipProvider>
  );
}

describe("assessment question editor", () => {
  test("uses accessible styled radio controls to select the correct answer", () => {
    render(<QuestionHarness />);
    const first = screen.getByRole("radio", { name: "Mark answer 1 correct" });
    const second = screen.getByRole("radio", { name: "Mark answer 2 correct" });

    expect(first).toHaveAttribute("aria-checked", "true");
    expect(second).toHaveAttribute("aria-checked", "false");
    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-checked", "false");
    expect(second).toHaveAttribute("aria-checked", "true");
  });
});
