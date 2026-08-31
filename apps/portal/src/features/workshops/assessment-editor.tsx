import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssessmentMobilePreview } from "@/features/workshops/assessment-mobile-preview";
import { AssessmentQuestionEditor } from "@/features/workshops/assessment-question-editor";
import { AssessmentSettings } from "@/features/workshops/assessment-settings";
import type { AssessmentDraft } from "@/features/workshops/assessment-types";
import type { AssessmentQuestionWorkspace } from "@/features/workshops/hooks/use-assessment-question-workspace";
import * as workshopApi from "@/lib/api/workshop-service";
import type { WorkshopAssessmentRow } from "@/lib/api/types";

type AssessmentView = "questions" | "settings" | "preview";

export function AssessmentEditor({
  row,
  onChange,
  onSaved,
  onDelete,
  questionWorkspace,
}: {
  row: WorkshopAssessmentRow;
  onChange: (row: WorkshopAssessmentRow) => void;
  onDelete: () => Promise<void>;
  onSaved: () => void;
  questionWorkspace: AssessmentQuestionWorkspace;
}) {
  const [view, setView] = useState<AssessmentView>("questions");
  const [pendingAction, setPendingAction] = useState<"save" | "delete">();
  const draft = row.draft as AssessmentDraft;
  const { addQuestion, moveQuestion, navigation, questions, removeQuestion, updateQuestion } =
    questionWorkspace;

  const update = (patch: Partial<WorkshopAssessmentRow>) =>
    onChange({ ...row, ...patch });
  return (
    <div className="grid min-w-0 gap-4 bg-surface p-5 text-[0.8rem] max-sm:p-4">
      <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 border-b border-line pb-4">
        <div className="grid min-w-0 gap-1">
          <strong className="break-words text-sm">{row.title || "UNTITLED ASSESSMENT"}</strong>
          <span className="text-xs leading-5 text-muted">
            Build questions, configure delivery, and check the student view.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={view} onValueChange={(value) => setView(value as AssessmentView)}>
            <TabsList aria-label="Assessment workspace view" className="flex-wrap">
              <TabsTrigger value="questions" onClick={() => setView("questions")}>QUESTIONS</TabsTrigger>
              <TabsTrigger value="settings" onClick={() => setView("settings")}>SETTINGS</TabsTrigger>
              <TabsTrigger value="preview" onClick={() => setView("preview")}>PREVIEW</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            aria-label="Add question"
            onClick={() => {
              setView("questions");
              addQuestion();
            }}
            tone="secondary"
          >
            <Plus aria-hidden="true" />
            ADD QUESTION
          </Button>
          <Button
            disabled={Boolean(pendingAction)}
            onClick={() => {
              setPendingAction("save");
              void workshopApi.saveWorkshopAssessment(row)
                .then(onSaved)
                .finally(() => setPendingAction(undefined));
            }}
            tone="primary"
          >
            <Save aria-hidden="true" />
            {pendingAction === "save" ? "SAVING..." : "SAVE ASSESSMENT"}
          </Button>
        </div>
      </header>

      {view === "questions" ? (
        <div className="grid min-h-[460px] min-w-0 content-start overflow-hidden rounded-panel border border-line">
          {navigation.selectedQuestion ? (
            <AssessmentQuestionEditor
              autoFocusPrompt={navigation.focusQuestionId === navigation.selectedQuestion.id}
              index={navigation.selectedIndex}
              key={navigation.selectedQuestion.id}
              onChange={(patch) => updateQuestion(navigation.selectedIndex, patch)}
              onMove={(direction) =>
                moveQuestion(navigation.selectedIndex, navigation.selectedIndex + direction)
              }
              onNext={() => {
                const nextQuestion = questions[navigation.selectedIndex + 1];
                if (nextQuestion) navigation.select(nextQuestion.id);
              }}
              onPrevious={() => {
                const previousQuestion = questions[navigation.selectedIndex - 1];
                if (previousQuestion) navigation.select(previousQuestion.id);
              }}
              onPromptFocused={navigation.clearFocus}
              onRemove={() => removeQuestion(navigation.selectedIndex)}
              question={navigation.selectedQuestion}
              total={questions.length}
            />
          ) : (
            <EmptyQuestionEditor />
          )}
        </div>
      ) : null}

      {view === "settings" ? (
        <div className="grid rounded-panel border border-line">
          <AssessmentSettings row={row} onChange={update} />
          <section className="flex flex-wrap items-center justify-between gap-4 border-t border-line p-5">
            <div className="grid max-w-xl gap-1">
              <strong className="text-xs text-copy">Delete this assessment</strong>
              <span className="text-xs leading-5 text-muted">
                Remove it from the current draft. Published versions and recorded grades remain unchanged.
              </span>
            </div>
            <ConfirmationDialog
              confirmLabel="DELETE ASSESSMENT"
              description={`This permanently removes “${row.title || "Untitled assessment"}” from the current draft. Published versions and previously recorded grades are not changed.`}
              destructive
              onConfirm={async () => {
                setPendingAction("delete");
                try {
                  await onDelete();
                } finally {
                  setPendingAction(undefined);
                }
              }}
              title="Delete this assessment?"
              trigger={
                <Button disabled={Boolean(pendingAction)} tone="destructive">
                  <Trash2 aria-hidden="true" />
                  {pendingAction === "delete" ? "DELETING..." : "DELETE ASSESSMENT"}
                </Button>
              }
            />
          </section>
        </div>
      ) : null}

      {view === "preview" ? <AssessmentMobilePreview draft={draft} row={row} /> : null}
    </div>
  );
}

function EmptyQuestionEditor() {
  return (
    <div className="grid min-h-60 place-items-center content-center gap-3 p-6 text-center">
      <div className="grid max-w-md gap-2">
        <strong className="text-sm">Add the first question</strong>
        <p className="m-0 text-xs leading-6 text-muted">
          Select ADD QUESTION above. Each question needs a prompt, at least two
          answers, and one selected correct answer.
        </p>
      </div>
    </div>
  );
}
