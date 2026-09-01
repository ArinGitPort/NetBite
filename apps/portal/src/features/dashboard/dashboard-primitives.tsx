import { ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { NavigationItem } from "@/app/navigation";

export function DashboardQuickAccess({ items, label = "Quick access" }: { items: NavigationItem[]; label?: string }) {
  return (
    <nav aria-label={label} className="mb-5 flex min-w-0 items-center gap-2 overflow-hidden rounded-panel border border-line bg-surface p-2 shadow-panel">
      <span className="shrink-0 px-2 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.11em] text-signal-orange">{label}</span>
      <div className="themed-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {items.map((item) => (
          <Link className="group/link flex min-h-11 shrink-0 items-center gap-2 rounded-control border border-transparent px-3 text-xs font-medium text-muted transition-colors hover:border-line hover:bg-raised hover:text-copy focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal-orange" key={item.id} to={item.path}>
            <item.icon className="size-4 text-signal-green transition-transform group-hover/link:scale-110 motion-reduce:transform-none" />
            <span>{item.label}</span>
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 -translate-x-1 scale-90 text-signal-orange opacity-0 transition-[color,opacity,transform] duration-200 ease-out group-hover/link:translate-x-0.5 group-hover/link:scale-100 group-hover/link:opacity-100 group-focus-visible/link:translate-x-0.5 group-focus-visible/link:scale-100 group-focus-visible/link:opacity-100 motion-reduce:transform-none motion-reduce:transition-none"
            />
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function DashboardMetricCard({ accent = "green", icon: Icon, label, note, value }: {
  accent?: "green" | "orange";
  icon: LucideIcon;
  label: string;
  note: string;
  value: number;
}) {
  const accentStyle = accent === "orange" ? "text-signal-orange" : "text-signal-green";
  return (
    <article className="group relative isolate grid min-h-40 overflow-hidden rounded-panel border border-line bg-surface p-5 shadow-panel transition-colors hover:border-muted">
      <Icon aria-hidden="true" className={`pointer-events-none absolute -bottom-5 right-1 z-0 size-28 rotate-[-8deg] stroke-[1.25] opacity-[var(--nb-metric-icon-opacity)] transition-[opacity,transform] duration-300 group-hover:rotate-[-4deg] group-hover:scale-105 group-hover:opacity-[var(--nb-metric-icon-hover-opacity)] motion-reduce:transform-none ${accentStyle}`} />
      <span className="relative z-10 w-fit font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted">{label}</span>
      <div className="relative z-10 mt-5 grid max-w-[75%] content-end gap-1.5">
        <strong className="text-4xl leading-none tracking-[-0.04em] text-copy">{value}</strong>
        <small className="text-xs leading-5 text-muted">{note}</small>
      </div>
      <span className={`absolute inset-x-0 bottom-0 h-0.5 ${accent === "orange" ? "bg-signal-orange" : "bg-signal-green"}`} />
    </article>
  );
}

export interface DashboardWorkflowItem {
  detail: string;
  icon: LucideIcon;
  number: string;
  title: string;
}

export function DashboardWorkflowPanel({ description, eyebrow, status, steps, title }: {
  description: string;
  eyebrow: string;
  status?: ReactNode;
  steps: DashboardWorkflowItem[];
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-panel border border-line bg-surface shadow-panel">
      <header className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="grid max-w-xl gap-1.5">
          <p className="m-0 font-mono text-[0.62rem] font-semibold tracking-[0.13em] text-signal-orange">{eyebrow}</p>
          <h2 className="m-0 text-lg">{title}</h2>
          <p className="m-0 text-sm leading-6 text-muted">{description}</p>
        </div>
        {status}
      </header>
      <ol className="m-0 grid list-none border-t border-line md:grid-cols-2">
        {steps.map((step, index) => <WorkflowStep final={index === steps.length - 1} key={step.number} {...step} />)}
      </ol>
    </section>
  );
}

function WorkflowStep({ detail, final, icon: Icon, number, title }: DashboardWorkflowItem & { final: boolean }) {
  return (
    <li className="group relative grid min-h-48 gap-5 border-t border-line p-5 first:border-t-0 md:border-l md:[&:nth-child(-n+2)]:border-t-0 md:[&:nth-child(odd)]:border-l-0">
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-control border border-signal-orange/50 bg-signal-orange-soft text-signal-orange"><Icon className="size-4" /></span>
        <span className="font-mono text-[0.65rem] font-semibold tracking-[0.12em] text-muted">STEP {number}</span>
      </div>
      <div className="grid content-start gap-2">
        <h3 className="m-0 text-base">{title}</h3>
        <p className="m-0 text-sm leading-6 text-muted">{detail}</p>
      </div>
      {!final ? <ArrowRight className="absolute bottom-5 right-5 size-4 text-line transition-colors group-hover:text-signal-orange" /> : <CheckCircle2 className="absolute bottom-5 right-5 size-4 text-signal-green" />}
    </li>
  );
}
