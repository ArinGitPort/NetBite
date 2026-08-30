import type { WorkshopTopologyRow } from "@/lib/api/types";

export function defaultTopology(workshopId: string): WorkshopTopologyRow {
  const stableId = `topology-${crypto.randomUUID()}`;
  return { id: "", workshop_id: workshopId, stable_id: stableId, definition: { schemaVersion: 2, id: stableId, title: "Lesson topology", accessibilityDescription: "A read-only network topology created by the instructor.", devices: [], links: [] } };
}
