import { CheckCircle2, ChevronDown, LayoutTemplate, LoaderCircle } from "lucide-react";

type TemplateOption<T extends string> = {
  id: T;
  title: string;
  description: string;
};

export function StarterTemplatePicker<T extends string>({
  options,
  busy = false,
  feedback,
  onChoose,
}: {
  options: readonly TemplateOption<T>[];
  busy?: boolean;
  feedback?: { message: string; tone: "success" | "error" };
  onChoose: (id: T) => void;
}) {
  return (
    <div className="grid gap-2">
      <details aria-busy={busy} className="group overflow-hidden rounded-control border border-line bg-canvas">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 px-3 text-left text-xs font-semibold text-copy transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal-orange [&::-webkit-details-marker]:hidden">
          <LayoutTemplate aria-hidden="true" className="size-4 shrink-0 text-signal-orange" />
          <span className="flex-1">START FROM TEMPLATE</span>
          <ChevronDown aria-hidden="true" className="size-4 text-muted transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="grid gap-2 border-t border-line p-2">
          <p className="m-0 px-1 text-[0.68rem] leading-4 text-muted">Ready-to-edit starting points</p>
          {options.map((option) => (
            <button
              className="group/option grid min-h-14 gap-0.5 rounded-control border border-line bg-sidebar px-3 py-2 text-left transition-colors hover:border-signal-orange/60 hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange disabled:cursor-wait disabled:opacity-50"
              disabled={busy}
              key={option.id}
              onClick={() => onChoose(option.id)}
              type="button"
            >
              <span className="text-xs font-semibold text-copy group-hover/option:text-signal-orange">{option.title}</span>
              <span className="text-[0.68rem] leading-4 text-muted">{option.description}</span>
            </button>
          ))}
        </div>
      </details>
      {busy ? (
        <p className="m-0 flex items-center gap-2 px-2 py-1.5 text-xs text-muted" role="status">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
          Creating draft…
        </p>
      ) : feedback ? (
        <p
          className={`m-0 flex items-start gap-2 rounded-control px-2 py-1.5 text-xs leading-5 ${feedback.tone === "error" ? "text-signal-red" : "text-signal-green"}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.tone === "success" ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : null}
          <span>{feedback.message}</span>
        </p>
      ) : null}
    </div>
  );
}
