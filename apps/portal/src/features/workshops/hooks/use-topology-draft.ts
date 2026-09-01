import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { WorkshopTopology } from "@netbite/workshops/contracts";
import { normalizeWorkshopTopology } from "@netbite/workshops/topology-authoring";

import { useUnsavedDraft } from "@/app/providers/unsaved-changes-provider";
import { useTopologySave } from "@/features/workshops/hooks/use-topology-save";
import type { WorkshopTopologyRow } from "@/lib/api/types";

export function useTopologyDraft({
  row, topology, setTopology, hasErrors, setNotice, clearSelection, onSaved,
}: {
  row: WorkshopTopologyRow;
  topology: WorkshopTopology;
  setTopology: Dispatch<SetStateAction<WorkshopTopology>>;
  hasErrors: boolean;
  setNotice: (value?: string) => void;
  clearSelection: () => void;
  onSaved: (value: WorkshopTopologyRow) => void;
}) {
  const [baseline, setBaseline] = useState(topology);

  useEffect(() => {
    const title = String(row.definition.title ?? "Untitled topology");
    setTopology((current) => current.title === title ? current : { ...current, title });
    setBaseline((current) => current.title === title ? current : { ...current, title });
  }, [row.definition.title, setTopology]);

  const dirty = JSON.stringify(topology) !== JSON.stringify(baseline);
  const handleSaved = (saved: WorkshopTopologyRow) => {
    setBaseline(normalizeWorkshopTopology(saved.definition as unknown as WorkshopTopology));
    onSaved(saved);
  };
  const { save, saving } = useTopologySave({ row, topology, hasErrors, onSaved: handleSaved, setNotice });

  useUnsavedDraft(`workshop-topology:${row.stable_id}`, {
    dirty,
    save,
    discard: () => {
      setTopology(baseline);
      clearSelection();
      setNotice(undefined);
    },
    saveBlockedReason: hasErrors ? "Resolve the topology errors before saving, or discard the unsaved changes." : undefined,
  });

  return { dirty, save, saving };
}
