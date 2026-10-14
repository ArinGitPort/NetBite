import { ClipboardCheck, Plus } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { AssessmentCreateDialog } from "@/features/workshops/assessment-create-dialog";
import { AssessmentEditor } from "@/features/workshops/assessment-editor";
import { AssessmentQuestionNavigator } from "@/features/workshops/assessment-question-navigator";
import { useAssessmentQuestionWorkspace } from "@/features/workshops/hooks/use-assessment-question-workspace";
import { assessmentStarterDraft, type AssessmentStarter } from "@/features/workshops/starter-templates";
import * as workshopApi from "@/lib/api/workshop-service";
import type { WorkshopAssessmentRow, WorkshopRow } from "@/lib/api/types";

interface WorkspaceProps {
  workshop: WorkshopRow;
  assessments: WorkshopAssessmentRow[];
  selectedId?: string;
  onAssessmentsChange: (updater: (rows: WorkshopAssessmentRow[]) => WorkshopAssessmentRow[]) => void;
  onSelect: (id: string) => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}

export function WorkshopAssessmentsWorkspace(props: WorkspaceProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const createPending = useRef(false);
  const selected = props.assessments.find((row) => row.id === props.selectedId);

  const create = async (mode: "practice" | "graded", starter?: AssessmentStarter) => {
    if (createPending.current || props.workshop.archived) return;
    createPending.current = true;
    setCreating(true);
    setCreateError(undefined);
    props.onError("");
    try {
      const row = await workshopApi.createWorkshopAssessment(
        props.workshop.id, mode, starter ? assessmentStarterDraft(starter) : undefined,
      );
      props.onAssessmentsChange((value) => [...value, row]);
      props.onSelect(row.id);
      setCreateOpen(false);
      if (starter) {
        const title = starter === "knowledge-check" ? "Knowledge check" : "Configuration review";
        props.onNotice(`${title} template created and opened. Replace the sample question, then save.`);
      } else {
        props.onNotice(`${mode === "practice" ? "Practice" : "Graded"} assessment created and opened.`);
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The assessment could not be created.";
      setCreateError(message);
      props.onError(message);
    } finally {
      createPending.current = false;
      setCreating(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="grid gap-1">
          <h2 className="m-0 text-lg font-bold">{selected?.title ?? "Assessments"}</h2>
          <p className="m-0 text-sm text-muted">
            {selected ? "Edit this assessment, or choose another from the collection list." : "Choose an assessment from the collection list or create one."}
          </p>
        </div>
        <Button disabled={props.workshop.archived} onClick={() => setCreateOpen(true)} tone="secondary">
          <Plus /> NEW ASSESSMENT
        </Button>
      </header>
      {selected ? <SelectedAssessmentWorkspace {...props} selected={selected} /> : (
        <div className="grid min-h-60 place-items-center content-center gap-3 text-center text-muted [&>p]:m-0 [&>p]:max-w-lg">
          <ClipboardCheck aria-hidden="true" />
          <p>Add a practice or graded assessment.</p>
        </div>
      )}
      <AssessmentCreateDialog
        busy={creating}
        error={createError}
        onCreate={(mode, starter) => void create(mode, starter)}
        onOpenChange={(open) => { setCreateOpen(open); if (open) setCreateError(undefined); }}
        open={createOpen}
      />
    </div>
  );
}

function SelectedAssessmentWorkspace({ selected, ...props }: WorkspaceProps & { selected: WorkshopAssessmentRow }) {
  const changeSelected = (row: WorkshopAssessmentRow) =>
    props.onAssessmentsChange((value) => value.map((item) => item.id === row.id ? row : item));
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
    <div className="grid min-w-0 gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Questions in selected assessment" className="min-w-0 self-start border-b border-line pb-4 xl:border-b-0 xl:border-r xl:pr-4">
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
      </nav>
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
