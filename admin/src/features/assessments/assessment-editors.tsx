import { Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import * as api from "../../lib/content-api";
import type { FlashcardRow, LessonRow, QuizRow } from "../../lib/content-api";
import { ConfirmAction, Field } from "../../components/ui/admin-primitives";

export function QuizEditor({
  row,
  lessons,
  onDone,
  onDirtyChange,
}: {
  row: QuizRow;
  lessons: LessonRow[];
  onDone: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [value, setValue] = useState(row);
  const dirty = JSON.stringify(value) !== JSON.stringify(row);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  return (
    <article className="grid min-w-0 gap-6" data-testid="assessment-editor">
      <header className="flex min-w-0 flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-[42px] shrink-0 place-items-center rounded-control border border-signal-orange font-mono text-xs text-signal-orange">
            Q{String(row.position).padStart(2, "0")}
          </div>
          <div className="grid min-w-0 gap-1">
            <strong className="break-words">
              Editing question {String(row.position).padStart(2, "0")}
            </strong>
            <span
              className={
                dirty ? "text-xs text-signal-orange" : "text-xs text-muted"
              }
              role="status"
            >
              {dirty ? "UNSAVED CHANGES" : "ALL CHANGES SAVED"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button
            disabled={!dirty}
            tone="primary"
            onClick={() =>
              void api
                .saveQuiz(value)
                .then(() => onDone("Quiz question saved."))
            }
          >
            <Save />
            SAVE CHANGES
          </Button>
          <ConfirmAction
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-red/60 bg-transparent px-4 text-xs font-semibold text-[#ff858a] hover:bg-signal-red-soft disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
            ariaLabel="Delete quiz question"
            confirmLabel="DELETE QUESTION"
            detail="This removes the draft question from the assessment workspace. Published versions remain unchanged."
            onConfirm={() =>
              api
                .deleteAssessment("content_quiz_questions", row.id)
                .then(() => onDone("Question deleted."))
            }
            title="Delete this quiz question?"
          >
            <Trash2 />
            DELETE QUESTION
          </ConfirmAction>
        </div>
      </header>
      <div className="grid min-w-0 gap-4" data-testid="assessment-fields">
        <Field label="Scenario question">
          <textarea
            rows={2}
            value={value.draft.prompt}
            onChange={(event) =>
              setValue({
                ...value,
                draft: { ...value.draft, prompt: event.target.value },
              })
            }
          />
        </Field>
        <Field label="Mapped lesson">
          <select
            value={value.lesson_id}
            onChange={(event) =>
              setValue({
                ...value,
                lesson_id: event.target.value,
                draft: { ...value.draft, lessonId: event.target.value },
              })
            }
          >
            {lessons.map((lesson) => (
              <option value={lesson.id} key={lesson.id}>
                {lesson.draft.title}
              </option>
            ))}
          </select>
        </Field>
        {value.draft.answers.map((answer, index) => (
          <Field
            key={index}
            label={`Answer ${index + 1}${index === value.draft.correctAnswerIndex ? " / Correct" : ""}`}
          >
            <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-3 [&_input[type=radio]]:size-[18px] [&_input[type=radio]]:accent-signal-green">
              <input
                type="radio"
                checked={index === value.draft.correctAnswerIndex}
                onChange={() =>
                  setValue({
                    ...value,
                    draft: { ...value.draft, correctAnswerIndex: index },
                  })
                }
              />
              <input
                value={answer}
                onChange={(event) =>
                  setValue({
                    ...value,
                    draft: {
                      ...value.draft,
                      answers: value.draft.answers.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    },
                  })
                }
              />
            </div>
          </Field>
        ))}
        <Field label="Feedback">
          <textarea
            rows={2}
            value={value.draft.explanation}
            onChange={(event) =>
              setValue({
                ...value,
                draft: { ...value.draft, explanation: event.target.value },
              })
            }
          />
        </Field>
      </div>
    </article>
  );
}
export function FlashcardEditor({
  row,
  lessons,
  onDone,
  onDirtyChange,
}: {
  row: FlashcardRow;
  lessons: LessonRow[];
  onDone: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [value, setValue] = useState(row);
  const dirty = JSON.stringify(value) !== JSON.stringify(row);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  return (
    <article className="grid min-w-0 gap-6" data-testid="assessment-editor">
      <header className="flex min-w-0 flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-[42px] shrink-0 place-items-center rounded-control border border-signal-orange font-mono text-xs text-signal-orange">
            C{String(row.position).padStart(2, "0")}
          </div>
          <div className="grid min-w-0 gap-1">
            <strong className="break-words">
              Editing card {String(row.position).padStart(2, "0")}
            </strong>
            <span
              className={
                dirty ? "text-xs text-signal-orange" : "text-xs text-muted"
              }
              role="status"
            >
              {dirty ? "UNSAVED CHANGES" : "ALL CHANGES SAVED"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button
            disabled={!dirty}
            tone="primary"
            onClick={() =>
              void api
                .saveFlashcard(value)
                .then(() => onDone("Flashcard saved."))
            }
          >
            <Save />
            SAVE CHANGES
          </Button>
          <ConfirmAction
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-red/60 bg-transparent px-4 text-xs font-semibold text-[#ff858a] hover:bg-signal-red-soft disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
            ariaLabel="Delete flashcard"
            confirmLabel="DELETE FLASHCARD"
            detail="This removes the draft flashcard from the assessment workspace. Published versions remain unchanged."
            onConfirm={() =>
              api
                .deleteAssessment("content_flashcards", row.id)
                .then(() => onDone("Flashcard deleted."))
            }
            title="Delete this flashcard?"
          >
            <Trash2 />
            DELETE CARD
          </ConfirmAction>
        </div>
      </header>
      <div className="grid min-w-0 gap-4" data-testid="assessment-fields">
        <Field label="Recall question">
          <textarea
            rows={2}
            value={value.draft.prompt}
            onChange={(event) =>
              setValue({
                ...value,
                draft: { ...value.draft, prompt: event.target.value },
              })
            }
          />
        </Field>
        <Field label="Mapped lesson">
          <select
            value={value.lesson_id}
            onChange={(event) =>
              setValue({
                ...value,
                lesson_id: event.target.value,
                draft: { ...value.draft, lessonId: event.target.value },
              })
            }
          >
            {lessons.map((lesson) => (
              <option value={lesson.id} key={lesson.id}>
                {lesson.draft.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Answer">
          <textarea
            rows={2}
            value={value.draft.answer}
            onChange={(event) =>
              setValue({
                ...value,
                draft: { ...value.draft, answer: event.target.value },
              })
            }
          />
        </Field>
        <Field label="Why it matters">
          <textarea
            rows={2}
            value={value.draft.explanation}
            onChange={(event) =>
              setValue({
                ...value,
                draft: { ...value.draft, explanation: event.target.value },
              })
            }
          />
        </Field>
      </div>
    </article>
  );
}
