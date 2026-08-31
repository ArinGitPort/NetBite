import type { SafeAdminError } from "@/lib/api/types";

export function mapAdminServiceError(
  value: unknown,
  fallback = "The action could not be completed.",
): SafeAdminError {
  const candidate = value as { code?: string; context?: { body?: { error?: SafeAdminError } }; error?: SafeAdminError } | undefined;
  const structured = candidate?.context?.body?.error ?? candidate?.error;
  const approved: Record<string, string> = {
    AUTH_REQUIRED: "Sign in to continue.",
    ADMIN_REQUIRED: "This account does not have administrator access.",
    INSTRUCTOR_REQUIRED: "This account does not have active instructor access.",
    METHOD_NOT_ALLOWED: "This request is not supported.",
    CHANGELOG_REQUIRED: "Describe what changed before publishing.",
    CLASS_NOT_FOUND: "This class could not be found or is no longer accessible.",
    INVALID_APP_VERSION: "Use an Android app version such as 1.0.0.",
    REQUEST_ID_REQUIRED: "Start a new publish request and try again.",
    VALIDATION_FAILED: "Resolve the listed content issues before publishing.",
    INVALID_RESTORE_REQUEST: "Choose a published version and try again.",
    RELEASE_NOT_FOUND: "That published version is no longer available.",
    ADMIN_SERVICE_ERROR: "The service could not complete the request. Try again.",
    INVALID_ASSESSMENT: "Complete every assessment question and its required settings before publishing.",
    INVALID_CONTENT: "Complete the required workshop content before publishing.",
    INVALID_IMAGE: "Correct the lesson image information before publishing.",
    INVALID_LESSON: "Complete the required lesson information before publishing.",
    INVALID_REQUEST: "Start a new publishing request and try again.",
    INVALID_TOPOLOGY: "Correct the malformed topology information before publishing.",
    LESSON_REQUIRED: "Add and complete at least one lesson before publishing.",
    TOPOLOGY_WARNING_REVIEW_REQUIRED: "Review and acknowledge the topology warnings before publishing.",
    WORKSHOP_ARCHIVED: "Restore this lesson collection before publishing it.",
    WORKSHOP_NOT_FOUND: "This lesson collection could not be found or is no longer accessible.",
  };
  const contentValidationCodes = new Set([
    "INVALID_ASSESSMENT",
    "INVALID_CONTENT",
    "INVALID_IMAGE",
    "INVALID_LESSON",
    "INVALID_TOPOLOGY",
    "LESSON_REQUIRED",
    "TOPOLOGY_WARNING_REVIEW_REQUIRED",
  ]);
  if (
    structured?.code &&
    contentValidationCodes.has(structured.code) &&
    typeof structured.message === "string" &&
    structured.message.trim()
  ) {
    return {
      code: structured.code,
      message: structured.message.trim(),
      ...(structured.requestId ? { requestId: structured.requestId } : {}),
    };
  }
  if (structured?.code && approved[structured.code]) {
    return { code: structured.code, message: approved[structured.code], ...(structured.requestId ? { requestId: structured.requestId } : {}) };
  }
  const code = candidate?.code ?? "SERVICE_UNAVAILABLE";
  if (code === "23505") return { code, message: "That record already exists. Use a different permanent code or position." };
  if (code === "42501" || code === "PGRST301") return { code, message: "Your administrator access could not be verified. Sign in again." };
  return { code, message: fallback };
}

export async function throwIfFunctionError(
  error: unknown,
  fallback?: string,
): Promise<void> {
  if (!error) return;
  const context = (error as { context?: unknown } | undefined)?.context;
  if (typeof Response !== "undefined" && context instanceof Response) {
    const payload = await context.clone().json().catch(() => undefined) as
      | { error?: SafeAdminError }
      | undefined;
    if (payload?.error) throwIfServiceError({ error: payload.error }, fallback);
  }
  throwIfServiceError(error, fallback);
}

export function throwIfServiceError(error: unknown, fallback?: string): void {
  if (!error) return;
  const safe = mapAdminServiceError(error, fallback);
  throw Object.assign(new Error(safe.message), safe);
}
