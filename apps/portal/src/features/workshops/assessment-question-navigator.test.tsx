import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AssessmentQuestionNavigator } from "@/features/workshops/assessment-question-navigator";
import type { AssessmentQuestion } from "@/features/workshops/assessment-types";

afterEach(cleanup);

function questions(count: number): AssessmentQuestion[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `question-${index + 1}`,
    prompt: index ? `Question ${index + 1}` : "",
    choices: [
      { id: `choice-${index + 1}-a`, label: index ? "Answer A" : "" },
      { id: `choice-${index + 1}-b`, label: index ? "Answer B" : "" },
    ],
    correctChoiceId: `choice-${index + 1}-a`,
    explanation: "Explanation",
  }));
}

function renderNavigator(count: number, page = 1) {
  const all = questions(count);
  const pageStart = (page - 1) * 8;
  const props = {
    page,
    pageCount: Math.max(1, Math.ceil(count / 8)),
    pageQuestions: all.slice(pageStart, pageStart + 8),
    pageStart,
    selectedId: all[pageStart]?.id,
    total: count,
    onMove: vi.fn(),
    onPageChange: vi.fn(),
    onSelect: vi.fn(),
  };
  render(
    <TooltipProvider>
      <AssessmentQuestionNavigator {...props} />
    </TooltipProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Question selector" }));
  return props;
}

describe("assessment question navigator", () => {
  test.each([0, 1, 8])("does not paginate a %i-question assessment", (count) => {
    renderNavigator(count);
    expect(screen.queryByText(/PAGE 1 OF/)).not.toBeInTheDocument();
  });

  test.each([
    [9, 2],
    [16, 2],
    [17, 3],
  ])("paginates %i questions across %i pages", (count, pageCount) => {
    renderNavigator(count);
    expect(screen.getByText(`PAGE 1 OF ${pageCount}`)).toBeInTheDocument();
  });

  test("labels incomplete questions and changes pages through button controls", () => {
    const props = renderNavigator(9);
    const list = screen.getByRole("list", { name: "Question list" });
    expect(within(list).getByText("UNTITLED QUESTION")).toBeInTheDocument();
    expect(within(list).getByText("NEEDS QUESTION")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next questions" }));
    expect(props.onPageChange).toHaveBeenCalledWith(2);
  });

  test("closes the question menu with Escape and returns focus", () => {
    renderNavigator(2);
    const trigger = screen.getByRole("button", { name: "Question selector" });
    expect(screen.getByRole("list", { name: "Question list" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("list", { name: "Question list" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("supports keyboard reordering from the drag handle", () => {
    const props = renderNavigator(9, 2);
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Reorder question 9, position 9 of 9" }),
      { key: "ArrowUp" },
    );
    expect(props.onMove).toHaveBeenCalledWith(8, 7);
  });

  test("reorders questions by dragging within the visible page", () => {
    const props = renderNavigator(8);
    const source = screen.getByRole("button", {
      name: "Reorder question 1, position 1 of 8",
    });
    const target = screen
      .getByRole("button", { name: /Q03 Question 3 COMPLETE/ })
      .parentElement;
    const dataTransfer = {
      dropEffect: "move",
      effectAllowed: "move",
      setData: vi.fn(),
    };

    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target!, { dataTransfer });
    fireEvent.drop(target!, { dataTransfer });

    expect(props.onMove).toHaveBeenCalledWith(0, 2);
  });
});
