import { useEffect, useMemo, useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { LoadingContent } from "@/components/ui/loading-content";
import { SelectField } from "@/components/ui/select";
import { getAssessmentAnalytics, getAttemptDetail, type AssessmentAnalytics, type AttemptDetail } from "@/lib/api/workshop-service";

type GradeRow = Record<string, unknown>;

export function AssessmentInsights({ classId, rows }: { classId?: string; rows: GradeRow[] }) {
  const options = useMemo(() => [...new Map(rows.filter((row) => row.assessmentId).map((row) => [String(row.assessmentId), String(row.assessmentTitle ?? "Assessment")])).entries()].map(([value, label]) => ({ value, label })), [rows]);
  const [choice, setChoice] = useState("");
  const [scope, setScope] = useState<"recorded" | "all">("recorded");
  const [insights, setInsights] = useState<AssessmentAnalytics>();
  const [loadedFor, setLoadedFor] = useState("");
  const [error, setError] = useState("");
  const assessmentId = options.some((option) => option.value === choice) ? choice : options[0]?.value;
  const requestKey = `${classId}:${assessmentId}`;
  const currentInsights = loadedFor === requestKey ? insights : undefined;
  const currentError = loadedFor === requestKey ? error : "";

  useEffect(() => {
    if (!classId || !assessmentId) return;
    let active = true;
    getAssessmentAnalytics(classId, assessmentId)
      .then((result) => { if (active) { setInsights(result); setLoadedFor(requestKey); setError(""); } })
      .catch((reason: Error) => { if (active) { setInsights(undefined); setLoadedFor(requestKey); setError(reason.message); } });
    return () => { active = false; };
  }, [assessmentId, classId, requestKey]);

  if (!classId || !options.length) return null;
  return <section aria-label="Question analytics" className="mt-8 grid gap-4 border-t border-line pt-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1"><h3 className="m-0 text-lg">Question insights</h3><p className="m-0 text-sm text-muted">See which questions students found difficult.</p></div>
      <div className="w-full max-w-xs"><SelectField ariaLabel="Assessment for question insights" options={options} onValueChange={setChoice} value={assessmentId} /></div>
    </div>
    <div aria-label="Attempt scope" className="flex gap-2" role="group">
      {(["recorded", "all"] as const).map((value) => <button aria-pressed={scope === value} className={`min-h-10 rounded-control px-3 text-xs font-semibold ${scope === value ? "bg-signal-green-soft text-copy" : "text-muted hover:bg-raised"}`} key={value} onClick={() => setScope(value)} type="button">{value === "recorded" ? "Recorded attempts" : "All attempts"}</button>)}
    </div>
    {currentError ? <p className="m-0 text-sm text-signal-red" role="alert">{currentError}</p> : null}
    {!currentInsights && !currentError ? <LoadingContent label="Loading question insights" variant="table" /> : null}
    {currentInsights ? <div className="grid gap-2">
      <p className="m-0 text-xs text-muted">{scope === "recorded" ? currentInsights.recordedAttempts : currentInsights.allAttempts} attempts included</p>
      {currentInsights.questions.map((question, index) => {
        const counts = question[scope];
        const total = counts.correct + counts.incorrect;
        return <div className="grid gap-2 rounded-control border border-line bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={question.questionId}>
          <span className="text-sm text-copy"><span className="mr-2 font-mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>{question.prompt}</span>
          <span className="text-xs text-muted">{total ? `${counts.correct} correct · ${counts.incorrect} incorrect` : "No submissions"}</span>
        </div>;
      })}
    </div> : null}
  </section>;
}

export function AttemptDetailDialog({ classId, row, onClose }: { classId?: string; row?: GradeRow; onClose: () => void }) {
  const [detail, setDetail] = useState<AttemptDetail>();
  const [loadedFor, setLoadedFor] = useState("");
  const [error, setError] = useState("");
  const studentId = String(row?.studentId ?? "");
  const assessmentId = String(row?.assessmentId ?? "");
  const requestKey = `${classId}:${assessmentId}:${studentId}`;
  const currentDetail = loadedFor === requestKey ? detail : undefined;
  const currentError = loadedFor === requestKey ? error : "";
  useEffect(() => {
    if (!classId || !row) return;
    let active = true;
    getAttemptDetail(classId, assessmentId, studentId)
      .then((result) => { if (active) { setDetail(result); setLoadedFor(requestKey); setError(""); } })
      .catch((reason: Error) => { if (active) { setDetail(undefined); setLoadedFor(requestKey); setError(reason.message); } });
    return () => { active = false; };
  }, [assessmentId, classId, row, studentId, requestKey]);
  return <Dialog open={Boolean(row)} onOpenChange={(open) => { if (!open) { setDetail(undefined); onClose(); } }} title={`${String(row?.studentName ?? "Student")} · attempts`} description={String(row?.assessmentTitle ?? "Assessment")}>
    {currentError ? <p className="m-0 text-sm text-signal-red" role="alert">{currentError}</p> : null}
    {!currentDetail && !currentError ? <LoadingContent label="Loading attempt details" variant="table" /> : null}
    {currentDetail?.attempts.length === 0 ? <p className="m-0 text-sm text-muted">No submitted attempts yet.</p> : null}
    {currentDetail?.attempts.map((attempt) => <section className="grid gap-3 border-t border-line pt-4" key={attempt.attemptId}>
      <div className="flex flex-wrap justify-between gap-2"><strong>Attempt {attempt.attemptNumber}{attempt.recorded ? " · RECORDED" : ""}</strong><span className="text-sm text-muted">{attempt.score} / {attempt.total} · {new Date(attempt.submittedAt).toLocaleString()}</span></div>
      {attempt.answers.map((answer) => <div className="grid gap-1 text-sm" key={answer.questionId}>
        <strong>{answer.prompt}</strong>
        <span className={answer.correct ? "text-signal-green" : "text-signal-orange"}>Selected: {answer.selectedChoice} · {answer.correct ? "Correct" : "Incorrect"}</span>
        {!answer.correct ? <span className="text-muted">Correct answer: {answer.correctChoice}</span> : null}
      </div>)}
    </section>)}
  </Dialog>;
}
