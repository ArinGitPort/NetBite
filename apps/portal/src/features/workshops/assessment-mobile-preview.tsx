import { X } from "lucide-react";

import type { WorkshopAssessmentRow } from "@/lib/api/types";
import type { AssessmentDraft, AssessmentSettings } from "@/features/workshops/assessment-types";

export function AssessmentMobilePreview({ draft, row }: { draft: AssessmentDraft; row: WorkshopAssessmentRow }) {
  const questions = draft.questions ?? [];
  const graded = row.mode === "graded";
  const settings = row.settings as AssessmentSettings;
  const gradePolicy = settings.gradePolicy === "first" ? "First attempt" : settings.gradePolicy === "latest" ? "Latest attempt" : "Highest attempt";
  return (
    <div className="themed-scrollbar flex min-h-[650px] w-full justify-center overflow-auto rounded-control border border-line bg-canvas/70 p-4 sm:p-5" data-testid="assessment-mobile-preview">
      <div className="h-[680px] w-full max-w-[390px] shrink-0 overflow-y-auto rounded-[34px] border-[8px] border-[#29252a] bg-sidebar bg-[image:var(--nb-grid)] bg-[size:24px_24px] shadow-[0_24px_55px_rgb(0_0_0/50%)]">
        <div className="flex h-14 items-center gap-3 border-b border-line px-4 font-mono text-xs text-signal-red">
          <X aria-hidden="true" className="size-4" /> CLOSE
          <span className="ml-auto text-muted">{graded ? "GRADED" : "PRACTICE"}</span>
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-2">
            <p className="m-0 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">{graded ? "OFFICIAL CLASS ASSESSMENT" : "PRACTICE ACTIVITY"}</p>
            <h2 className="m-0 text-lg leading-7">{row.title.toUpperCase()}</h2>
            <p className="m-0 text-sm leading-6 text-muted">{draft.instructions || "No instructions added yet."}</p>
          </div>
          {graded ? (
            <section className="grid gap-1.5 border border-line bg-surface p-4 text-xs leading-5">
              <strong className="font-mono text-[0.65rem] text-signal-orange">SUBMISSION RULES</strong>
              <span>Attempts: {Number(settings.maximumAttempts ?? 1)}</span>
              <span>Recorded score: {gradePolicy}</span>
              <span>Passing score: {Number(settings.passingPercentage ?? 80)}%</span>
              {settings.opensAt ? <span>Opens: {formatPreviewDate(settings.opensAt)}</span> : null}
              {settings.dueAt ? <span>Due: {formatPreviewDate(settings.dueAt)}</span> : null}
              <span>Results: {formatFeedbackRelease(settings.feedbackRelease)}</span>
              <small className="mt-1 leading-5 text-muted">A grade is recorded only after the server confirms submission.</small>
            </section>
          ) : null}
          <div className="grid gap-4">
            {questions.map((question, index) => (
              <section className="grid gap-3 border border-line bg-surface p-4" key={question.id}>
                <span className="font-mono text-[0.65rem] font-semibold text-signal-orange">QUESTION {index + 1} OF {questions.length}</span>
                <strong className="text-sm leading-6">{question.prompt || "Question text will appear here."}</strong>
                <div className="grid gap-2">
                  {question.choices.map((choice, choiceIndex) => (
                    <div className="flex min-h-[52px] items-center gap-3 border border-line bg-canvas p-3 text-xs leading-5" key={choice.id}>
                      <span className="size-[18px] shrink-0 rounded-full border-2 border-muted" />
                      <span>{choice.label || `Answer choice ${choiceIndex + 1}`}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {!questions.length ? <div className="grid min-h-36 place-items-center border border-dashed border-line p-5 text-center text-sm text-muted">No questions added yet.</div> : null}
          </div>
          <button className="min-h-11 w-full rounded-control border border-line bg-raised px-4 text-xs font-semibold text-muted" disabled type="button">{graded ? "SUBMIT GRADED ASSESSMENT" : "CHECK PRACTICE ANSWERS"}</button>
          <span className="text-center font-mono text-[0.62rem] text-muted">PREVIEW ONLY / ANSWERS ARE DISABLED</span>
        </div>
      </div>
    </div>
  );
}

function formatPreviewDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function formatFeedbackRelease(value: string | undefined) {
  if (value === "due-date") return "After the due date";
  if (value === "immediate") return "Immediately";
  return "After the final attempt";
}
