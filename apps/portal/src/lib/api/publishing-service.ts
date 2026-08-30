import { getPortalClient } from "@/lib/api/client";
import { throwIfServiceError } from "@/lib/api/errors";
import type { ReleaseRow } from "@/lib/api/types";

export async function validateRelease() {
  const { data, error } = await getPortalClient().functions.invoke("validate-content-release", { body: {} });
  throwIfServiceError(error);
  return data as { valid: boolean; issues: Array<{ area: string; message: string }>; totals: Record<string, number> };
}
export async function publishRelease(changelog: string, minimumAppVersion: string, requestId: string) {
  const { data, error } = await getPortalClient().functions.invoke("publish-content-release", { body: { changelog, minimumAppVersion, requestId } });
  throwIfServiceError(error);
  if (data?.error) throwIfServiceError(data.error, "The curriculum could not be published.");
  return data;
}
export async function getReleases(): Promise<ReleaseRow[]> {
  const { data, error } = await getPortalClient().from("content_releases").select("id,release_version,schema_version,minimum_app_version,changelog,checksum,published_at,rollback_of").order("release_version", { ascending: false });
  throwIfServiceError(error);
  return (data ?? []) as ReleaseRow[];
}
export async function rollbackRelease(releaseId: string, requestId: string) {
  const { data, error } = await getPortalClient().functions.invoke("rollback-content-release", { body: { releaseId, requestId } });
  throwIfServiceError(error);
  if (data?.error) throwIfServiceError(data.error, "The previous version could not be restored.");
  return data;
}
