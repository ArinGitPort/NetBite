import { BookOpenCheck, ClipboardCheck, GraduationCap, Plus } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { AssessmentEditor } from "@/features/workshops/assessment-editor";
import { AssessmentQuestionNavigator } from "@/features/workshops/assessment-question-navigator";
import { useAssessmentQuestionWorkspace } from "@/features/workshops/hooks/use-assessment-question-workspace";
import * as workshopApi from "@/lib/api/workshop-service";
import type { WorkshopAssessmentRow, WorkshopRow } from "@/lib/api/types";

interface WorkspaceProps {
  workshop: WorkshopRow;
  assessments: WorkshopAssessmentRow[];
  selectedId?: string;
  onAssessmentsChange: (
    updater: (rows: WorkshopAssessmentRow[]) => WorkshopAssessmentRow[],
  ) => void;
  onSelect: (id: string) => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}

export function WorkshopAssessmentsWorkspace(props: WorkspaceProps) {
  const selected = props.assessments.find((row) => row.id === props.selectedId);
  return selected ? (
    <SelectedAssessmentWorkspace {...props} selected={selected} />
  ) : (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
      <AssessmentList {...props} />
      <AssessmentEmptyState />
    </div>
  );
}

function SelectedAssessmentWorkspace({ selected, ...props }: WorkspaceProps & {
  selected: WorkshopAssessmentRow;
}) {
  const changeSelected = (row: WorkshopAssessmentRow) =>
    props.onAssessmentsChange((value) =>
      value.map((item) => (item.id === row.id ? row : item)),
    );
  const questionWorkspace = useAssessmentQuestionWorkspace(selected, changeSelected);
  const { navigation } = questionWorkspace;
  const deleteSelected = async () => {
    const selectedIndex = props.assessments.findIndex((row) => row.id === selected.id);
    try {
      await workshopApi.deleteWorkshopAssessment(selected.id);
      const remaining = props.assessments.filter((row) => row.id !== selected.id);
      props.onAssessmentsChange(() => remaining);
      props.onSelect(remaining[Math.min(selectedIndex, remaining.length - 1)]?.id ?? "");
      props.onNotice("Assessment deleted from the current draft.");
    } catch (reason) {
      const error = reason instanceof Error ? reason : new Error("The assessment could not be deleted.");
      props.onError(error.message);
      throw error;
    }
  };

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
      <AssessmentList {...props} selectedId={selected.id}>
        <AssessmentQuestionNavigator
          onMove={questionWorkspace.moveQuestion}
          onPageChange={questionWorkspace.changePage}
          onSelect={navigation.select}
          page={navigation.page}
          pageCount={navigation.pageCount}
          pageQuestions={navigation.pageQuestions}
          pageStart={navigation.pageStart}
          selectedId={navigation.selectedQuestion?.id}
          total={questionWorkspace.questions.length}
        />
      </AssessmentList>
      <AssessmentEditor
        key={selected.id}
        onChange={changeSelected}
        onDelete={deleteSelected}
        onSaved={() => props.onNotice("Assessment saved.")}
        questionWorkspace={questionWorkspace}
        row={selected}
      />
    </div>
  );
}

function AssessmentList({ children, ...props }: WorkspaceProps & { children?: ReactNode }) {
  const create = (mode: "practice" | "graded") =>
    void workshopApi.createWorkshopAssessment(props.workshop.id, mode).then((row) => {
      props.onAssessmentsChange((value) => [...value, row]);
      props.onSelect(row.id);
    }).catch((reason: unknown) => props.onError(
      reason instanceof Error ? reason.message : "The assessment could not be created.",
    ));

  return (
    <nav className="themed-scrollbar grid min-w-0 content-start gap-2 overflow-y-auto rounded-panel border border-line bg-sidebar p-3 max-xl:max-h-[520px]">
      <div className="mb-2 grid gap-2.5 border-b border-line pb-4">
        <div className="grid gap-1 px-1">
          <span className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-copy">Create assessment</span>
          <small className="text-[0.65rem] leading-4 text-muted">Choose how learner results should behave.</small>
        </div>
        <button
          aria-label="Create practice assessment"
          className="group grid min-h-[68px] grid-cols-[36px_minmax(0,1fr)_20px] items-center gap-3 rounded-control border border-line bg-canvas px-3 py-2 text-left transition-[border-color,background-color,transform] hover:-translate-y-px hover:border-signal-orange/60 hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange"
          onClick={() => create("practice")}
          type="button"
        >
          <span className="grid size-9 place-items-center rounded-control bg-signal-orange-soft text-signal-orange [&_svg]:size-4"><BookOpenCheck aria-hidden="true" /></span>
          <span className="grid min-w-0 gap-0.5"><strong className="text-xs text-copy">PRACTICE</strong><small className="text-[0.63rem] leading-4 text-muted">Instant feedback</small></span>
          <Plus aria-hidden="true" className="size-4 text-muted transition-transform group-hover:rotate-90 group-hover:text-signal-orange" />
        </button>
        <button
          aria-label="Create graded assessment"
          className="group grid min-h-[68px] grid-cols-[36px_minmax(0,1fr)_20px] items-center gap-3 rounded-control border border-line bg-canvas px-3 py-2 text-left transition-[border-color,background-color,transform] hover:-translate-y-px hover:border-signal-green/60 hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-green"
          onClick={() => create("graded")}
          type="button"
        >
          <span className="grid size-9 place-items-center rounded-control bg-signal-green-soft text-signal-green [&_svg]:size-4"><GraduationCap aria-hidden="true" /></span>
          <span className="grid min-w-0 gap-0.5"><strong className="text-xs text-copy">GRADED</strong><small className="text-[0.63rem] leading-4 text-muted">Recorded score</small></span>
          <Plus aria-hidden="true" className="size-4 text-muted transition-transform group-hover:rotate-90 group-hover:text-signal-green" />
        </button>
      </div>
      {props.assessments.map((assessment) => (
        <Fragment key={assessment.id}>
          <button
            className={`grid min-h-14 min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-3 rounded-control border px-3 text-left ${assessment.id === props.selectedId ? "border-line bg-raised text-copy" : "border-transparent text-muted hover:bg-raised"}`}
            onClick={() => props.onSelect(assessment.id)}
            type="button"
          >
            <span className="grid size-9 place-items-center rounded-control border border-line bg-canvas text-muted [&_svg]:size-4">
              <ClipboardCheck aria-hidden="true" />
            </span>
            <span className="grid min-w-0 gap-1">
              <span className="block break-words font-semibold">{assessment.title}</span>
              <small className="block leading-5 text-muted">
                {assessment.mode === "graded" ? "Recorded in gradebook" : "Practice only"}
              </small>
            </span>
          </button>
          {assessment.id === props.selectedId ? children : null}
        </Fragment>
      ))}
    </nav>
  );
}

function AssessmentEmptyState() {
  return (
    <div className="grid min-h-60 place-items-center content-center gap-3 text-center text-muted [&>p]:m-0 [&>p]:max-w-lg">
      <ClipboardCheck aria-hidden="true" />
      <p>Add a practice or graded assessment.</p>
    </div>
  );
}
