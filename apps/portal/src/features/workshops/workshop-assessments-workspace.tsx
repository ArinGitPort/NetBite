import { ClipboardCheck, Plus } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
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
    });

  return (
    <nav className="themed-scrollbar grid min-w-0 content-start gap-2 overflow-y-auto rounded-panel border border-line bg-sidebar p-3 max-xl:max-h-[520px]">
      <div className="mb-2 grid gap-2 border-b border-line pb-3">
        <span className="px-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted">
          Create assessment
        </span>
        <Button className="w-full" onClick={() => create("practice")} tone="secondary">
          <Plus aria-hidden="true" />NEW PRACTICE
        </Button>
        <Button className="w-full" onClick={() => create("graded")} tone="primary">
          <Plus aria-hidden="true" />NEW GRADED
        </Button>
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
