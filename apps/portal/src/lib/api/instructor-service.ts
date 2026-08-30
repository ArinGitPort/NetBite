import { getPortalClient } from "@/lib/api/client";
import { throwIfServiceError } from "@/lib/api/errors";
import type { InstructorRequestRow } from "@/lib/api/types";

export async function getInstructorRequests(): Promise<InstructorRequestRow[]> {
  const { data, error } = await getPortalClient().from("instructor_requests")
    .select("user_id,display_name,institution,reason,status,requested_at,reviewed_at")
    .order("requested_at", { ascending: false });
  throwIfServiceError(error, "Instructor requests could not be loaded.");
  return (data ?? []) as InstructorRequestRow[];
}
export async function reviewInstructorRequest(userId: string, decision: "approved" | "declined" | "revoked"): Promise<void> {
  const { error } = await getPortalClient().rpc("review_instructor_request", { p_user_id: userId, p_decision: decision });
  throwIfServiceError(error, "The instructor request could not be updated.");
}
