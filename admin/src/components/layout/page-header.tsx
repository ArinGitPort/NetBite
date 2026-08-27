import type { ReactNode } from "react";

export function PageHeader({ label, title, description, actions }: { label: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-center">
      <div className="max-w-[780px]">
        <p className="mb-2.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-signal-orange">{label}</p>
        <h1 className="mb-2 text-[clamp(1.8rem,3vw,2.7rem)] font-bold tracking-[-0.035em] text-copy">{title}</h1>
        <p className="m-0 max-w-[720px] leading-7 text-muted">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3 sm:justify-end">{actions}</div> : null}
    </header>
  );
}
