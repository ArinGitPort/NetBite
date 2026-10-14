import { GripVertical } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AssessmentQuestion } from "@/features/workshops/assessment-types";
import { ASSESSMENT_QUESTIONS_PER_PAGE } from "@/features/workshops/hooks/use-assessment-question-navigation";
import { cn } from "@/lib/class-names";
import { setReorderDragPreview } from "@/features/workshops/reorder-drag-preview";

interface AssessmentQuestionNavigatorProps {
  page: number;
  pageCount: number;
  pageQuestions: AssessmentQuestion[];
  pageStart: number;
  selectedId?: string;
  total: number;
  onMove: (fromIndex: number, toIndex: number) => void;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
}

export function AssessmentQuestionNavigator({
  page,
  pageCount,
  pageQuestions,
  pageStart,
  selectedId,
  total,
  onMove,
  onPageChange,
  onSelect,
}: AssessmentQuestionNavigatorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number>();
  const [dropIndex, setDropIndex] = useState<number>();
  const reducedMotion = useReducedMotion();

  return (
    <section
      aria-label="Assessment questions"
      className="grid min-w-0 gap-3"
    >
      <header>
        <div className="flex items-center justify-between gap-3 px-1 pb-2">
          <strong className="font-mono text-[0.62rem] font-semibold tracking-[0.08em] text-muted">
            QUESTIONS
          </strong>
          <span className="text-[0.65rem] text-muted">{total} added</span>
        </div>
      </header>

      <div className="min-w-0">
        <div
          aria-label="Question list"
          className="themed-scrollbar grid max-h-[520px] content-start gap-1 overflow-y-auto"
          id="assessment-question-list"
          role="list"
        >
          {pageQuestions.map((question, localIndex) => {
          const index = pageStart + localIndex;
          const status = getQuestionStatus(question);
          return (
            <motion.div
              className={cn(
                "relative grid min-w-0 grid-cols-[minmax(0,1fr)_36px] items-stretch border-l-2 bg-surface transition-[background-color,border-color,opacity]",
                question.id === selectedId
                  ? "border-signal-orange text-copy"
                  : "border-transparent text-muted hover:text-copy",
                dropIndex === index && draggedIndex !== index && draggedIndex !== undefined &&
                  (draggedIndex < index
                    ? "after:absolute after:inset-x-0 after:-bottom-0.5 after:z-10 after:h-0.5 after:bg-signal-orange"
                    : "before:absolute before:inset-x-0 before:-top-0.5 before:z-10 before:h-0.5 before:bg-signal-orange"),
                draggedIndex === index && "bg-raised opacity-45",
              )}
              key={question.id}
              layout="position"
              role="listitem"
              transition={{ layout: { duration: reducedMotion ? 0 : 0.2 } }}
              onDragOver={(event) => handleDragOver(event, draggedIndex, index, setDropIndex)}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedIndex !== undefined) onMove(draggedIndex, index);
                setDraggedIndex(undefined);
                setDropIndex(undefined);
              }}
            >
              <button
                className="grid min-w-0 gap-1 border-0 bg-transparent px-2 py-3 text-left text-inherit"
                onClick={() => onSelect(question.id)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-[0.62rem] text-signal-orange">
                    Q{String(index + 1).padStart(2, "0")}
                  </span>
                  <strong className="min-w-0 break-words text-xs leading-5">
                    {question.prompt.trim() || "UNTITLED QUESTION"}
                  </strong>
                </span>
                <small className={cn("text-[0.62rem]", status.tone)}>{status.label}</small>
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={`Reorder question ${index + 1}, position ${index + 1} of ${total}`}
                    className="grid size-9 cursor-grab place-items-center self-center border-0 bg-transparent text-muted hover:text-copy active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal-orange [&_svg]:size-[18px]"
                    draggable
                    onDragEnd={() => {
                      setDraggedIndex(undefined);
                      setDropIndex(undefined);
                    }}
                    onDragStart={(event) => {
                      setReorderDragPreview(event, event.currentTarget.closest('[role="listitem"]'));
                      setDraggedIndex(index);
                      setDropIndex(index);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", question.id);
                    }}
                    onKeyDown={(event) => handleReorderKey(event, index, total, onMove)}
                    type="button"
                  >
                    <GripVertical aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Drag to reorder. Use Up or Down Arrow with the keyboard.</TooltipContent>
              </Tooltip>
            </motion.div>
          );
          })}
          {!total ? (
            <p className="m-0 p-4 text-center text-xs leading-5 text-muted">
              Use ADD QUESTION in the editor toolbar to begin.
            </p>
          ) : null}
        </div>
        {pageCount > 1 ? (
          <QuestionPagination page={page} pageCount={pageCount} onChange={onPageChange} />
        ) : null}
      </div>
    </section>
  );
}

function QuestionPagination({ page, pageCount, onChange }: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const items = getPageItems(page, pageCount);
  return (
    <div className="grid gap-2 border-t border-line p-3">
      <span className="text-center font-mono text-[0.6rem] text-muted">PAGE {page} OF {pageCount}</span>
      <Pagination>
        <PaginationContent className="gap-0.5">
          <PaginationItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <PaginationPrevious
                  aria-label="Previous questions"
                  className="min-h-8 min-w-8 px-1"
                  disabled={page === 1}
                  onClick={() => onChange(page - 1)}
                />
              </TooltipTrigger>
              <TooltipContent>Previous questions</TooltipContent>
            </Tooltip>
          </PaginationItem>
          {items.map((item, index) =>
            item === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis className="size-7" />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationButton
                  active={item === page}
                  aria-label={`Question page ${item}`}
                  className="min-h-8 min-w-7 px-1"
                  onClick={() => onChange(item)}
                >
                  {item}
                </PaginationButton>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <PaginationNext
                  aria-label="Next questions"
                  className="min-h-8 min-w-8 px-1"
                  disabled={page === pageCount}
                  onClick={() => onChange(page + 1)}
                />
              </TooltipTrigger>
              <TooltipContent>Next questions</TooltipContent>
            </Tooltip>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function getQuestionStatus(question: AssessmentQuestion) {
  if (!question.prompt.trim()) return { label: "NEEDS QUESTION", tone: "text-signal-orange" };
  const completeChoices = question.choices.filter((choice) => choice.label.trim());
  const correctChoiceIsComplete = completeChoices.some((choice) => choice.id === question.correctChoiceId);
  if (completeChoices.length < 2 || !correctChoiceIsComplete) {
    return { label: "NEEDS ANSWERS", tone: "text-signal-orange" };
  }
  return { label: "COMPLETE", tone: "text-signal-green" };
}

function getPageItems(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((item) => item > 0 && item <= pageCount).sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  sorted.forEach((item, index) => {
    if (index && item - sorted[index - 1] > 1) result.push("ellipsis");
    result.push(item);
  });
  return result;
}

function handleDragOver(
  event: DragEvent<HTMLDivElement>,
  draggedIndex: number | undefined,
  index: number,
  setDropIndex: (index: number) => void,
) {
  if (draggedIndex === undefined) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  setDropIndex(index);
}

function handleReorderKey(
  event: KeyboardEvent<HTMLButtonElement>,
  index: number,
  total: number,
  onMove: (fromIndex: number, toIndex: number) => void,
) {
  if (event.key === "ArrowUp" && index > 0) {
    event.preventDefault();
    onMove(index, index - 1);
  }
  if (event.key === "ArrowDown" && index < total - 1) {
    event.preventDefault();
    onMove(index, index + 1);
  }
}
