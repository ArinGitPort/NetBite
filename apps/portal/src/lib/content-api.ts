import { supabase } from "./supabase";

export interface AdminAccess {
  userId: string;
  authorized: boolean;
  accessLevel: "administrator" | "instructor" | "none";
}
export interface SafeAdminError {
  code: string;
  message: string;
  requestId?: string;
}
export type AdminView =
  | "dashboard"
  | "curriculum"
  | "assessments"
  | "sources"
  | "assets"
  | "releases"
  | "audit"
  | "workshops"
  | "classes"
  | "workshop-assessments"
  | "gradebook"
  | "instructors";

export interface WorkshopRow {
  id: string;
  title: string;
  description: string;
  archived: boolean;
  current_version_id?: string;
  updated_at: string;
}
export interface WorkshopLessonRow {
  id: string;
  workshop_id: string;
  stable_id: string;
  position: number;
  draft: Record<string, unknown>;
  archived: boolean;
}
export interface WorkshopTopologyRow {
  id: string;
  workshop_id: string;
  stable_id: string;
  definition: Record<string, unknown>;
}
export interface WorkshopAssessmentRow {
  id: string;
  workshop_id: string;
  stable_id: string;
  title: string;
  mode: "practice" | "graded";
  draft: Record<string, unknown>;
  settings: Record<string, unknown>;
  archived: boolean;
}
export interface WorkshopClassRow {
  id: string;
  workshop_id: string;
  version_id: string;
  title: string;
  join_code: string;
  archived: boolean;
  join_enabled: boolean;
  created_at: string;
}
export interface InstructorRequestRow {
  user_id: string;
  display_name: string;
  institution: string;
  reason: string;
  status: "pending" | "approved" | "declined" | "revoked";
  requested_at: string;
  reviewed_at?: string;
}
export interface WorkshopVersionRow {
  id: string;
  workshop_id: string;
  version: number;
  checksum: string;
  published_at: string;
}
export interface CourseRow {
  id: string;
  position: number;
  definition: Record<string, unknown>;
}
export interface ChapterRow {
  id: string;
  course_id: string;
  position: number;
  definition: Record<string, unknown>;
}
export interface LessonRow {
  id: string;
  chapter_id: string;
  position: number;
  requirement: "core" | "supplemental";
  draft: LessonDraft;
  archived: boolean;
  updated_at: string;
}
export interface LessonDraft {
  id: string;
  chapterId: string;
  order: number;
  title: string;
  eyebrow: string;
  body: string;
  takeaway: string;
  illustration: string;
  sections?: Array<{ heading: string; body: string }>;
  example?: unknown;
  checkpoint?: unknown;
}
export interface QuizRow {
  id: string;
  chapter_id: string;
  lesson_id: string;
  position: number;
  draft: {
    id: string;
    lessonId: string;
    prompt: string;
    answers: string[];
    correctAnswerIndex: number;
    explanation: string;
  };
  archived: boolean;
}
export interface FlashcardRow {
  id: string;
  chapter_id: string;
  lesson_id: string;
  position: number;
  draft: {
    id: string;
    lessonId: string;
    prompt: string;
    answer: string;
    explanation: string;
  };
  archived: boolean;
}
export interface SourceRow {
  id: string;
  lesson_id?: string;
  label: string;
  url: string;
  notes: string;
}
export interface AssetRow {
  id: string;
  lesson_id?: string;
  object_path: string;
  mime_type: string;
  byte_size: number;
  width: number;
  height: number;
  alt_text: string;
  published: boolean;
  preview_url?: string;
}
export interface ReleaseRow {
  id: string;
  release_version: number;
  schema_version: number;
  minimum_app_version: string;
  changelog: string;
  checksum: string;
  published_at: string;
  rollback_of?: string;
}
export interface SafeAuditEntry {
  id: number;
  actionLabel: string;
  contentLabel: string;
  administratorName?: string;
  summary: string;
  occurredAt: string;
}

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}
export function mapAdminServiceError(
  value: unknown,
  fallback = "The action could not be completed.",
): SafeAdminError {
  const candidate = value as
    | {
        code?: string;
        message?: string;
        context?: { body?: { error?: SafeAdminError } };
        error?: SafeAdminError;
      }
    | undefined;
  const structured = candidate?.context?.body?.error ?? candidate?.error;
  const approvedMessages: Record<string, string> = {
    AUTH_REQUIRED: "Sign in to continue.",
    ADMIN_REQUIRED: "This account does not have administrator access.",
    METHOD_NOT_ALLOWED: "This request is not supported.",
    CHANGELOG_REQUIRED: "Describe what changed before publishing.",
    INVALID_APP_VERSION: "Use an Android app version such as 1.0.0.",
    REQUEST_ID_REQUIRED: "Start a new publish request and try again.",
    VALIDATION_FAILED: "Resolve the listed content issues before publishing.",
    INVALID_RESTORE_REQUEST: "Choose a published version and try again.",
    RELEASE_NOT_FOUND: "That published version is no longer available.",
    ADMIN_SERVICE_ERROR:
      "The service could not complete the request. Try again.",
  };
  if (structured?.code && approvedMessages[structured.code]) {
    return {
      code: structured.code,
      message: approvedMessages[structured.code],
      ...(structured.requestId ? { requestId: structured.requestId } : {}),
    };
  }
  const code = candidate?.code ?? "SERVICE_UNAVAILABLE";
  if (code === "23505")
    return {
      code,
      message:
        "That record already exists. Use a different permanent code or position.",
    };
  if (code === "42501" || code === "PGRST301")
    return {
      code,
      message:
        "Your administrator access could not be verified. Sign in again.",
    };
  return { code, message: fallback };
}

function fail(error: unknown, fallback?: string) {
  if (error) {
    const safe = mapAdminServiceError(error, fallback);
    throw Object.assign(new Error(safe.message), safe);
  }
}

export async function getAdminAccess(userId: string): Promise<AdminAccess> {
  const [
    { data: administrators, error: adminError },
    { data: instructors, error: instructorError },
  ] = await Promise.all([
    client().from("content_admins").select("user_id").eq("user_id", userId),
    client()
      .from("instructors")
      .select("user_id")
      .eq("user_id", userId)
      .is("revoked_at", null),
  ]);
  fail(adminError ?? instructorError, "Portal access could not be verified.");
  const accessLevel = administrators?.length
    ? "administrator"
    : instructors?.length
      ? "instructor"
      : "none";
  return { userId, authorized: accessLevel !== "none", accessLevel };
}

export async function getWorkshops() {
  const { data, error } = await client()
    .from("workshops")
    .select("id,title,description,archived,current_version_id,updated_at")
    .order("updated_at", { ascending: false });
  fail(error, "Workshops could not be loaded.");
  return (data ?? []) as WorkshopRow[];
}

export async function createWorkshop(title: string, description: string) {
  const { data, error } = await client()
    .from("workshops")
    .insert({ title: title.trim(), description: description.trim() })
    .select("id,title,description,archived,current_version_id,updated_at")
    .single();
  fail(error, "The workshop could not be created.");
  return data as WorkshopRow;
}

export async function saveWorkshop(workshop: WorkshopRow) {
  const { data, error } = await client()
    .from("workshops")
    .update({
      title: workshop.title.trim(),
      description: workshop.description.trim(),
      archived: workshop.archived,
    })
    .eq("id", workshop.id)
    .select("id,title,description,archived,current_version_id,updated_at")
    .single();
  fail(error, "The workshop could not be saved.");
  return data as WorkshopRow;
}

export async function deleteWorkshop(workshopId: string) {
  const { data, error } = await client()
    .from("workshops")
    .delete()
    .eq("id", workshopId)
    .select("id")
    .single();
  fail(
    error,
    "This workshop could not be deleted. Archive it if students or published versions depend on it.",
  );
  if (!data?.id)
    throw new Error("The workshop deletion could not be confirmed.");
  return data.id as string;
}
export async function getWorkshopVersions(workshopId: string) {
  const { data, error } = await client()
    .from("workshop_versions")
    .select("id,workshop_id,version,checksum,published_at")
    .eq("workshop_id", workshopId)
    .order("version", { ascending: false });
  fail(error, "Workshop version history could not be loaded.");
  return (data ?? []) as WorkshopVersionRow[];
}

export async function getWorkshopContent(workshopId: string) {
  const [lessons, topologies, assessments, flashcards] = await Promise.all([
    client()
      .from("workshop_lessons")
      .select("id,workshop_id,stable_id,position,draft,archived")
      .eq("workshop_id", workshopId)
      .order("position"),
    client()
      .from("workshop_topologies")
      .select("id,workshop_id,stable_id,definition")
      .eq("workshop_id", workshopId)
      .order("stable_id"),
    client()
      .from("workshop_assessments")
      .select("id,workshop_id,stable_id,title,mode,draft,settings,archived")
      .eq("workshop_id", workshopId)
      .order("stable_id"),
    client()
      .from("workshop_flashcards")
      .select("*")
      .eq("workshop_id", workshopId)
      .order("position"),
  ]);
  fail(
    lessons.error ?? topologies.error ?? assessments.error ?? flashcards.error,
    "Workshop content could not be loaded.",
  );
  return {
    lessons: (lessons.data ?? []) as WorkshopLessonRow[],
    topologies: (topologies.data ?? []) as WorkshopTopologyRow[],
    assessments: (assessments.data ?? []) as WorkshopAssessmentRow[],
    flashcards: flashcards.data ?? [],
  };
}

export async function createWorkshopLesson(
  workshopId: string,
  position: number,
) {
  const stableId = `lesson-${crypto.randomUUID()}`;
  const { data, error } = await client()
    .from("workshop_lessons")
    .insert({
      workshop_id: workshopId,
      stable_id: stableId,
      position,
      draft: { id: stableId, title: "New lesson", summary: "", blocks: [] },
    })
    .select("id,workshop_id,stable_id,position,draft,archived")
    .single();
  fail(error, "The lesson could not be added.");
  return data as WorkshopLessonRow;
}

export async function saveWorkshopLesson(row: WorkshopLessonRow) {
  const { error } = await client()
    .from("workshop_lessons")
    .update({ draft: row.draft, archived: row.archived })
    .eq("id", row.id);
  fail(error, "The lesson could not be saved.");
}

export async function deleteWorkshopLesson(lessonId: string) {
  const { data, error } = await client()
    .from("workshop_lessons")
    .delete()
    .eq("id", lessonId)
    .select("id")
    .single();
  fail(error, "The lesson could not be deleted.");
  if (!data?.id) throw new Error("The lesson deletion could not be confirmed.");
  return data.id as string;
}

export async function saveWorkshopTopology(row: WorkshopTopologyRow) {
  const payload = {
    workshop_id: row.workshop_id,
    stable_id: row.stable_id,
    definition: row.definition,
  };
  const { data, error } = row.id
    ? await client()
        .from("workshop_topologies")
        .update(payload)
        .eq("id", row.id)
        .select("id,workshop_id,stable_id,definition")
        .single()
    : await client()
        .from("workshop_topologies")
        .insert(payload)
        .select("id,workshop_id,stable_id,definition")
        .single();
  fail(error, "The topology could not be saved.");
  return data as WorkshopTopologyRow;
}

export async function createWorkshopAssessment(
  workshopId: string,
  mode: "practice" | "graded",
) {
  const stableId = `assessment-${crypto.randomUUID()}`;
  const { data, error } = await client()
    .from("workshop_assessments")
    .insert({
      workshop_id: workshopId,
      stable_id: stableId,
      title: "New assessment",
      mode,
      draft: { instructions: "Answer every question.", questions: [] },
      settings:
        mode === "graded"
          ? {
              maximumAttempts: 1,
              gradePolicy: "highest",
              passingPercentage: 80,
              feedbackRelease: "final-attempt",
              shuffleQuestions: false,
              shuffleAnswers: false,
            }
          : {},
    })
    .select("id,workshop_id,stable_id,title,mode,draft,settings,archived")
    .single();
  fail(error, "The assessment could not be added.");
  return data as WorkshopAssessmentRow;
}

export async function saveWorkshopAssessment(row: WorkshopAssessmentRow) {
  const { error } = await client()
    .from("workshop_assessments")
    .update({
      title: row.title,
      mode: row.mode,
      draft: row.draft,
      settings: row.settings,
      archived: row.archived,
    })
    .eq("id", row.id);
  fail(error, "The assessment could not be saved.");
}

async function workshopAction(body: Record<string, unknown>) {
  const { data, error } = await client().functions.invoke("workshop-service", {
    body,
  });
  fail(error, "The workshop service is unavailable.");
  if (data?.error)
    fail(data.error, "The workshop request could not be completed.");
  return data;
}

export function publishWorkshop(workshopId: string) {
  return workshopAction({
    action: "publish",
    workshopId,
    requestId: crypto.randomUUID(),
  });
}
export function createWorkshopClass(workshopId: string, title: string) {
  return workshopAction({ action: "create-class", workshopId, title });
}
export async function getWorkshopClasses() {
  const { data, error } = await client()
    .from("workshop_classes")
    .select(
      "id,workshop_id,version_id,title,join_code,archived,join_enabled,created_at",
    )
    .order("created_at", { ascending: false });
  fail(error, "Classes could not be loaded.");
  return (data ?? []) as WorkshopClassRow[];
}
export async function setWorkshopClassEnrollment(
  classId: string,
  enabled: boolean,
) {
  const { error } = await client()
    .from("workshop_classes")
    .update({ join_enabled: enabled })
    .eq("id", classId);
  fail(error, "Class enrollment could not be updated.");
}
export function getWorkshopGradebook(classId: string) {
  return workshopAction({ action: "gradebook", classId }) as Promise<{
    rows: Array<Record<string, unknown>>;
  }>;
}
export async function getInstructorRequests() {
  const { data, error } = await client()
    .from("instructor_requests")
    .select(
      "user_id,display_name,institution,reason,status,requested_at,reviewed_at",
    )
    .order("requested_at", { ascending: false });
  fail(error, "Instructor requests could not be loaded.");
  return (data ?? []) as InstructorRequestRow[];
}
export async function reviewInstructorRequest(
  userId: string,
  decision: "approved" | "declined" | "revoked",
) {
  const { error } = await client().rpc("review_instructor_request", {
    p_user_id: userId,
    p_decision: decision,
  });
  fail(error, "The instructor request could not be updated.");
}
export async function getCurriculum() {
  const [courses, chapters, lessons, quiz, flashcards] = await Promise.all([
    client()
      .from("content_courses")
      .select("id,position,definition")
      .order("position"),
    client()
      .from("content_chapters")
      .select("id,course_id,position,definition")
      .order("course_id")
      .order("position"),
    client()
      .from("content_lessons")
      .select("id,chapter_id,position,requirement,draft,archived,updated_at")
      .order("chapter_id")
      .order("position"),
    client()
      .from("content_quiz_questions")
      .select("id,chapter_id,lesson_id,position,draft,archived")
      .order("chapter_id")
      .order("position"),
    client()
      .from("content_flashcards")
      .select("id,chapter_id,lesson_id,position,draft,archived")
      .order("chapter_id")
      .order("position"),
  ]);
  [courses, chapters, lessons, quiz, flashcards].forEach(({ error }) =>
    fail(error),
  );
  return {
    courses: (courses.data ?? []) as CourseRow[],
    chapters: (chapters.data ?? []) as ChapterRow[],
    lessons: (lessons.data ?? []) as LessonRow[],
    quiz: (quiz.data ?? []) as QuizRow[],
    flashcards: (flashcards.data ?? []) as FlashcardRow[],
  };
}
export async function createLesson(
  chapterId: string,
  id: string,
  position: number,
  illustration: string,
) {
  const draft: LessonDraft = {
    id,
    chapterId,
    order: position,
    title: "New lesson",
    eyebrow: "NETWORK OPERATIONS",
    body: "Explain the networking problem in plain English.",
    takeaway: "State what the learner should remember.",
    illustration,
    sections: [],
  };
  const { error } = await client().from("content_lessons").insert({
    id,
    chapter_id: chapterId,
    position,
    requirement: "supplemental",
    draft,
  });
  fail(error);
}
export async function saveLesson(row: LessonRow) {
  const { error } = await client()
    .from("content_lessons")
    .update({
      draft: {
        ...row.draft,
        id: row.id,
        chapterId: row.chapter_id,
        order: row.position,
      },
    })
    .eq("id", row.id);
  fail(error);
}
export async function setLessonArchived(id: string, archived: boolean) {
  const { error } = await client()
    .from("content_lessons")
    .update({ archived })
    .eq("id", id);
  fail(error);
}
export async function saveQuiz(row: QuizRow) {
  const { error } = await client()
    .from("content_quiz_questions")
    .update({ lesson_id: row.lesson_id, draft: row.draft })
    .eq("id", row.id);
  fail(error);
}
export async function createQuiz(
  chapterId: string,
  lessonId: string,
  position: number,
) {
  const id = `remote-quiz-${crypto.randomUUID()}`;
  const draft = {
    id,
    lessonId,
    prompt: "Write an application question.",
    answers: ["Correct answer", "Misconception", "Different misconception"],
    correctAnswerIndex: 0,
    explanation: "Explain why the networking rule supports this answer.",
  };
  const { error } = await client().from("content_quiz_questions").insert({
    id,
    chapter_id: chapterId,
    lesson_id: lessonId,
    position,
    draft,
  });
  fail(error);
}
export async function saveFlashcard(row: FlashcardRow) {
  const { error } = await client()
    .from("content_flashcards")
    .update({ lesson_id: row.lesson_id, draft: row.draft })
    .eq("id", row.id);
  fail(error);
}
export async function reorderLessons(chapterId: string, orderedIds: string[]) {
  const { error } = await client().rpc("reorder_content_lessons", {
    target_chapter_id: chapterId,
    ordered_ids: orderedIds,
  });
  fail(error);
}
export async function createFlashcard(
  chapterId: string,
  lessonId: string,
  position: number,
) {
  const id = `remote-card-${crypto.randomUUID()}`;
  const draft = {
    id,
    lessonId,
    prompt: "Write a recall question.",
    answer: "Write the direct answer.",
    explanation: "Explain why it matters.",
  };
  const { error } = await client().from("content_flashcards").insert({
    id,
    chapter_id: chapterId,
    lesson_id: lessonId,
    position,
    draft,
  });
  fail(error);
}
export async function deleteAssessment(
  table: "content_quiz_questions" | "content_flashcards",
  id: string,
) {
  const { error } = await client().from(table).delete().eq("id", id);
  fail(error);
}
export async function getSources() {
  const { data, error } = await client()
    .from("content_sources")
    .select("id,lesson_id,label,url,notes")
    .order("created_at", { ascending: false });
  fail(error);
  return (data ?? []) as SourceRow[];
}
export async function saveSource(source: Partial<SourceRow>) {
  const rawUrl = source.url?.trim() ?? "";
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("Enter a complete HTTPS source address.");
  }
  const host = parsedUrl.hostname.toLowerCase();
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.username ||
    parsedUrl.password ||
    host === "localhost" ||
    host === "::1" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    throw new Error(
      "Use a public HTTPS source address without embedded credentials.",
    );
  }
  const payload = {
    lesson_id: source.lesson_id || null,
    label: source.label?.trim(),
    url: parsedUrl.toString(),
    notes: source.notes ?? "",
  };
  const query = source.id
    ? client().from("content_sources").update(payload).eq("id", source.id)
    : client().from("content_sources").insert(payload);
  const { error } = await query;
  fail(error);
}
export async function deleteSource(id: string) {
  const { error } = await client()
    .from("content_sources")
    .delete()
    .eq("id", id);
  fail(error);
}
export async function getAssets() {
  const { data, error } = await client()
    .from("content_assets")
    .select(
      "id,lesson_id,object_path,mime_type,byte_size,width,height,alt_text,published",
    )
    .order("created_at", { ascending: false });
  fail(error);
  return Promise.all(
    ((data ?? []) as AssetRow[]).map(async (asset) => {
      const { data: signed } = await client()
        .storage.from("netbite-content")
        .createSignedUrl(asset.object_path, 300);
      return { ...asset, preview_url: signed?.signedUrl };
    }),
  );
}
export async function uploadAsset(
  file: File,
  altText: string,
  dimensions: { width: number; height: number },
  lessonId?: string,
) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `drafts/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client()
    .storage.from("netbite-content")
    .upload(path, file, { contentType: file.type });
  fail(uploadError);
  const { error } = await client()
    .from("content_assets")
    .insert({
      lesson_id: lessonId || null,
      object_path: path,
      mime_type: file.type,
      byte_size: file.size,
      width: dimensions.width,
      height: dimensions.height,
      alt_text: altText.trim(),
    });
  if (error) {
    await client().storage.from("netbite-content").remove([path]);
    fail(
      error,
      "The image details could not be saved. The upload was removed safely.",
    );
  }
}
export async function deleteAsset(asset: AssetRow) {
  const { error: storageError } = await client()
    .storage.from("netbite-content")
    .remove([asset.object_path]);
  fail(storageError);
  const { error } = await client()
    .from("content_assets")
    .delete()
    .eq("id", asset.id);
  fail(error);
}
export async function validateRelease() {
  const { data, error } = await client().functions.invoke(
    "validate-content-release",
    { body: {} },
  );
  fail(error);
  return data as {
    valid: boolean;
    issues: Array<{ area: string; message: string }>;
    totals: Record<string, number>;
  };
}
export async function publishRelease(
  changelog: string,
  minimumAppVersion: string,
  requestId: string,
) {
  const { data, error } = await client().functions.invoke(
    "publish-content-release",
    { body: { changelog, minimumAppVersion, requestId } },
  );
  fail(error);
  if (data?.error) fail(data.error, "The curriculum could not be published.");
  return data;
}
export async function getReleases() {
  const { data, error } = await client()
    .from("content_releases")
    .select(
      "id,release_version,schema_version,minimum_app_version,changelog,checksum,published_at,rollback_of",
    )
    .order("release_version", { ascending: false });
  fail(error);
  return (data ?? []) as ReleaseRow[];
}
export async function rollbackRelease(releaseId: string, requestId: string) {
  const { data, error } = await client().functions.invoke(
    "rollback-content-release",
    { body: { releaseId, requestId } },
  );
  fail(error);
  if (data?.error)
    fail(data.error, "The previous version could not be restored.");
  return data;
}
export async function getSanitizedAuditHistory() {
  const { data, error } = await client().rpc("get_sanitized_content_audit", {
    requested_limit: 100,
  });
  fail(error, "Activity history could not be loaded.");
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    actionLabel: String(row.action_label),
    contentLabel: String(row.content_label),
    administratorName: row.administrator_name
      ? String(row.administrator_name)
      : undefined,
    summary: String(row.summary),
    occurredAt: String(row.occurred_at),
  })) as SafeAuditEntry[];
}
