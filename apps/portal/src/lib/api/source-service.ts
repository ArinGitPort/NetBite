import { getPortalClient } from "@/lib/api/client";
import { throwIfServiceError } from "@/lib/api/errors";
import type { SourceRow } from "@/lib/api/types";

export async function getSources(): Promise<SourceRow[]> {
  const { data, error } = await getPortalClient().from("content_sources").select("id,lesson_id,label,url,notes").order("created_at", { ascending: false });
  throwIfServiceError(error);
  return (data ?? []) as SourceRow[];
}
function parsePublicSourceUrl(raw: string): URL {
  let parsed: URL;
  try { parsed = new URL(raw.trim()); } catch { throw new Error("Enter a complete HTTPS source address."); }
  const host = parsed.hostname.toLowerCase();
  const privateHost = host === "localhost" || host === "::1" || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || privateHost) throw new Error("Use a public HTTPS source address without embedded credentials.");
  return parsed;
}
export async function saveSource(source: Partial<SourceRow>): Promise<void> {
  const url = parsePublicSourceUrl(source.url ?? "").toString();
  const payload = { lesson_id: source.lesson_id || null, label: source.label?.trim(), url, notes: source.notes ?? "" };
  const query = source.id ? getPortalClient().from("content_sources").update(payload).eq("id", source.id) : getPortalClient().from("content_sources").insert(payload);
  const { error } = await query;
  throwIfServiceError(error);
}
export async function deleteSource(id: string): Promise<void> {
  const { error } = await getPortalClient().from("content_sources").delete().eq("id", id);
  throwIfServiceError(error);
}
