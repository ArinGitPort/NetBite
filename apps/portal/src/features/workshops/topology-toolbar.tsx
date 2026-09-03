import { Cable, Monitor, Network, Plus, RotateCcw, Router, Save, Server, Sparkles } from "lucide-react";

import type { WorkshopTopologyDevice } from "@netbite/workshops/contracts";
import { Button } from "@/components/ui/button";
import { LoadingButtonContent } from "@/components/ui/loading-content";

const devices: Array<{ type: WorkshopTopologyDevice["type"]; label: string }> = [
  { type: "pc", label: "PC" }, { type: "switch", label: "SWITCH" },
  { type: "router", label: "ROUTER" }, { type: "server", label: "SERVER" },
];
function DeviceIcon({ type }: { type: WorkshopTopologyDevice["type"] }) {
  if (type === "router") return <Router />;
  if (type === "server") return <Server />;
  if (type === "switch") return <Network />;
  return <Monitor />;
}
export function TopologyToolbar({ count, dirty, saving, connectionMode, canReset, onSave, onAdd, onTemplate, onReset, onToggleConnection }: {
  count: number; dirty: boolean; saving: boolean; connectionMode: boolean; canReset: boolean;
  onSave: () => void; onAdd: (type: WorkshopTopologyDevice["type"]) => void;
  onTemplate: () => void; onReset: () => void; onToggleConnection: () => void;
}) {
  return (
    <div className="grid gap-3 border-b border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid min-w-[150px] gap-1"><strong>READ-ONLY TOPOLOGY</strong><span className={dirty ? "text-[0.65rem] text-signal-orange" : "text-[0.65rem] text-muted"} role="status">{dirty ? "UNSAVED CHANGES" : "ALL CHANGES SAVED"} / {count} OF 12 DEVICES</span></div>
        <Button disabled={saving || !dirty} onClick={onSave} tone="primary">{saving ? <LoadingButtonContent label="SAVING..." /> : <><Save />SAVE TOPOLOGY</>}</Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-label="Add a device" className="flex flex-wrap items-center gap-1.5 rounded-control border border-line bg-canvas p-1.5" role="group">
          {devices.map(({ type, label }) => <button aria-label={`Add ${label} to topology`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] border border-transparent bg-raised px-3 text-[0.68rem] font-semibold text-copy transition-colors hover:border-signal-orange/60 hover:bg-signal-orange-soft hover:text-signal-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-orange disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4" disabled={count >= 12} key={type} onClick={() => onAdd(type)} title={count >= 12 ? "This topology already has 12 devices." : `Add ${label}`} type="button"><DeviceIcon type={type} />{label}<Plus aria-hidden="true" className="ml-0.5 size-3! text-muted" /></button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onTemplate} tone="outline"><Sparkles />USE NETWORK TEMPLATE</Button>
          <Button disabled={!canReset} onClick={onReset} tone="ghost"><RotateCcw />RESET VIEW</Button>
          <Button disabled={count < 2} onClick={onToggleConnection} tone={connectionMode ? "primary" : "secondary"}><Cable />{connectionMode ? "DONE CONNECTING" : "CONNECT DEVICES"}</Button>
        </div>
      </div>
    </div>
  );
}
