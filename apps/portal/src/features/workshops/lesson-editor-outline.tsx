import { AlertCircle, CheckCircle2 } from "lucide-react";

import type { WorkshopLessonBlock } from "@netbite/workshops/contracts";
import {
  getLessonBlockLabel,
  getLessonBlockStatus,
  getLessonBlockSummary,
} from "@/features/workshops/lesson-block-definitions";
import { cn } from "@/lib/class-names";

export function LessonEditorOutline({
  activeId,
  blocks,
  onSelect,
}: {
  activeId?: string;
  blocks: WorkshopLessonBlock[];
  onSelect: (id: string) => void;
}) {
  return (
    <div aria-label="Lesson outline" className="grid content-start gap-1" role="list">
      {blocks.map((block, index) => {
        const status = getLessonBlockStatus(block);
        return (
          <div key={block.id} role="listitem">
            <button
              aria-current={activeId === block.id ? "true" : undefined}
              className={cn(
                "grid min-h-[62px] w-full min-w-0 grid-cols-[30px_minmax(0,1fr)_18px] items-start gap-2 rounded-control border px-2.5 py-2 text-left transition-colors",
                activeId === block.id
                  ? "border-line bg-raised text-copy"
                  : "border-transparent text-muted hover:bg-raised/70 hover:text-copy",
              )}
              onClick={() => onSelect(block.id)}
              type="button"
            >
              <span className="pt-0.5 font-mono text-[0.62rem] text-signal-orange">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="grid min-w-0 gap-1">
                <strong className="truncate text-[0.68rem] uppercase">{getLessonBlockLabel(block.type)}</strong>
                <small className="truncate text-[0.62rem] text-muted">{getLessonBlockSummary(block)}</small>
              </span>
              {status.complete ? (
                <CheckCircle2 aria-label="Complete" className="size-4 text-signal-green" />
              ) : (
                <AlertCircle aria-label={status.label} className="size-4 text-signal-orange" />
              )}
            </button>
          </div>
        );
      })}
      {!blocks.length ? (
        <p className="m-0 p-4 text-center text-xs leading-5 text-muted">Add a content block to build the outline.</p>
      ) : null}
    </div>
  );
}
