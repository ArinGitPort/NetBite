import { Trash2 } from "lucide-react";
import type { WorkshopTopologyRow } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog, Dialog } from "@/components/ui/dialog";

export function TopologyDetailsDialog({ row, name, saving, referenceCount, onNameChange, onClose, onSave, onDelete }: {
  row: WorkshopTopologyRow; name: string; saving: boolean; referenceCount: number;
  onNameChange: (name: string) => void; onClose: () => void; onSave: () => void; onDelete: () => void;
}) {
  return <Dialog description="Change the learner-facing name or remove this topology from the current draft. Published versions are not changed." onOpenChange={(open) => { if (!open) onClose(); }} open title="Topology details">
    <label className="grid gap-2 text-xs font-semibold text-copy"><span>Topology name</span><input aria-label="Topology name" autoFocus maxLength={80} onChange={(event) => onNameChange(event.target.value)} placeholder="For example, Three-router static routing" value={name} /><small className="font-normal leading-5 text-muted">Use a short name students and instructors can recognize.</small></label>
    <div className="flex flex-col-reverse justify-end gap-2 border-b border-line pb-5 sm:flex-row"><Button onClick={onClose} tone="outline">CANCEL</Button><Button disabled={!name.trim() || saving} onClick={onSave} tone="primary">{saving ? "SAVING..." : "SAVE NAME"}</Button></div>
    <section className="grid gap-2"><strong className="text-sm text-copy">Delete topology</strong><p className="m-0 text-xs leading-5 text-muted">{referenceCount > 0 ? `This topology is used by ${referenceCount} lesson block${referenceCount === 1 ? "" : "s"}. Remove those Network diagram or Configuration commands blocks before deleting it.` : "Delete this topology from the current draft. Existing published versions remain unchanged."}</p><ConfirmationDialog confirmLabel="DELETE TOPOLOGY" description={`Delete "${String(row.definition.title ?? "Untitled topology")}" from this draft? This action cannot be undone.`} destructive onConfirm={onDelete} title="Delete this topology?" trigger={<Button className="w-fit" disabled={referenceCount > 0} tone="destructive"><Trash2 />DELETE TOPOLOGY</Button>} /></section>
  </Dialog>;
}
