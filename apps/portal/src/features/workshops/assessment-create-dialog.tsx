import { BookOpenCheck, GraduationCap, Plus } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { StarterTemplatePicker } from "@/features/workshops/starter-template-picker";
import type { AssessmentStarter } from "@/features/workshops/starter-templates";

export function AssessmentCreateDialog({
  busy, error, open, onOpenChange, onCreate,
}: {
  busy: boolean;
  error?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (mode: "practice" | "graded", starter?: AssessmentStarter) => void;
}) {
  return (
    <Dialog
      closeDisabled={busy}
      description="Choose how learner results should behave. You can edit questions and settings after creation."
      onOpenChange={(next) => { if (!busy) onOpenChange(next); }}
      open={open}
      title="Create assessment"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className="grid min-h-20 grid-cols-[36px_minmax(0,1fr)_20px] items-center gap-3 rounded-control border border-line bg-canvas px-3 py-2 text-left hover:border-signal-orange/60 hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange disabled:opacity-50"
          disabled={busy}
          onClick={() => onCreate("practice")}
          type="button"
        >
          <span className="grid size-9 place-items-center rounded-control bg-signal-orange-soft text-signal-orange [&_svg]:size-4"><BookOpenCheck aria-hidden="true" /></span>
          <span className="grid min-w-0 gap-0.5"><strong className="text-xs">PRACTICE</strong><small className="text-[0.65rem] text-muted">Instant feedback</small></span>
          <Plus aria-hidden="true" className="size-4 text-muted" />
        </button>
        <button
          className="grid min-h-20 grid-cols-[36px_minmax(0,1fr)_20px] items-center gap-3 rounded-control border border-line bg-canvas px-3 py-2 text-left hover:border-signal-green/60 hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-green disabled:opacity-50"
          disabled={busy}
          onClick={() => onCreate("graded")}
          type="button"
        >
          <span className="grid size-9 place-items-center rounded-control bg-signal-green-soft text-signal-green [&_svg]:size-4"><GraduationCap aria-hidden="true" /></span>
          <span className="grid min-w-0 gap-0.5"><strong className="text-xs">GRADED</strong><small className="text-[0.65rem] text-muted">Recorded score</small></span>
          <Plus aria-hidden="true" className="size-4 text-muted" />
        </button>
      </div>
      <div className="border-t border-line pt-4">
        <StarterTemplatePicker
          busy={busy}
          onChoose={(starter) => onCreate(starter === "knowledge-check" ? "practice" : "graded", starter)}
          options={[
            { id: "knowledge-check", title: "Knowledge check", description: "Practice · one sample question" },
            { id: "configuration-review", title: "Configuration review", description: "Graded · one sample question" },
          ]}
        />
      </div>
      {error ? <p className="m-0 rounded-control border border-signal-red/60 bg-signal-red-soft p-3 text-sm text-signal-red" role="alert">{error}</p> : null}
    </Dialog>
  );
}
