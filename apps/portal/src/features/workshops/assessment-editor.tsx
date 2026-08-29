import { Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/selection";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { SelectField } from "@/components/ui/select";
import * as api from "../../lib/content-api";
import type { WorkshopAssessmentRow } from "../../lib/content-api";

type AssessmentDraft = {
  instructions?: string;
  questions?: Array<{
    id: string;
    prompt: string;
    choices: Array<{ id: string; label: string }>;
    correctChoiceId: string;
    explanation?: string;
  }>;
};

type AssessmentSettings = {
  maximumAttempts?: number;
  passingPercentage?: number;
  gradePolicy?: "highest" | "latest" | "first";
  feedbackRelease?: "immediate" | "final-attempt" | "due-date";
  opensAt?: string;
  dueAt?: string;
};

export function AssessmentEditor({
  row,
  onChange,
  onSaved,
}: {
  row: WorkshopAssessmentRow;
  onChange: (row: WorkshopAssessmentRow) => void;
  onSaved: () => void;
}) {
  const [view, setView] = useState<"edit" | "preview">("edit");
  const draft = row.draft as AssessmentDraft;
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
    <div className="grid gap-5 bg-surface p-5 text-[0.8rem] max-sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 border-b border-line pb-4">
        <div className="grid gap-1">
          <strong className="text-xs">ASSESSMENT SETTINGS</strong>
          <span className="text-xs leading-5 text-muted">
            Configure access, grading, and the student experience.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            value={view}
            onValueChange={(value) => setView(value as "edit" | "preview")}
          >
            <TabsList aria-label="Assessment editor view">
              <TabsTrigger value="edit" onClick={() => setView("edit")}>
                EDIT
              </TabsTrigger>
              <TabsTrigger value="preview" onClick={() => setView("preview")}>
                PREVIEW
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            onClick={() => void api.saveWorkshopAssessment(row).then(onSaved)}
            tone="primary"
          >
            <Save />
            SAVE ASSESSMENT
          </Button>
        </div>
      </div>
      {view === "preview" ? (
        <AssessmentMobilePreview draft={draft} row={row} />
      ) : (
        <>
          <section className="grid gap-3" aria-labelledby="assessment-identity">
            <h3 className="m-0 text-sm" id="assessment-identity">
              Assessment details
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
                <span>Title</span>
                <input
                  value={row.title}
                  onChange={(event) => update({ title: event.target.value })}
                />
              </label>
              <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
                <span>Assessment use</span>
                <SelectField
                  allowEmpty={false}
                  ariaLabel="Assessment use"
                  onValueChange={(mode) =>
                    update({
                      mode: mode as WorkshopAssessmentRow["mode"],
                    })
                  }
                  options={[
                    { value: "practice", label: "Practice" },
                    { value: "graded", label: "Graded" },
                  ]}
                  placeholder="Choose assessment use"
                  value={row.mode}
                />
              </label>
            </div>
          </section>
          {row.mode === "graded" ? (
            <>
              <section
                className="grid gap-3 border-t border-line pt-5"
                aria-labelledby="grading-policy"
              >
                <h3 className="m-0 text-sm" id="grading-policy">
                  Grading policy
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
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
                  <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
                    <span>Recorded score</span>
                    <SelectField
                      allowEmpty={false}
                      ariaLabel="Recorded score"
                      onValueChange={(gradePolicy) =>
                        update({
                          settings: {
                            ...row.settings,
                            gradePolicy,
                          },
                        })
                      }
                      options={[
                        { value: "highest", label: "Highest attempt" },
                        { value: "latest", label: "Latest attempt" },
                        { value: "first", label: "First attempt" },
                      ]}
                      placeholder="Choose score policy"
                      value={String(row.settings.gradePolicy ?? "highest")}
                    />
                  </label>
                  <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
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
                  <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
                    <span>Release results</span>
                    <SelectField
                      allowEmpty={false}
                      ariaLabel="Release results"
                      onValueChange={(feedbackRelease) =>
                        update({
                          settings: {
                            ...row.settings,
                            feedbackRelease,
                          },
                        })
                      }
                      options={[
                        { value: "immediate", label: "Immediately" },
                        {
                          value: "final-attempt",
                          label: "After final attempt",
                        },
                        { value: "due-date", label: "After due date" },
                      ]}
                      placeholder="Choose result release"
                      value={String(
                        row.settings.feedbackRelease ?? "final-attempt",
                      )}
                    />
                  </label>
                </div>
              </section>
              <section
                className="grid gap-3 border-t border-line pt-5"
                aria-labelledby="assessment-schedule"
              >
                <h3 className="m-0 text-sm" id="assessment-schedule">
                  Schedule
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
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
                  <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
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
              </section>
              <section
                className="grid gap-3 border-t border-line pt-5"
                aria-labelledby="student-experience"
              >
                <h3 className="m-0 text-sm" id="student-experience">
                  Student experience
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex min-h-16 items-start gap-3 rounded-control border border-line bg-canvas p-3">
                    <Checkbox
                      id="shuffle-questions"
                      checked={Boolean(row.settings.shuffleQuestions)}
                      onCheckedChange={(checked) =>
                        update({
                          settings: {
                            ...row.settings,
                            shuffleQuestions: checked === true,
                          },
                        })
                      }
                    />
                    <label
                      className="grid cursor-pointer gap-1"
                      htmlFor="shuffle-questions"
                    >
                      <strong className="text-xs">
                        Shuffle question order
                      </strong>
                      <span className="text-xs leading-5 text-muted">
                        Use a different order for each student.
                      </span>
                    </label>
                  </div>
                  <div className="flex min-h-16 items-start gap-3 rounded-control border border-line bg-canvas p-3">
                    <Checkbox
                      id="shuffle-answers"
                      checked={Boolean(row.settings.shuffleAnswers)}
                      onCheckedChange={(checked) =>
                        update({
                          settings: {
                            ...row.settings,
                            shuffleAnswers: checked === true,
                          },
                        })
                      }
                    />
                    <label
                      className="grid cursor-pointer gap-1"
                      htmlFor="shuffle-answers"
                    >
                      <strong className="text-xs">Shuffle answer order</strong>
                      <span className="text-xs leading-5 text-muted">
                        Use a different order for each student.
                      </span>
                    </label>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <p className="m-0 text-xs leading-6 text-muted">
              Practice assessments allow unlimited attempts and show
              explanations immediately. They do not appear in the gradebook.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <div className="grid gap-1">
              <h3 className="m-0 text-sm">Questions</h3>
              <span className="text-xs text-muted">
                {questions.length} added
              </span>
            </div>
            <Button onClick={addQuestion} tone="secondary">
              <Plus />
              ADD QUESTION
            </Button>
          </div>
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
        </>
      )}
    </div>
  );
}

function AssessmentMobilePreview({
  draft,
  row,
}: {
  draft: AssessmentDraft;
  row: WorkshopAssessmentRow;
}) {
  const questions = draft.questions ?? [];
  const graded = row.mode === "graded";
  const settings = row.settings as AssessmentSettings;
  const gradePolicy =
    settings.gradePolicy === "first"
      ? "First attempt"
      : settings.gradePolicy === "latest"
        ? "Latest attempt"
        : "Highest attempt";

  return (
    <div
      className="themed-scrollbar flex min-h-[650px] w-full justify-center overflow-auto rounded-control border border-line bg-canvas/70 p-4 sm:p-5"
      data-testid="assessment-mobile-preview"
    >
      <div className="h-[680px] w-full max-w-[390px] shrink-0 overflow-y-auto rounded-[34px] border-[8px] border-[#29252a] bg-sidebar bg-[image:var(--nb-grid)] bg-[size:24px_24px] shadow-[0_24px_55px_rgb(0_0_0/50%)]">
        <div className="flex h-14 items-center gap-3 border-b border-line px-4 font-mono text-xs text-signal-red">
          <X aria-hidden="true" className="size-4" />
          CLOSE
          <span className="ml-auto text-muted">
            {graded ? "GRADED" : "PRACTICE"}
          </span>
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-2">
            <p className="m-0 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">
              {graded ? "OFFICIAL CLASS ASSESSMENT" : "PRACTICE ACTIVITY"}
            </p>
            <h2 className="m-0 text-lg leading-7">{row.title.toUpperCase()}</h2>
            <p className="m-0 text-sm leading-6 text-muted">
              {draft.instructions || "No instructions added yet."}
            </p>
          </div>

          {graded ? (
            <section className="grid gap-1.5 border border-line bg-surface p-4 text-xs leading-5">
              <strong className="font-mono text-[0.65rem] text-signal-orange">
                SUBMISSION RULES
              </strong>
              <span>Attempts: {Number(settings.maximumAttempts ?? 1)}</span>
              <span>Recorded score: {gradePolicy}</span>
              <span>
                Passing score: {Number(settings.passingPercentage ?? 80)}%
              </span>
              {settings.opensAt ? (
                <span>Opens: {formatPreviewDate(settings.opensAt)}</span>
              ) : null}
              {settings.dueAt ? (
                <span>Due: {formatPreviewDate(settings.dueAt)}</span>
              ) : null}
              <span>
                Results: {formatFeedbackRelease(settings.feedbackRelease)}
              </span>
              <small className="mt-1 leading-5 text-muted">
                A grade is recorded only after the server confirms submission.
              </small>
            </section>
          ) : null}

          <div className="grid gap-4">
            {questions.map((question, index) => (
              <section
                className="grid gap-3 border border-line bg-surface p-4"
                key={question.id}
              >
                <span className="font-mono text-[0.65rem] font-semibold text-signal-orange">
                  QUESTION {index + 1} OF {questions.length}
                </span>
                <strong className="text-sm leading-6">
                  {question.prompt || "Question text will appear here."}
                </strong>
                <div className="grid gap-2">
                  {question.choices.map((choice, choiceIndex) => (
                    <div
                      className="flex min-h-[52px] items-center gap-3 border border-line bg-canvas p-3 text-xs leading-5"
                      key={choice.id}
                    >
                      <span className="size-[18px] shrink-0 rounded-full border-2 border-muted" />
                      <span>
                        {choice.label || `Answer choice ${choiceIndex + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {!questions.length ? (
              <div className="grid min-h-36 place-items-center border border-dashed border-line p-5 text-center text-sm text-muted">
                No questions added yet.
              </div>
            ) : null}
          </div>

          <button
            className="min-h-11 w-full rounded-control border border-line bg-raised px-4 text-xs font-semibold text-muted"
            disabled
            type="button"
          >
            {graded ? "SUBMIT GRADED ASSESSMENT" : "CHECK PRACTICE ANSWERS"}
          </button>
          <span className="text-center font-mono text-[0.62rem] text-muted">
            PREVIEW ONLY / ANSWERS ARE DISABLED
          </span>
        </div>
      </div>
    </div>
  );
}

function formatPreviewDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatFeedbackRelease(value: string | undefined) {
  if (value === "due-date") return "After the due date";
  if (value === "immediate") return "Immediately";
  return "After the final attempt";
}
