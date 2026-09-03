import type { WorkshopLessonBlock } from "@netbite/workshops/contracts";

import { lessonBlockOptions } from "@/features/workshops/lesson-block-definitions";

export function LessonBlockPicker({ onAdd }: {
  onAdd: (type: WorkshopLessonBlock["type"]) => void;
}) {
  return (
    <section aria-labelledby="add-content-block" className="grid gap-3 border-y border-line py-5">
      <div className="grid gap-1">
        <strong className="text-xs" id="add-content-block">ADD A CONTENT BLOCK</strong>
        <span className="text-xs leading-5 text-muted">
          Choose what you want to place next in this lesson.
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {lessonBlockOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              className="grid min-h-[68px] grid-cols-[36px_minmax(0,1fr)] items-center gap-3 rounded-control border border-line bg-canvas px-3 py-2 text-left transition-[border-color,background-color,transform] hover:-translate-y-px hover:border-signal-orange/60 hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange"
              key={option.type}
              onClick={() => onAdd(option.type)}
              type="button"
            >
              <span className="grid size-9 place-items-center rounded-control bg-signal-orange-soft text-signal-orange [&_svg]:size-4"><Icon aria-hidden="true" /></span>
              <span className="grid min-w-0 gap-0.5">
                <strong className="text-xs text-copy">{option.label}</strong>
                <small className="text-[0.65rem] leading-4 text-muted">{option.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
