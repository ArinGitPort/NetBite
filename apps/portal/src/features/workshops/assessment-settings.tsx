import { Checkbox } from "@/components/ui/selection";
import { SelectField } from "@/components/ui/select";
import type { WorkshopAssessmentRow } from "@/lib/api/types";

interface AssessmentSettingsProps {
  row: WorkshopAssessmentRow;
  onChange: (patch: Partial<WorkshopAssessmentRow>) => void;
}

export function AssessmentSettings({ row, onChange }: AssessmentSettingsProps) {
  const updateSettings = (patch: Record<string, unknown>) =>
    onChange({ settings: { ...row.settings, ...patch } });

  return (
    <div className="grid gap-5 p-5 max-sm:p-4">
      <section className="grid gap-3" aria-labelledby="assessment-identity">
        <div className="grid gap-1">
          <h3 className="m-0 text-sm" id="assessment-identity">
            Assessment details
          </h3>
          <p className="m-0 text-xs leading-5 text-muted">
            Name the assessment and choose whether it is practice or recorded work.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
            <span>Title</span>
            <input
              placeholder="Example: Static Routing Knowledge Check"
              value={row.title}
              onChange={(event) => onChange({ title: event.target.value })}
            />
          </label>
          <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
            <span>Assessment use</span>
            <SelectField
              allowEmpty={false}
              ariaLabel="Assessment use"
              onValueChange={(mode) =>
                onChange({ mode: mode as WorkshopAssessmentRow["mode"] })
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
          <section className="grid gap-3 border-t border-line pt-5" aria-labelledby="grading-policy">
            <h3 className="m-0 text-sm" id="grading-policy">Grading policy</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
                <span>Maximum attempts</span>
                <input
                  max="20"
                  min="1"
                  type="number"
                  value={Number(row.settings.maximumAttempts ?? 1)}
                  onChange={(event) => updateSettings({ maximumAttempts: Number(event.target.value) })}
                />
              </label>
              <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
                <span>Recorded score</span>
                <SelectField
                  allowEmpty={false}
                  ariaLabel="Recorded score"
                  onValueChange={(gradePolicy) => updateSettings({ gradePolicy })}
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
                  max="100"
                  min="0"
                  type="number"
                  value={Number(row.settings.passingPercentage ?? 80)}
                  onChange={(event) => updateSettings({ passingPercentage: Number(event.target.value) })}
                />
              </label>
              <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
                <span>Release results</span>
                <SelectField
                  allowEmpty={false}
                  ariaLabel="Release results"
                  onValueChange={(feedbackRelease) => updateSettings({ feedbackRelease })}
                  options={[
                    { value: "immediate", label: "Immediately" },
                    { value: "final-attempt", label: "After final attempt" },
                    { value: "due-date", label: "After due date" },
                  ]}
                  placeholder="Choose result release"
                  value={String(row.settings.feedbackRelease ?? "final-attempt")}
                />
              </label>
            </div>
          </section>

          <section className="grid gap-3 border-t border-line pt-5" aria-labelledby="assessment-schedule">
            <h3 className="m-0 text-sm" id="assessment-schedule">Schedule</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DateField
                label="Opening date (optional)"
                value={row.settings.opensAt}
                onChange={(opensAt) => updateSettings({ opensAt })}
              />
              <DateField
                label="Due date (optional)"
                value={row.settings.dueAt}
                onChange={(dueAt) => updateSettings({ dueAt })}
              />
            </div>
          </section>

          <section className="grid gap-3 border-t border-line pt-5" aria-labelledby="student-experience">
            <h3 className="m-0 text-sm" id="student-experience">Student experience</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <ShuffleOption
                checked={Boolean(row.settings.shuffleQuestions)}
                description="Use a different question order for each student."
                id="shuffle-questions"
                label="Shuffle question order"
                onChange={(shuffleQuestions) => updateSettings({ shuffleQuestions })}
              />
              <ShuffleOption
                checked={Boolean(row.settings.shuffleAnswers)}
                description="Use a different answer order for each student."
                id="shuffle-answers"
                label="Shuffle answer order"
                onChange={(shuffleAnswers) => updateSettings({ shuffleAnswers })}
              />
            </div>
          </section>
        </>
      ) : (
        <p className="m-0 border-t border-line pt-5 text-xs leading-6 text-muted">
          Practice assessments allow unlimited attempts, show explanations immediately,
          and do not appear in the gradebook.
        </p>
      )}
    </div>
  );
}

function DateField({ label, value, onChange }: {
  label: string;
  value: unknown;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="grid content-start gap-1.5 text-[0.7rem] font-semibold text-copy">
      <span>{label}</span>
      <input
        type="datetime-local"
        value={String(value ?? "").slice(0, 16)}
        onChange={(event) => onChange(event.target.value ? new Date(event.target.value).toISOString() : undefined)}
      />
    </label>
  );
}

function ShuffleOption({ checked, description, id, label, onChange }: {
  checked: boolean;
  description: string;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-16 items-start gap-3 rounded-control border border-line bg-canvas p-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <label className="grid cursor-pointer gap-1" htmlFor={id}>
        <strong className="text-xs">{label}</strong>
        <span className="text-xs leading-5 text-muted">{description}</span>
      </label>
    </div>
  );
}
