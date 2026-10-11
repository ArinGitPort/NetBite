import {
  assertObject,
  type JsonObject,
  requiredText,
  ServiceError,
} from "./service-core.ts";
export function sanitizeGradedSettings(value: unknown) {
  assertObject(value, "Graded assessment settings");
  const maximumAttempts = Number(value.maximumAttempts);
  const passingPercentage = Number(value.passingPercentage);
  const gradePolicy = String(value.gradePolicy);
  const feedbackRelease = String(value.feedbackRelease);
  if (
    !Number.isInteger(maximumAttempts) ||
    maximumAttempts < 1 ||
    maximumAttempts > 20 ||
    !Number.isFinite(passingPercentage) ||
    passingPercentage < 0 ||
    passingPercentage > 100 ||
    !["highest", "latest", "first"].includes(gradePolicy) ||
    !["immediate", "final-attempt", "due-date"].includes(feedbackRelease)
  ) {
    throw new ServiceError(
      "INVALID_ASSESSMENT",
      "Correct the graded assessment rules before publishing.",
    );
  }
  const opensAt = value.opensAt ? new Date(String(value.opensAt)) : undefined;
  const dueAt = value.dueAt ? new Date(String(value.dueAt)) : undefined;
  if (
    (opensAt && Number.isNaN(opensAt.valueOf())) ||
    (dueAt && Number.isNaN(dueAt.valueOf())) ||
    (opensAt && dueAt && dueAt <= opensAt) ||
    (feedbackRelease === "due-date" && !dueAt)
  ) {
    throw new ServiceError(
      "INVALID_ASSESSMENT",
      "Correct the assessment opening, due date, and result-release settings.",
    );
  }
  return {
    opensAt: opensAt?.toISOString(),
    dueAt: dueAt?.toISOString(),
    maximumAttempts,
    gradePolicy,
    passingPercentage,
    feedbackRelease,
    shuffleQuestions: Boolean(value.shuffleQuestions),
    shuffleAnswers: Boolean(value.shuffleAnswers),
  };
}

export function publicAssessment(row: JsonObject) {
  const draft = row.draft as JsonObject;
  const mode = String(row.mode);
  const questions = (draft.questions as JsonObject[]).map((question) => {
    const base = {
      id: String(question.id),
      lessonId: question.lessonId ? String(question.lessonId) : undefined,
      prompt: String(question.prompt),
      choices: (question.choices as JsonObject[]).map((choice) => ({
        id: requiredText(choice.id, "Answer choice code", 100),
        label: requiredText(choice.label, "Answer choice", 1000),
      })),
      explanation: mode === "practice" && question.explanation
        ? String(question.explanation).slice(0, 2000)
        : undefined,
    };
    return mode === "practice"
      ? { ...base, correctChoiceId: String(question.correctChoiceId) }
      : base;
  });
  return {
    id: String(row.stable_id),
    title: String(row.title),
    mode,
    instructions: String(draft.instructions ?? ""),
    questions,
    settings: mode === "graded"
      ? sanitizeGradedSettings(row.settings)
      : undefined,
  };
}

export function answerKey(row: JsonObject) {
  const draft = row.draft as JsonObject;
  return Object.fromEntries(
    (draft.questions as JsonObject[]).map((question) => [
      String(question.id),
      String(question.correctChoiceId),
    ]),
  );
}

export async function checksum(value: unknown) {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
