import { Plus, Save, Trash2 } from "lucide-react";
import * as api from "../../lib/content-api";
import type { WorkshopAssessmentRow } from "../../lib/content-api";

export function AssessmentEditor({
  row,
  onChange,
  onSaved,
}: {
  row: WorkshopAssessmentRow;
  onChange: (row: WorkshopAssessmentRow) => void;
  onSaved: () => void;
}) {
  const draft = row.draft as {
    instructions?: string;
    questions?: Array<{
      id: string;
      prompt: string;
      choices: Array<{ id: string; label: string }>;
      correctChoiceId: string;
      explanation?: string;
    }>;
  };
  const questions = draft.questions ?? [];
  const update = (patch: Partial<WorkshopAssessmentRow>) =>
    onChange({ ...row, ...patch });
  const updateQuestion = (
    index: number,
    patch: Partial<(typeof questions)[number]>,
  ) =>
    update({
      draft: {
        ...row.draft,
        questions: questions.map((question, current) =>
          current === index ? { ...question, ...patch } : question,
        ),
      },
    });
  const addQuestion = () => {
    const first = crypto.randomUUID(),
      second = crypto.randomUUID();
    update({
      draft: {
        ...row.draft,
        questions: [
          ...questions,
          {
            id: crypto.randomUUID(),
            prompt: "",
            choices: [
              { id: first, label: "" },
              { id: second, label: "" },
            ],
            correctChoiceId: first,
            explanation: "",
          },
        ],
      },
    });
  };
  return (
    <div className="grid gap-5 bg-surface p-6 max-sm:p-4">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <strong>ASSESSMENT SETTINGS</strong>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-white hover:text-canvas disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
          onClick={() => void api.saveWorkshopAssessment(row).then(onSaved)}
        >
          <Save />
          SAVE ASSESSMENT
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
          <span>Title</span>
          <input
            value={row.title}
            onChange={(event) => update({ title: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
          <span>Assessment use</span>
          <select
            value={row.mode}
            onChange={(event) =>
              update({
                mode: event.target.value as WorkshopAssessmentRow["mode"],
              })
            }
          >
            <option value="practice">Practice</option>
            <option value="graded">Graded</option>
          </select>
        </label>
      </div>
      {row.mode === "graded" ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
              <span>Maximum attempts</span>
              <input
                type="number"
                min="1"
                max="20"
                value={Number(row.settings.maximumAttempts ?? 1)}
                onChange={(event) =>
                  update({
                    settings: {
                      ...row.settings,
                      maximumAttempts: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
              <span>Recorded score</span>
              <select
                value={String(row.settings.gradePolicy ?? "highest")}
                onChange={(event) =>
                  update({
                    settings: {
                      ...row.settings,
                      gradePolicy: event.target.value,
                    },
                  })
                }
              >
                <option value="highest">Highest attempt</option>
                <option value="latest">Latest attempt</option>
                <option value="first">First attempt</option>
              </select>
            </label>
            <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
              <span>Passing percentage</span>
              <input
                type="number"
                min="0"
                max="100"
                value={Number(row.settings.passingPercentage ?? 80)}
                onChange={(event) =>
                  update({
                    settings: {
                      ...row.settings,
                      passingPercentage: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
              <span>Release results</span>
              <select
                value={String(row.settings.feedbackRelease ?? "final-attempt")}
                onChange={(event) =>
                  update({
                    settings: {
                      ...row.settings,
                      feedbackRelease: event.target.value,
                    },
                  })
                }
              >
                <option value="immediate">Immediately</option>
                <option value="final-attempt">After final attempt</option>
                <option value="due-date">After due date</option>
              </select>
            </label>
            <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
              <span>Opening date (optional)</span>
              <input
                type="datetime-local"
                value={String(row.settings.opensAt ?? "").slice(0, 16)}
                onChange={(event) =>
                  update({
                    settings: {
                      ...row.settings,
                      opensAt: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : undefined,
                    },
                  })
                }
              />
            </label>
            <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
              <span>Due date (optional)</span>
              <input
                type="datetime-local"
                value={String(row.settings.dueAt ?? "").slice(0, 16)}
                onChange={(event) =>
                  update({
                    settings: {
                      ...row.settings,
                      dueAt: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : undefined,
                    },
                  })
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3 [&_label]:flex [&_label]:min-h-11 [&_label]:items-center [&_label]:gap-2 [&_label]:rounded-control [&_label]:border [&_label]:border-line [&_label]:px-3 [&_label]:text-muted">
            <label>
              <input
                type="checkbox"
                checked={Boolean(row.settings.shuffleQuestions)}
                onChange={(event) =>
                  update({
                    settings: {
                      ...row.settings,
                      shuffleQuestions: event.target.checked,
                    },
                  })
                }
              />{" "}
              Shuffle question order for each student
            </label>
            <label>
              <input
                type="checkbox"
                checked={Boolean(row.settings.shuffleAnswers)}
                onChange={(event) =>
                  update({
                    settings: {
                      ...row.settings,
                      shuffleAnswers: event.target.checked,
                    },
                  })
                }
              />{" "}
              Shuffle answer order for each student
            </label>
          </div>
        </>
      ) : (
        <p className="m-0 text-xs leading-6 text-muted">
          Practice assessments allow unlimited attempts and show explanations
          immediately. They do not appear in the gradebook.
        </p>
      )}
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-signal-orange/60 bg-signal-orange-soft px-4 text-xs font-semibold text-[#f1ae78] hover:border-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
        onClick={addQuestion}
      >
        <Plus />
        ADD QUESTION
      </button>
      {questions.map((question, index) => (
        <section
          className="grid gap-4 rounded-control border border-line bg-canvas p-4"
          key={question.id}
        >
          <header>
            <strong>QUESTION {index + 1}</strong>
            <button
              className="grid size-11 place-items-center rounded-control border border-line bg-raised text-copy hover:border-muted hover:bg-surface [&_svg]:size-[18px]"
              aria-label={`Remove question ${index + 1}`}
              onClick={() =>
                update({
                  draft: {
                    ...row.draft,
                    questions: questions.filter(
                      (_, current) => current !== index,
                    ),
                  },
                })
              }
            >
              <Trash2 />
            </button>
          </header>
          <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
            <span>Question</span>
            <textarea
              rows={3}
              value={question.prompt}
              onChange={(event) =>
                updateQuestion(index, { prompt: event.target.value })
              }
            />
          </label>
          {question.choices.map((choice, choiceIndex) => (
            <div
              className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2"
              key={choice.id}
            >
              <input
                type="radio"
                aria-label={`Mark answer ${choiceIndex + 1} correct`}
                checked={question.correctChoiceId === choice.id}
                onChange={() =>
                  updateQuestion(index, { correctChoiceId: choice.id })
                }
              />
              <input
                aria-label={`Answer ${choiceIndex + 1}`}
                value={choice.label}
                onChange={(event) =>
                  updateQuestion(index, {
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
          <label className="grid gap-2 text-[0.7rem] font-semibold text-copy [&>small]:font-normal [&>small]:leading-6 [&>small]:text-muted">
            <span>Explanation</span>
            <textarea
              rows={2}
              value={question.explanation ?? ""}
              onChange={(event) =>
                updateQuestion(index, { explanation: event.target.value })
              }
            />
          </label>
        </section>
      ))}
    </div>
  );
}
