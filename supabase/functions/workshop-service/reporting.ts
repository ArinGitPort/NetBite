import { adminJson } from "../_shared/admin-http.ts";
import { adminClient } from "../_shared/supabase.ts";
import {
  type JsonObject,
  requireInstructor,
  ServiceError,
} from "./service-core.ts";
export async function gradebook(request: Request, body: JsonObject) {
  const user = await requireInstructor(request);
  const classId = String(body.classId ?? "");
  const { data: classRow } = await adminClient()
    .from("workshop_classes")
    .select("id,workshop_id,version_id")
    .eq("id", classId)
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (!classRow) {
    throw new ServiceError("CLASS_NOT_FOUND", "The class was not found.", 404);
  }
  const db = adminClient();
  const [
    { data: enrollments },
    { data: grades },
    { data: attempts },
    { data: version },
  ] = await Promise.all([
    db
      .from("workshop_enrollments")
      .select("student_id,joined_at")
      .eq("class_id", classId)
      .is("left_at", null),
    db.from("workshop_grades").select("*").eq("class_id", classId),
    db
      .from("workshop_attempts")
      .select("student_id,assessment_id,submitted_at,late")
      .eq("class_id", classId),
    db
      .from("workshop_versions")
      .select("package")
      .eq("id", classRow.version_id)
      .single(),
  ]);
  const students = (enrollments ?? []).map((entry) => entry.student_id);
  const { data: profiles } = students.length
    ? await db.from("profiles").select("id,display_name").in("id", students)
    : { data: [] };
  const names = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.display_name || "Student",
    ]),
  );
  const assessments = (
    ((version?.package as JsonObject)?.assessments as JsonObject[]) ?? []
  ).filter((item) => item.mode === "graded");
  const rows = students.flatMap((studentId) =>
    assessments.map((assessment) => {
      const grade = (grades ?? []).find(
        (item) =>
          item.student_id === studentId && item.assessment_id === assessment.id,
      );
      const matchingAttempts = (attempts ?? []).filter(
        (item) =>
          item.student_id === studentId && item.assessment_id === assessment.id,
      );
      const latest = matchingAttempts.sort(
        (a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at),
      )[0];
      const passing = Number(
        (assessment.settings as JsonObject)?.passingPercentage ?? 80,
      );
      return {
        studentId,
        studentName: names.get(studentId) || "Student",
        assessmentId: String(assessment.id),
        assessmentTitle: String(assessment.title),
        recordedScore: grade?.recorded_score,
        total: grade?.total ?? (assessment.questions as unknown[])?.length ?? 0,
        percentage: grade?.percentage == null
          ? undefined
          : Number(grade.percentage),
        attempts: matchingAttempts.length,
        submittedAt: latest?.submitted_at,
        status: !grade
          ? "missing"
          : latest?.late
          ? "late"
          : Number(grade.percentage) >= passing
          ? "passed"
          : "needs-review",
      };
    })
  );
  return adminJson(request, { rows });
}

export async function instructorAssessmentContext(
  request: Request,
  body: JsonObject,
) {
  const user = await requireInstructor(request);
  const classId = String(body.classId ?? "");
  const assessmentId = String(body.assessmentId ?? "");
  const db = adminClient();
  const { data: classRow, error: classError } = await db.from(
    "workshop_classes",
  )
    .select("id,version_id").eq("id", classId).eq("instructor_id", user.id)
    .maybeSingle();
  if (classError || !classRow) {
    throw new ServiceError("CLASS_NOT_FOUND", "The class was not found.", 404);
  }
  const [
    { data: version, error: versionError },
    { data: keyRow, error: keyError },
  ] = await Promise.all([
    db.from("workshop_versions").select("package").eq("id", classRow.version_id)
      .single(),
    db.from("workshop_assessment_keys").select("answer_key").eq(
      "version_id",
      classRow.version_id,
    ).eq("assessment_id", assessmentId).maybeSingle(),
  ]);
  if (versionError || keyError) {
    throw new ServiceError(
      "RESULT_UNAVAILABLE",
      "Assessment data could not be loaded.",
      503,
    );
  }
  const assessment = (((version?.package as JsonObject)?.assessments as
    | JsonObject[]
    | undefined) ?? [])
    .find((item) => item.id === assessmentId && item.mode === "graded");
  if (!assessment || !keyRow) {
    throw new ServiceError(
      "ASSESSMENT_NOT_FOUND",
      "The assessment was not found.",
      404,
    );
  }
  return {
    db,
    classId,
    assessmentId,
    assessment,
    key: keyRow.answer_key as Record<string, string>,
  };
}

export async function assessmentAnalytics(request: Request, body: JsonObject) {
  const { db, classId, assessmentId, assessment, key } =
    await instructorAssessmentContext(request, body);
  const recordedIds = new Set<string>();
  let gradeCursor: string | undefined;
  while (true) {
    let query = db.from("workshop_grades").select("recorded_attempt_id")
      .eq("class_id", classId).eq("assessment_id", assessmentId)
      .order("recorded_attempt_id").limit(500);
    if (gradeCursor) query = query.gt("recorded_attempt_id", gradeCursor);
    const { data: gradeBatch, error: gradeError } = await query;
    if (gradeError) throw gradeError;
    for (const grade of gradeBatch ?? []) {
      recordedIds.add(grade.recorded_attempt_id);
    }
    if (!gradeBatch?.length || gradeBatch.length < 500) break;
    gradeCursor = gradeBatch.at(-1)!.recorded_attempt_id;
  }
  const questions = ((assessment.questions as JsonObject[]) ?? []).map((
    question,
  ) => ({
    questionId: String(question.id),
    prompt: String(question.prompt),
    all: { correct: 0, incorrect: 0 },
    recorded: { correct: 0, incorrect: 0 },
  }));
  const byId = new Map(
    questions.map((question) => [question.questionId, question]),
  );
  let cursor: string | undefined;
  let allAttempts = 0;
  let recordedAttempts = 0;
  while (true) {
    let query = db.from("workshop_attempts").select("id,answers")
      .eq("class_id", classId).eq("assessment_id", assessmentId).order("id")
      .limit(500);
    if (cursor) query = query.gt("id", cursor);
    const { data: batch, error } = await query;
    if (error) throw error;
    for (const attempt of batch ?? []) {
      allAttempts += 1;
      const recorded = recordedIds.has(attempt.id);
      if (recorded) recordedAttempts += 1;
      const answers = attempt.answers as Record<string, unknown>;
      for (const [questionId, correctChoiceId] of Object.entries(key)) {
        const question = byId.get(questionId);
        if (!question) continue;
        const outcome: "correct" | "incorrect" =
          answers[questionId] === correctChoiceId ? "correct" : "incorrect";
        question.all[outcome] += 1;
        if (recorded) question.recorded[outcome] += 1;
      }
    }
    if (!batch?.length || batch.length < 500) break;
    cursor = batch.at(-1)!.id;
  }
  return adminJson(request, {
    assessmentId,
    assessmentTitle: assessment.title,
    questions,
    allAttempts,
    recordedAttempts,
  });
}

export async function attemptDetail(request: Request, body: JsonObject) {
  const { db, classId, assessmentId, assessment, key } =
    await instructorAssessmentContext(request, body);
  const studentId = String(body.studentId ?? "");
  const [
    { data: enrollment, error: enrollmentError },
    { data: attempts, error: attemptError },
    { data: grade, error: gradeError },
  ] = await Promise.all([
    db.from("workshop_enrollments").select("student_id").eq("class_id", classId)
      .eq("student_id", studentId).maybeSingle(),
    db.from("workshop_attempts").select(
      "id,attempt_number,submitted_at,score,total,percentage,late,answers",
    )
      .eq("class_id", classId).eq("assessment_id", assessmentId).eq(
        "student_id",
        studentId,
      )
      .order("attempt_number", { ascending: false }).limit(20),
    db.from("workshop_grades").select("recorded_attempt_id").eq(
      "class_id",
      classId,
    )
      .eq("assessment_id", assessmentId).eq("student_id", studentId)
      .maybeSingle(),
  ]);
  if (enrollmentError || attemptError || gradeError) {
    throw new ServiceError(
      "RESULT_UNAVAILABLE",
      "Attempts could not be loaded.",
      503,
    );
  }
  if (!enrollment) {
    throw new ServiceError(
      "STUDENT_NOT_FOUND",
      "The student is not enrolled in this class.",
      404,
    );
  }
  const questions = (assessment.questions as JsonObject[]) ?? [];
  return adminJson(request, {
    assessmentTitle: assessment.title,
    attempts: (attempts ?? []).map((attempt) => ({
      attemptId: attempt.id,
      attemptNumber: attempt.attempt_number,
      submittedAt: attempt.submitted_at,
      score: attempt.score,
      total: attempt.total,
      percentage: attempt.percentage,
      late: attempt.late,
      recorded: attempt.id === grade?.recorded_attempt_id,
      answers: questions.map((question) => {
        const choices = (question.choices as JsonObject[]) ?? [];
        const selectedId = String(
          (attempt.answers as Record<string, unknown>)[String(question.id)] ??
            "",
        );
        return {
          questionId: question.id,
          prompt: question.prompt,
          selectedChoice: choices.find((choice) =>
            choice.id === selectedId
          )?.label ?? "No answer",
          correctChoice: choices.find((choice) =>
            choice.id === key[String(question.id)]
          )?.label ?? "Unknown",
          correct: selectedId === key[String(question.id)],
        };
      }),
    })),
  });
}

export async function classRoster(request: Request, body: JsonObject) {
  const user = await requireInstructor(request);
  const classId = String(body.classId ?? "");
  const db = adminClient();
  const { data: classRow, error: classError } = await db
    .from("workshop_classes")
    .select("id")
    .eq("id", classId)
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (classError || !classRow) {
    throw new ServiceError("CLASS_NOT_FOUND", "The class was not found.", 404);
  }

  const { data: enrollments, error: enrollmentError } = await db
    .from("workshop_enrollments")
    .select("student_id,joined_at")
    .eq("class_id", classId)
    .is("left_at", null)
    .order("joined_at", { ascending: false });
  if (enrollmentError) throw enrollmentError;

  const studentIds = (enrollments ?? []).map((entry) => entry.student_id);
  const { data: profiles, error: profileError } = studentIds.length
    ? await db.from("profiles").select("id,display_name").in("id", studentIds)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const names = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      String(profile.display_name ?? "").trim() || "Student",
    ]),
  );
  const students = (enrollments ?? []).map((entry) => ({
    displayName: names.get(entry.student_id) ?? "Student",
    joinedAt: entry.joined_at,
  }));
  return adminJson(request, { students });
}
