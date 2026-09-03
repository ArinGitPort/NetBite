import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function LessonDetails({
  summary,
  title,
  onChange,
}: {
  summary: string;
  title: string;
  onChange: (patch: { title?: string; summary?: string }) => void;
}) {
  const [open, setOpen] = useState(!title.trim() || !summary.trim());
  const complete = Boolean(title.trim() && summary.trim());
  return (
    <details
      className="group rounded-control border border-line bg-canvas"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-xs font-semibold [&::-webkit-details-marker]:hidden">
        <span className="grid gap-1">
          <span>LESSON DETAILS</span>
          <small className="font-normal text-muted">
            {complete ? "Title and description complete" : "Title and description required"}
          </small>
        </span>
        <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-4 border-t border-line p-4">
        <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
          <span>Lesson title</span>
          <input value={title} onChange={(event) => onChange({ title: event.target.value })} />
        </label>
        <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
          <span>Short description</span>
          <textarea rows={2} value={summary} onChange={(event) => onChange({ summary: event.target.value })} />
        </label>
      </div>
    </details>
  );
}
