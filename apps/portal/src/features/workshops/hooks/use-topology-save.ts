import { useState } from "react";
import type { WorkshopTopology } from "@netbite/workshops/contracts";
import * as workshopApi from "@/lib/api/workshop-service";
import type { WorkshopTopologyRow } from "@/lib/api/types";

export function useTopologySave({ row, topology, hasErrors, onSaved, setNotice }: {
  row: WorkshopTopologyRow; topology: WorkshopTopology; hasErrors: boolean;
  onSaved: (value: WorkshopTopologyRow) => void; setNotice: (value?: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (saving) return;
    if (hasErrors) return setNotice("Resolve the topology errors before saving.");
    setSaving(true); setNotice(undefined);
    try {
      const saved = await workshopApi.saveWorkshopTopology({ ...row, definition: topology as unknown as Record<string, unknown> });
      onSaved(saved); setNotice("Topology saved.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "The topology could not be saved."); }
    finally { setSaving(false); }
  };
  return { save, saving };
}
