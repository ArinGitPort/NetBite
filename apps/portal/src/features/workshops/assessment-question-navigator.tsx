import { ChevronDown, GripVertical } from "lucide-react";
import {
  useEffect,
  useRef,
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number>();
  const [dropIndex, setDropIndex] = useState<number>();
  const selectedQuestion = pageQuestions.find((question) => question.id === selectedId);
  const selectedIndex = selectedQuestion
    ? pageStart + pageQuestions.indexOf(selectedQuestion)
    : undefined;
  const selectedStatus = selectedQuestion ? getQuestionStatus(selectedQuestion) : undefined;

  useEffect(() => {
    if (!open) return;
    const closeWhenOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  return (
    <section
      aria-label="Assessment questions"
      className="relative z-20 grid gap-2"
      ref={rootRef}
    >
      <header className="grid gap-2">
        <div className="flex items-center justify-between gap-3 px-1">
          <strong className="font-mono text-[0.62rem] font-semibold tracking-[0.08em] text-muted">
            QUESTIONS
          </strong>
          <span className="text-[0.65rem] text-muted">{total} added</span>
        </div>
        <button
          aria-label="Question selector"
          aria-controls="assessment-question-list"
          aria-expanded={open}
          className="flex min-h-12 min-w-0 items-center justify-between gap-3 rounded-control border border-line bg-canvas px-3 py-2 text-left text-copy hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange"
          onClick={() => setOpen((current) => !current)}
          ref={triggerRef}
          type="button"
        >
          <span className="grid min-w-0 gap-1">
            <span className="flex min-w-0 items-center gap-2">
              {selectedIndex !== undefined ? (
                <span className="shrink-0 font-mono text-[0.62rem] text-signal-orange">
                  Q{String(selectedIndex + 1).padStart(2, "0")}
                </span>
              ) : null}
              <strong className="truncate text-xs">
                {selectedQuestion?.prompt.trim() || (selectedQuestion ? "UNTITLED QUESTION" : "NO QUESTIONS YET")}
              </strong>
            </span>
            <small className={cn("text-[0.6rem]", selectedStatus?.tone ?? "text-muted")}>
              {selectedStatus?.label ?? "Add a question to begin"}
            </small>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")}
          />
        </button>
      </header>

      {open ? <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-control border border-line bg-canvas shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
        <div
          aria-label="Question list"
          className="themed-scrollbar grid max-h-[320px] content-start gap-1 overflow-y-auto p-2"
          id="assessment-question-list"
          role="list"
        >
          {pageQuestions.map((question, localIndex) => {
          const index = pageStart + localIndex;
          const status = getQuestionStatus(question);
          return (
            <div
              className={cn(
                "grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-stretch rounded-control border transition-colors",
                question.id === selectedId
                  ? "border-line bg-raised"
                  : "border-transparent hover:bg-raised/70",
                dropIndex === index && draggedIndex !== index && "border-signal-orange",
                draggedIndex === index && "opacity-55",
              )}
              key={question.id}
              role="listitem"
              onDragOver={(event) => handleDragOver(event, draggedIndex, index, setDropIndex)}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedIndex !== undefined) onMove(draggedIndex, index);
                setDraggedIndex(undefined);
                setDropIndex(undefined);
              }}
            >
              <button
                className="grid min-w-0 gap-1 rounded-l-control border-0 bg-transparent px-3 py-2.5 text-left text-copy"
                onClick={() => {
                  onSelect(question.id);
                  setOpen(false);
                }}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-[0.62rem] text-signal-orange">
                    Q{String(index + 1).padStart(2, "0")}
                  </span>
                  <strong className="truncate text-xs">
                    {question.prompt.trim() || "UNTITLED QUESTION"}
                  </strong>
                </span>
                <small className={cn("text-[0.62rem]", status.tone)}>{status.label}</small>
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={`Reorder question ${index + 1}, position ${index + 1} of ${total}`}
                    className="grid size-11 cursor-grab place-items-center self-center rounded-control border-0 bg-transparent text-muted hover:bg-canvas hover:text-copy active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal-orange [&_svg]:size-[18px]"
                    draggable
                    onDragEnd={() => {
                      setDraggedIndex(undefined);
                      setDropIndex(undefined);
                    }}
                    onDragStart={(event) => {
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
            </div>
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
      </div> : null}
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
