import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AssessmentQuestion } from "@/features/workshops/assessment-types";

interface AssessmentQuestionEditorProps {
  question: AssessmentQuestion;
  index: number;
  total: number;
  autoFocusPrompt?: boolean;
  onChange: (patch: Partial<AssessmentQuestion>) => void;
  onPromptFocused?: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

export function AssessmentQuestionEditor({
  question,
  index,
  total,
  autoFocusPrompt,
  onChange,
  onPromptFocused,
  onMove,
  onRemove,
}: AssessmentQuestionEditorProps) {
  return (
    <section
      aria-label={`Question ${index + 1} of ${total}`}
      className="grid min-w-0 gap-4 p-5 max-sm:p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="grid gap-1">
          <strong>EDITING QUESTION {String(index + 1).padStart(2, "0")}</strong>
          <span className="text-xs text-muted">Question {index + 1} of {total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={`Move question ${index + 1} earlier`}
                className="grid size-11 place-items-center rounded-control border border-line bg-transparent text-muted hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange [&_svg]:size-[18px]"
                disabled={index === 0}
                onClick={() => onMove(-1)}
                type="button"
              >
                <ArrowUp aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Move this question earlier</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={`Move question ${index + 1} later`}
                className="grid size-11 place-items-center rounded-control border border-line bg-transparent text-muted hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange [&_svg]:size-[18px]"
                disabled={index === total - 1}
                onClick={() => onMove(1)}
                type="button"
              >
                <ArrowDown aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Move this question later</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={`Remove question ${index + 1}`}
                className="grid size-11 place-items-center rounded-control border border-line bg-raised text-copy hover:border-signal-red/60 hover:bg-signal-red-soft hover:text-[#ff858a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange [&_svg]:size-[18px]"
                onClick={onRemove}
                type="button"
              >
                <Trash2 aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Remove this question</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
        <span>Question</span>
        <textarea
          autoFocus={autoFocusPrompt}
          onFocus={onPromptFocused}
          placeholder="Example: Which destination network should R1 reach using a static route?"
          rows={3}
          value={question.prompt}
          onChange={(event) => onChange({ prompt: event.target.value })}
        />
      </label>

      <fieldset className="grid gap-3 border-0 p-0">
        <legend className="mb-1 text-[0.7rem] font-semibold text-copy">
          Answer choices
        </legend>
        <p className="m-0 text-xs leading-5 text-muted">
          Select the circle beside the correct answer.
        </p>
        {question.choices.map((choice, choiceIndex) => (
          <div
            className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2"
            key={choice.id}
          >
            <input
              aria-label={`Mark answer ${choiceIndex + 1} correct`}
              checked={question.correctChoiceId === choice.id}
              name={`correct-answer-${question.id}`}
              onChange={() => onChange({ correctChoiceId: choice.id })}
              type="radio"
            />
            <input
              aria-label={`Answer ${choiceIndex + 1}`}
              placeholder={`Enter answer choice ${choiceIndex + 1}`}
              value={choice.label}
              onChange={(event) =>
                onChange({
                  choices: question.choices.map((item, current) =>
                    current === choiceIndex
                      ? { ...item, label: event.target.value }
                      : item,
                  ),
                })
              }
            />
          </div>
        ))}
      </fieldset>

      <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
        <span>Answer explanation</span>
        <textarea
          placeholder="Explain why the selected answer is correct and address the likely mistake."
          rows={2}
          value={question.explanation ?? ""}
          onChange={(event) => onChange({ explanation: event.target.value })}
        />
      </label>
    </section>
  );
}
