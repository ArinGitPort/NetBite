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
    METHOD_NOT_ALLOWED: "This request is not supported.",
    CHANGELOG_REQUIRED: "Describe what changed before publishing.",
    INVALID_APP_VERSION: "Use an Android app version such as 1.0.0.",
    REQUEST_ID_REQUIRED: "Start a new publish request and try again.",
    VALIDATION_FAILED: "Resolve the listed content issues before publishing.",
    INVALID_RESTORE_REQUEST: "Choose a published version and try again.",
    RELEASE_NOT_FOUND: "That published version is no longer available.",
    ADMIN_SERVICE_ERROR: "The service could not complete the request. Try again.",
  };
  if (structured?.code && approved[structured.code]) {
    return { code: structured.code, message: approved[structured.code], ...(structured.requestId ? { requestId: structured.requestId } : {}) };
  }
  const code = candidate?.code ?? "SERVICE_UNAVAILABLE";
  if (code === "23505") return { code, message: "That record already exists. Use a different permanent code or position." };
  if (code === "42501" || code === "PGRST301") return { code, message: "Your administrator access could not be verified. Sign in again." };
  return { code, message: fallback };
}

export function throwIfServiceError(error: unknown, fallback?: string): void {
  if (!error) return;
  const safe = mapAdminServiceError(error, fallback);
  throw Object.assign(new Error(safe.message), safe);
}
