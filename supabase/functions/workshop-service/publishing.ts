import { adminJson, requestId } from "../_shared/admin-http.ts";
import { adminClient } from "../_shared/supabase.ts";
import {
  assertObject,
  assertQuestions,
  type JsonObject,
  requiredText,
  requireInstructor,
  requireOwnedWorkshop,
  ServiceError,
} from "./service-core.ts";
import { sanitizeNamedLesson } from "./lesson-validation.ts";
import { sanitizeTopology } from "./topology-validation.ts";
import {
  answerKey,
  checksum,
  publicAssessment,
} from "./assessment-validation.ts";
export async function publishWorkshop(
  request: Request,
  body: JsonObject,
  id: string,
) {
  const user = await requireInstructor(request);
  const workshopId = String(body.workshopId ?? "");
  const publishRequestId = String(body.requestId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(publishRequestId)) {
    throw new ServiceError(
      "INVALID_REQUEST",
      "Start a new publish request and try again.",
    );
  }
  const workshop = await requireOwnedWorkshop(user.id, workshopId);
  if (workshop.archived) {
    throw new ServiceError(
      "WORKSHOP_ARCHIVED",
      "Restore the workshop before publishing it.",
    );
  }
  const db = adminClient();
  const [
    lessonResult,
    topologyResult,
    assessmentResult,
    flashcardResult,
    profileResult,
    versionResult,
  ] = await Promise.all([
    db
      .from("workshop_lessons")
      .select("stable_id,position,draft")
      .eq("workshop_id", workshopId)
      .eq("archived", false)
      .order("position"),
    db
      .from("workshop_topologies")
      .select("stable_id,definition")
      .eq("workshop_id", workshopId)
      .order("stable_id"),
    db
      .from("workshop_assessments")
      .select("stable_id,title,mode,draft,settings")
      .eq("workshop_id", workshopId)
      .eq("archived", false)
      .order("stable_id"),
    db
      .from("workshop_flashcards")
      .select("stable_id,lesson_stable_id,position,draft")
      .eq("workshop_id", workshopId)
      .eq("archived", false)
      .order("position"),
    db.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    db
      .from("workshop_versions")
      .select("version")
      .eq("workshop_id", workshopId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  for (
    const result of [
      lessonResult,
      topologyResult,
      assessmentResult,
      flashcardResult,
    ]
  ) {
    if (result.error) throw result.error;
  }
  const lessons = (lessonResult.data ?? []).map((row) =>
    sanitizeNamedLesson(row as unknown as JsonObject)
  );
  if (!lessons.length) {
    throw new ServiceError(
      "LESSON_REQUIRED",
      "Add at least one lesson before publishing.",
    );
  }
  const lessonIds = new Set(lessons.map((lesson) => String(lesson.id)));
  const topologies = (topologyResult.data ?? []).map((row) =>
    sanitizeTopology(row as unknown as JsonObject)
  );
  const topologyIds = new Set(topologies.map((topology) => topology.id));
  const topologyById = new Map(
    topologies.map((topology) => [topology.id, topology]),
  );
  for (const lesson of lessons) {
    for (const block of lesson.blocks) {
      if (
        block.type === "topology" &&
        "topologyId" in block &&
        !topologyIds.has(String(block.topologyId))
      ) {
        throw new ServiceError(
          "INVALID_LESSON",
          `${lesson.title} refers to a topology that is not available.`,
        );
      }
      if (
        block.type === "commands" &&
        "topologyId" in block &&
        "commandGroups" in block &&
        block.topologyId
      ) {
        const topology = topologyById.get(String(block.topologyId));
        if (!topology) {
          throw new ServiceError(
            "INVALID_LESSON",
            `${lesson.title} refers to a command topology that is not available.`,
          );
        }
        const deviceIds = new Set(topology.devices.map((device) => device.id));
        for (const group of block.commandGroups ?? []) {
          if (group.deviceId && !deviceIds.has(group.deviceId)) {
            throw new ServiceError(
              "INVALID_LESSON",
              `${lesson.title} has a command group linked to a device that is not available.`,
            );
          }
        }
      }
    }
  }
  const assessments = (assessmentResult.data ?? []) as unknown as JsonObject[];
  for (const assessment of assessments) {
    assertObject(assessment.draft, String(assessment.title));
    assertQuestions(
      (assessment.draft as JsonObject).questions,
      String(assessment.title),
    );
  }
  const version = Number(versionResult.data?.version ?? 0) + 1;
  const versionId = crypto.randomUUID();
  const packageValue = {
    workshopId,
    versionId,
    version,
    title: workshop.title,
    description: workshop.description,
    instructorName: profileResult.data?.display_name ||
      user.email?.split("@")[0] ||
      "NetBite instructor",
    publishedAt: new Date().toISOString(),
    archived: false,
    lessons,
    topologies,
    flashcards: (flashcardResult.data ?? [])
      .filter((row) => lessonIds.has(row.lesson_stable_id))
      .map((row) => {
        const draft = row.draft as JsonObject;
        return {
          id: row.stable_id,
          lessonId: row.lesson_stable_id,
          question: requiredText(draft.question, "Flashcard question", 2000),
          answer: requiredText(draft.answer, "Flashcard answer", 4000),
          explanation: draft.explanation
            ? String(draft.explanation).slice(0, 4000)
            : undefined,
        };
      }),
    assessments: assessments.map(publicAssessment),
  };
  const packageChecksum = await checksum(packageValue);
  const protectedRows = assessments
    .filter((row) => row.mode === "graded")
    .map((row) => ({
      assessmentId: row.stable_id,
      answerKey: answerKey(row),
      explanations: Object.fromEntries(
        (((row.draft as JsonObject).questions as JsonObject[]) ?? []).map(
          (question) => [
            String(question.id),
            String(question.explanation ?? ""),
          ],
        ),
      ),
    }));
  const { data: published, error: publishError } = await db.rpc(
    "publish_workshop_release",
    {
      p_actor_id: user.id,
      p_request_id: publishRequestId,
      p_workshop_id: workshopId,
      p_version_id: versionId,
      p_version: version,
      p_manifest: {
        workshopId,
        versionId,
        version,
        publishedAt: packageValue.publishedAt,
      },
      p_package: packageValue,
      p_checksum: packageChecksum,
      p_answer_keys: protectedRows,
    },
  );
  if (publishError) throw publishError;
  return adminJson(request, { ...published, requestId: id });
}

export async function createClass(request: Request, body: JsonObject) {
  const user = await requireInstructor(request);
  const workshopId = String(body.workshopId ?? "");
  const workshop = await requireOwnedWorkshop(user.id, workshopId);
  if (!workshop.current_version_id) {
    throw new ServiceError(
      "PUBLISH_REQUIRED",
      "Publish the workshop before creating a class.",
    );
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const joinCode = Array.from(bytes)
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
  const title = String(body.title ?? "").trim();
  if (title.length < 3 || title.length > 120) {
    throw new ServiceError(
      "INVALID_CLASS_TITLE",
      "Enter a class name between 3 and 120 characters.",
    );
  }
  const { data, error } = await adminClient()
    .from("workshop_classes")
    .insert({
      workshop_id: workshopId,
      version_id: workshop.current_version_id,
      instructor_id: user.id,
      title,
      join_code: joinCode,
    })
    .select("id,title,join_code,version_id")
    .single();
  if (error) throw error;
  return adminJson(request, {
    classId: data.id,
    title: data.title,
    joinCode: data.join_code,
    versionId: data.version_id,
  });
}
