import { Cable } from "lucide-react";

import type { WorkshopLinkPurpose, WorkshopTopology, WorkshopTopologyLink } from "@netbite/workshops/contracts";
import { deriveWorkshopLinkContext, deriveWorkshopLinkPurpose, hasWorkshopLinkPurposeConflict } from "@netbite/workshops/topology-authoring";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select";

type Endpoint = { deviceName: string; interfaceName: string };
interface ConnectionWorkspaceProps {
  topology: WorkshopTopology;
  selectedLink?: WorkshopTopologyLink;
  selectedLinkId?: string;
  endpoint: (link: WorkshopTopologyLink, side: "from" | "to") => Endpoint;
  onSelect: (id?: string) => void;
  onEditEndpoints: (id: string) => void;
  onPurposeChange: (purpose: WorkshopLinkPurpose) => void;
  onUpdate: (patch: Partial<WorkshopTopologyLink>) => void;
  onRemove: (link: WorkshopTopologyLink) => void;
}

const purposeOptions: Array<[WorkshopLinkPurpose, string, string]> = [
  ["basic", "Basic Ethernet link", "A physical link without routed or VLAN context."],
  ["routed", "Routed network", "Show a network such as 192.168.10.0/24."],
  ["access", "Access VLAN", "Connect one endpoint to a single VLAN."],
  ["trunk", "VLAN trunk", "Carry multiple allowed VLANs."],
];

export function TopologyConnectionWorkspace(props: ConnectionWorkspaceProps) {
  const { topology, selectedLink } = props;
  const activePurpose = selectedLink ? selectedLink.purpose ?? deriveWorkshopLinkPurpose(selectedLink, topology) : undefined;
  return (
    <section className="grid grid-cols-[280px_minmax(0,1fr)] overflow-hidden rounded-panel border border-line max-lg:grid-cols-1">
      <nav aria-label="Topology connections" className="grid content-start gap-2 border-r border-line bg-sidebar p-4 max-lg:border-b max-lg:border-r-0">
        <strong className="mb-1 font-mono text-[0.68rem] tracking-[0.08em] text-copy">CONNECTIONS</strong>
        {topology.links.map((link) => {
          const from = props.endpoint(link, "from");
          const to = props.endpoint(link, "to");
          const context = deriveWorkshopLinkContext(topology, link);
          return (
            <button className={`grid min-h-16 gap-1 rounded-control border px-3 py-2 text-left ${props.selectedLinkId === link.id ? "border-signal-orange bg-signal-orange-soft text-copy" : "border-transparent text-muted hover:border-line hover:bg-raised"}`} key={link.id} onClick={() => props.onSelect(link.id)} type="button">
              <span className="text-xs font-semibold text-copy">{from.deviceName} {from.interfaceName} — {to.deviceName} {to.interfaceName}</span>
              <span className="font-mono text-[0.62rem] text-muted">{context.label} · {(link.state ?? "up").toUpperCase()}</span>
            </button>
          );
        })}
      </nav>
      {selectedLink ? (
        <div className="grid gap-5 p-5">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
            <div className="grid gap-1">
              <span className="font-mono text-[0.62rem] tracking-[0.08em] text-signal-orange">SELECTED CONNECTION</span>
              <strong className="text-base text-copy">{props.endpoint(selectedLink, "from").deviceName} {props.endpoint(selectedLink, "from").interfaceName} — {props.endpoint(selectedLink, "to").deviceName} {props.endpoint(selectedLink, "to").interfaceName}</strong>
              {hasWorkshopLinkPurposeConflict(selectedLink) ? <span className="text-xs text-[#f1ae78]">Needs attention: choose one connection purpose.</span> : null}
            </div>
            <Button onClick={() => props.onEditEndpoints(selectedLink.id)} size="compact" tone="outline"><Cable />Change endpoints</Button>
          </header>
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-xs font-semibold text-copy">What does this connection carry?</legend>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {purposeOptions.map(([purpose, title, description]) => {
                const selected = activePurpose === purpose && (!hasWorkshopLinkPurposeConflict(selectedLink) || selectedLink.purpose === purpose);
                return <button aria-pressed={selected} className={`grid min-h-20 gap-1 rounded-control border p-3 text-left ${selected ? "border-signal-green bg-signal-green-soft" : "border-line bg-canvas hover:border-signal-orange"}`} key={purpose} onClick={() => props.onPurposeChange(purpose)} type="button"><strong className="text-xs text-copy">{title}</strong><span className="text-[0.68rem] leading-4 text-muted">{description}</span></button>;
              })}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            {activePurpose === "basic" ? <ConnectionField label="Learner-facing caption (optional)" hint="Use a short description only when it helps explain the diagram."><input placeholder="WAN link" value={selectedLink.label ?? ""} onChange={(event) => props.onUpdate({ label: event.target.value || undefined })} /></ConnectionField> : null}
            {activePurpose === "routed" ? <ConnectionField label="Network and prefix" hint="Example: 10.0.12.0/30"><input placeholder="192.168.10.0/24" value={selectedLink.network ?? ""} onChange={(event) => props.onUpdate({ network: event.target.value || undefined })} /></ConnectionField> : null}
            {activePurpose === "access" ? <ConnectionField label="Access VLAN ID" hint="One untagged VLAN for this access connection."><input max="4094" min="1" placeholder="10" type="number" value={selectedLink.accessVlan ?? ""} onChange={(event) => props.onUpdate({ accessVlan: event.target.value ? Number(event.target.value) : undefined })} /></ConnectionField> : null}
            {activePurpose === "trunk" ? <ConnectionField label="Allowed VLAN IDs" hint="Separate multiple VLAN IDs with commas."><input placeholder="10, 20" value={selectedLink.trunkVlans?.join(", ") ?? ""} onChange={(event) => props.onUpdate({ trunkVlans: event.target.value.split(",").map((item) => Number(item.trim())).filter((value) => Number.isInteger(value) && value > 0) })} /></ConnectionField> : null}
            <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">Connection state<SelectField allowEmpty={false} ariaLabel="Connection state" onValueChange={(state) => props.onUpdate({ state: state as "up" | "down" })} options={[{ value: "up", label: "Up" }, { value: "down", label: "Down" }]} placeholder="Choose connection state" value={selectedLink.state ?? "up"} /><small className="font-normal leading-5 text-muted">Use Down only for an intentional fault or troubleshooting example.</small></label>
          </div>
          <section className="mt-1 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <div><strong className="block text-xs text-copy">Remove this connection</strong><span className="text-[0.68rem] text-muted">This removes only the cable, not either device.</span></div>
            <Button onClick={() => props.onRemove(selectedLink)} tone="destructive">Remove connection</Button>
          </section>
        </div>
      ) : <p className="p-5 text-sm text-muted">Select a connection to add its learner-facing network or VLAN information.</p>}
    </section>
  );
}

function ConnectionField({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">{label}{children}<small className="font-normal leading-5 text-muted">{hint}</small></label>;
}
