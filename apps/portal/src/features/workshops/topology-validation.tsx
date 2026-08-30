import { AlertTriangle } from "lucide-react";
import type { WorkshopTopology } from "@netbite/workshops/contracts";
import { validateWorkshopTopology } from "@netbite/workshops/contracts";
import { Checkbox } from "@/components/ui/selection";

export function TopologyValidation({ topology, issues, onChange }: {
  topology: WorkshopTopology;
  issues: ReturnType<typeof validateWorkshopTopology>;
  onChange: (topology: WorkshopTopology) => void;
}) {
  if (!issues.length) return null;
  return (
    <section className="grid gap-3 rounded-panel border border-line bg-canvas p-4">
      <div className="grid gap-2">
        {issues.map((issue) => <div className="flex items-start gap-3 rounded-control border border-line bg-raised px-3 py-3" key={`${issue.path}-${issue.message}`}><AlertTriangle aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${issue.severity === "error" ? "text-signal-red" : "text-signal-orange"}`} /><div className="grid min-w-0 gap-1"><strong className="font-mono text-[0.62rem] tracking-[0.08em] text-signal-orange">{issue.severity.toUpperCase()}</strong><span className="text-xs leading-5 text-copy">{issue.message}</span></div></div>)}
      </div>
      {issues.some((issue) => issue.severity === "warning") ? (
        <div className="flex min-h-14 items-start gap-3 rounded-control border border-line bg-sidebar px-4 py-3">
          <Checkbox checked={topology.warningsAcknowledged === true} id="topology-warning-acknowledgment" onCheckedChange={(checked) => onChange({ ...topology, warningsAcknowledged: checked === true })} />
          <label className="grid cursor-pointer gap-1 text-xs" htmlFor="topology-warning-acknowledgment"><strong className="text-copy">Use this as a teaching example</strong><span className="leading-5 text-muted">I reviewed these warnings and intend to publish this configuration.</span></label>
        </div>
      ) : null}
    </section>
  );
}
