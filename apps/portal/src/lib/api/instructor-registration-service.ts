import { getPortalClient } from "@/lib/api/client";
import { throwIfServiceError } from "@/lib/api/errors";

export type InstructorRequestStatus = "pending" | "approved" | "declined" | "revoked";

export async function createInstructorAccount({
  email,
  password,
  displayName,
  institution,
  emailRedirectTo,
}: {
  email: string;
  password: string;
  displayName: string;
  institution: string;
  emailRedirectTo: string;
}) {
  return getPortalClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: { instructor_registration: true, display_name: displayName, institution },
    },
  });
}

export async function getOwnInstructorRequest(userId: string): Promise<InstructorRequestStatus | null> {
  const { data, error } = await getPortalClient()
    .from("instructor_requests")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  throwIfServiceError(error, "Your instructor request could not be loaded.");
  return (data?.status as InstructorRequestStatus | undefined) ?? null;
}

export async function requestInstructorAccess(displayName: string, institution: string): Promise<void> {
  const { error } = await getPortalClient().rpc("request_instructor_access", {
    p_display_name: displayName.trim(),
    p_institution: institution.trim(),
    p_reason: "",
  });
  throwIfServiceError(error, "Your request could not be submitted. Please try again.");
}
