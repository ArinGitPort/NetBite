import { getPortalClient } from "@/lib/api/client";
import { throwIfServiceError } from "@/lib/api/errors";
import type { AdminAccess } from "@/lib/api/types";

export async function getAdminAccess(userId: string): Promise<AdminAccess> {
  const client = getPortalClient();
  const [{ data: admins, error: adminError }, { data: instructors, error: instructorError }] = await Promise.all([
    client.from("content_admins").select("user_id").eq("user_id", userId),
    client.from("instructors").select("user_id").eq("user_id", userId).is("revoked_at", null),
  ]);
  throwIfServiceError(adminError ?? instructorError, "Portal access could not be verified.");
  const accessLevel = admins?.length ? "administrator" : instructors?.length ? "instructor" : "none";
  return { userId, authorized: accessLevel !== "none", accessLevel };
}
