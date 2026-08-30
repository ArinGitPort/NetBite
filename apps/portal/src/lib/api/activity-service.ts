import { getPortalClient } from "@/lib/api/client";
import { throwIfServiceError } from "@/lib/api/errors";
import type { SafeAuditEntry } from "@/lib/api/types";

export async function getSanitizedAuditHistory(): Promise<SafeAuditEntry[]> {
  const { data, error } = await getPortalClient().rpc("get_sanitized_content_audit", { requested_limit: 100 });
  throwIfServiceError(error, "Activity history could not be loaded.");
  return (data ?? []).map((row: Record<string, unknown>) => ({ id: Number(row.id), actionLabel: String(row.action_label), contentLabel: String(row.content_label), administratorName: row.administrator_name ? String(row.administrator_name) : undefined, summary: String(row.summary), occurredAt: String(row.occurred_at) })) as SafeAuditEntry[];
}
