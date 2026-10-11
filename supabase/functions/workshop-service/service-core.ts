import {
  adminJson,
  requestId,
  safeAdminFailure,
} from "../_shared/admin-http.ts";
import { adminClient, userClient } from "../_shared/supabase.ts";
export type JsonObject = Record<string, unknown>;

export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function safeError(request: Request, error: unknown, id: string) {
  if (error instanceof ServiceError) {
    return adminJson(
      request,
      { error: { code: error.code, message: error.message, requestId: id } },
      error.status,
    );
  }
  console.error(`[workshop-service:${id}]`, error);
  return safeAdminFailure(
    request,
    id,
    "The workshop service could not complete this request. Try again.",
    500,
  );
}

export async function signedInUser(request: Request) {
  const { data, error } = await userClient(request).auth.getUser();
  if (error || !data.user) {
    throw new ServiceError("AUTH_REQUIRED", "Sign in to continue.", 401);
  }
  return data.user;
}

export async function requireInstructor(request: Request) {
  const user = await signedInUser(request);
  const { data, error } = await adminClient()
    .from("instructors")
    .select("user_id")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) {
    throw new ServiceError(
      "INSTRUCTOR_REQUIRED",
      "An approved instructor account is required.",
      403,
    );
  }
  return user;
}

export async function requireOwnedWorkshop(userId: string, workshopId: string) {
  const { data, error } = await adminClient()
    .from("workshops")
    .select("id,title,description,archived,current_version_id")
    .eq("id", workshopId)
    .eq("instructor_id", userId)
    .maybeSingle();
  if (error || !data) {
    throw new ServiceError(
      "WORKSHOP_NOT_FOUND",
      "The workshop was not found.",
      404,
    );
  }
  return data;
}

export function assertObject(
  value: unknown,
  label: string,
): asserts value is JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ServiceError("INVALID_CONTENT", `${label} is incomplete.`);
  }
}

export function assertQuestions(value: unknown, assessmentTitle: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ServiceError(
      "INVALID_ASSESSMENT",
      `${assessmentTitle} needs at least one question.`,
    );
  }
  const ids = new Set<string>();
  for (const question of value) {
    assertObject(question, "Question");
    const id = String(question.id ?? "");
    const choices = question.choices;
    if (
      !id ||
      ids.has(id) ||
      !String(question.prompt ?? "").trim() ||
      !Array.isArray(choices) ||
      choices.length < 2
    ) {
      throw new ServiceError(
        "INVALID_ASSESSMENT",
        `${assessmentTitle} contains an incomplete question.`,
      );
    }
    ids.add(id);
    const choiceIds = new Set(
      choices.map((choice) => String((choice as JsonObject)?.id ?? "")),
    );
    if (
      choiceIds.size !== choices.length ||
      !choiceIds.has(String(question.correctChoiceId ?? ""))
    ) {
      throw new ServiceError(
        "INVALID_ASSESSMENT",
        `${assessmentTitle} has an invalid correct answer.`,
      );
    }
  }
}

export function requiredText(value: unknown, label: string, maximum = 4000) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maximum) {
    throw new ServiceError(
      "INVALID_CONTENT",
      `${label} is required and must be shorter than ${maximum} characters.`,
    );
  }
  return text;
}

export function safePublicImageUrl(value: unknown) {
  let url: URL;
  try {
    url = new URL(String(value ?? ""));
  } catch {
    throw new ServiceError(
      "INVALID_IMAGE",
      "Every lesson image needs a valid HTTPS address.",
    );
  }
  const hostname = url.hostname.toLowerCase();
  const privateIpv4 =
    /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      hostname,
    );
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    privateIpv4
  ) {
    throw new ServiceError(
      "INVALID_IMAGE",
      "Lesson images must use a safe public HTTPS address.",
    );
  }
  return url.toString();
}
