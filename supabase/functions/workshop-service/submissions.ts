import { adminJson, requestId } from "../_shared/admin-http.ts";
import { adminClient } from "../_shared/supabase.ts";
import {
  assertObject,
  type JsonObject,
  ServiceError,
  signedInUser,
} from "./service-core.ts";
export function shouldReleaseFeedback(
  settings: JsonObject,
  attemptNumber: number,
  submittedAt: Date,
) {
  const release = String(settings.feedbackRelease ?? "final-attempt");
  if (release === "immediate") return true;
  if (release === "final-attempt") {
    return attemptNumber >= Number(settings.maximumAttempts ?? 1);
  }
  const dueAt = settings.dueAt ? new Date(String(settings.dueAt)) : undefined;
  return Boolean(dueAt && submittedAt >= dueAt);
}

export async function submitAssessment(request: Request, body: JsonObject) {
  const user = await signedInUser(request);
  const classId = String(body.classId ?? "");
  const assessmentId = String(body.assessmentId ?? "");
  const requestKey = String(body.requestId ?? "");
  const answers = body.answers;
  if (!/^[0-9a-f-]{36}$/i.test(requestKey)) {
    throw new ServiceError(
      "INVALID_REQUEST",
      "The submission could not be identified. Try again.",
    );
  }
  assertObject(answers, "Answers");
  const db = adminClient();
  const { data: enrollment } = await db
    .from("workshop_enrollments")
    .select("class_id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .is("left_at", null)
    .maybeSingle();
  if (!enrollment) {
    throw new ServiceError(
      "ENROLLMENT_REQUIRED",
      "Join this class before submitting an assessment.",
      403,
    );
  }
  const { data: classRow } = await db
    .from("workshop_classes")
    .select("version_id,archived")
    .eq("id", classId)
    .maybeSingle();
  if (!classRow) {
    throw new ServiceError("CLASS_NOT_FOUND", "The class was not found.", 404);
  }
  const { data: versionRow } = await db
    .from("workshop_versions")
    .select("package")
    .eq("id", classRow.version_id)
    .single();
  const assessment = (
    (versionRow?.package as JsonObject)?.assessments as JsonObject[] | undefined
  )?.find((item) => item.id === assessmentId);
  if (!assessment || assessment.mode !== "graded") {
    throw new ServiceError(
      "ASSESSMENT_NOT_FOUND",
      "The graded assessment was not found.",
      404,
    );
  }
  const settings = assessment.settings as JsonObject;
  const now = new Date();
  if (settings.opensAt && now < new Date(String(settings.opensAt))) {
    throw new ServiceError(
      "ASSESSMENT_NOT_OPEN",
      "This assessment is not open yet.",
    );
  }
  const maximumAttempts = Number(settings.maximumAttempts ?? 1);
  if (
    !Number.isInteger(maximumAttempts) ||
    maximumAttempts < 1 ||
    maximumAttempts > 20
  ) {
    throw new ServiceError(
      "INVALID_SETTINGS",
      "The instructor must correct this assessment before it can be submitted.",
    );
  }
  const { data: keyRow } = await db
    .from("workshop_assessment_keys")
    .select("answer_key,explanations")
    .eq("version_id", classRow.version_id)
    .eq("assessment_id", assessmentId)
    .single();
  if (!keyRow) {
    throw new ServiceError(
      "ASSESSMENT_NOT_READY",
      "The instructor must republish this assessment before it can accept submissions.",
    );
  }
  const key = keyRow.answer_key as Record<string, string>;
  const questionIds = Object.keys(key);
  if (
    Object.keys(answers).length !== questionIds.length ||
    Object.keys(answers).some((questionId) => !questionIds.includes(questionId))
  ) {
    throw new ServiceError(
      "INVALID_ANSWERS",
      "Answer every question in this assessment version before submitting.",
    );
  }
  const score = questionIds.filter(
    (questionId) => answers[questionId] === key[questionId],
  ).length;
  const total = questionIds.length;
  const percentage = Math.round((score / total) * 10000) / 100;
  const late = Boolean(
    settings.dueAt && now > new Date(String(settings.dueAt)),
  );
  const policy = String(settings.gradePolicy ?? "highest");
  const { data: inserted, error } = await db.rpc("record_workshop_submission", {
    p_request_id: requestKey,
    p_student_id: user.id,
    p_class_id: classId,
    p_version_id: classRow.version_id,
    p_assessment_id: assessmentId,
    p_answers: answers,
    p_score: score,
    p_total: total,
    p_percentage: percentage,
    p_passed: percentage >= Number(settings.passingPercentage ?? 80),
    p_late: late,
    p_maximum_attempts: maximumAttempts,
    p_grade_policy: policy,
    p_submitted_at: now.toISOString(),
  });
  if (error) {
    if (error.message.includes("ATTEMPT_LIMIT")) {
      throw new ServiceError(
        "ATTEMPT_LIMIT",
        "You have used every available attempt.",
      );
    }
    if (error.message.includes("ENROLLMENT_REQUIRED")) {
      throw new ServiceError(
        "ENROLLMENT_REQUIRED",
        "Join this class before submitting an assessment.",
        403,
      );
    }
    throw error;
  }
  const attempt = inserted as JsonObject;
  const feedbackReleased = shouldReleaseFeedback(
    settings,
    Number(attempt.attempt_number),
    now,
  );
  return adminJson(
    request,
    formatSubmission(
      attempt,
      feedbackReleased,
      feedbackReleased ? key : undefined,
      feedbackReleased ? keyRow.explanations : undefined,
    ),
  );
}

export async function assessmentStatus(request: Request, body: JsonObject) {
  const user = await signedInUser(request);
  const classId = String(body.classId ?? "");
  const assessmentId = String(body.assessmentId ?? "");
  const db = adminClient();
  const { data: enrollment } = await db
    .from("workshop_enrollments")
    .select("class_id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .is("left_at", null)
    .maybeSingle();
  if (!enrollment) {
    throw new ServiceError(
      "ENROLLMENT_REQUIRED",
      "Join this class before viewing assessment results.",
      403,
    );
  }
  const { data: classRow } = await db
    .from("workshop_classes")
    .select("version_id")
    .eq("id", classId)
    .single();
  if (!classRow) {
    throw new ServiceError("CLASS_NOT_FOUND", "The class was not found.", 404);
  }
  const { data: versionRow } = await db
    .from("workshop_versions")
    .select("package")
    .eq("id", classRow.version_id)
    .single();
  if (!versionRow) {
    throw new ServiceError(
      "ASSESSMENT_NOT_FOUND",
      "The workshop version was not found.",
      404,
    );
  }
  const assessment = (
    ((versionRow.package as JsonObject).assessments as JsonObject[]) ?? []
  ).find((item) => item.id === assessmentId && item.mode === "graded");
  if (!assessment) {
    throw new ServiceError(
      "ASSESSMENT_NOT_FOUND",
      "The graded assessment was not found.",
      404,
    );
  }
  const { data: attempt } = await db
    .from("workshop_attempts")
    .select("*")
    .eq("class_id", classId)
    .eq("assessment_id", assessmentId)
    .eq("student_id", user.id)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!attempt) return adminJson(request, { submitted: false });
  const settings = assessment.settings as JsonObject;
  const feedbackReleased = shouldReleaseFeedback(
    settings,
    Number(attempt.attempt_number),
    new Date(),
  );
  const { data: keyRow } = feedbackReleased
    ? await db
      .from("workshop_assessment_keys")
      .select("answer_key,explanations")
      .eq("version_id", classRow.version_id)
      .eq("assessment_id", assessmentId)
      .single()
    : { data: undefined };
  return adminJson(request, {
    submitted: true,
    result: formatSubmission(
      attempt,
      feedbackReleased,
      feedbackReleased ? keyRow?.answer_key : undefined,
      feedbackReleased ? keyRow?.explanations : undefined,
    ),
  });
}

export function formatSubmission(
  row: JsonObject,
  feedbackReleased: boolean,
  key?: Record<string, string>,
  explanations?: Record<string, string>,
) {
  return {
    attemptId: row.id,
    assessmentId: row.assessment_id,
    attemptNumber: row.attempt_number,
    submittedAt: row.submitted_at,
    late: row.late,
    score: row.score,
    total: row.total,
    percentage: row.percentage,
    passed: row.passed,
    feedbackReleased,
    answers: key
      ? Object.entries(key).map(([questionId, correctChoiceId]) => ({
        questionId,
        correctChoiceId,
        explanation: explanations?.[questionId],
      }))
      : undefined,
  };
}
