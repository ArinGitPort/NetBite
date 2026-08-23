import { supabase } from "./supabase";

export type AdminRole = "editor" | "publisher";
export type AdminView =
  | "dashboard"
  | "curriculum"
  | "assessments"
  | "sources"
  | "assets"
  | "releases"
  | "audit";
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
export interface AuditRow {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: Record<string, unknown>;
  created_at: string;
}

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}
function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function getRoles(userId: string) {
  const { data, error } = await client()
    .from("content_admin_roles")
    .select("role")
    .eq("user_id", userId);
  fail(error);
  return (data ?? []).map(({ role }) => role as AdminRole);
}
export async function getCurriculum() {
  const [courses, chapters, lessons, quiz, flashcards] = await Promise.all([
    client().from("content_courses").select("*").order("position"),
    client()
      .from("content_chapters")
      .select("*")
      .order("course_id")
      .order("position"),
    client()
      .from("content_lessons")
      .select("*")
      .order("chapter_id")
      .order("position"),
    client()
      .from("content_quiz_questions")
      .select("*")
      .order("chapter_id")
      .order("position"),
    client()
      .from("content_flashcards")
      .select("*")
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
  userId: string,
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
  const { error } = await client()
    .from("content_lessons")
    .insert({
      id,
      chapter_id: chapterId,
      position,
      requirement: "supplemental",
      draft,
      created_by: userId,
      updated_by: userId,
    });
  fail(error);
}
export async function saveLesson(row: LessonRow, userId: string) {
  const { error } = await client()
    .from("content_lessons")
    .update({
      draft: {
        ...row.draft,
        id: row.id,
        chapterId: row.chapter_id,
        order: row.position,
      },
      updated_by: userId,
    })
    .eq("id", row.id);
  fail(error);
}
export async function setLessonArchived(
  id: string,
  archived: boolean,
  userId: string,
) {
  const { error } = await client()
    .from("content_lessons")
    .update({ archived, updated_by: userId })
    .eq("id", id);
  fail(error);
}
export async function saveQuiz(row: QuizRow, userId: string) {
  const { error } = await client()
    .from("content_quiz_questions")
    .update({ lesson_id: row.lesson_id, draft: row.draft, updated_by: userId })
    .eq("id", row.id);
  fail(error);
}
export async function createQuiz(
  chapterId: string,
  lessonId: string,
  position: number,
  userId: string,
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
  const { error } = await client()
    .from("content_quiz_questions")
    .insert({
      id,
      chapter_id: chapterId,
      lesson_id: lessonId,
      position,
      draft,
      updated_by: userId,
    });
  fail(error);
}
export async function saveFlashcard(row: FlashcardRow, userId: string) {
  const { error } = await client()
    .from("content_flashcards")
    .update({ lesson_id: row.lesson_id, draft: row.draft, updated_by: userId })
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
  userId: string,
) {
  const id = `remote-card-${crypto.randomUUID()}`;
  const draft = {
    id,
    lessonId,
    prompt: "Write a recall question.",
    answer: "Write the direct answer.",
    explanation: "Explain why it matters.",
  };
  const { error } = await client()
    .from("content_flashcards")
    .insert({
      id,
      chapter_id: chapterId,
      lesson_id: lessonId,
      position,
      draft,
      updated_by: userId,
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
    .select("*")
    .order("created_at", { ascending: false });
  fail(error);
  return (data ?? []) as SourceRow[];
}
export async function saveSource(source: Partial<SourceRow>, userId: string) {
  const payload = {
    lesson_id: source.lesson_id || null,
    label: source.label?.trim(),
    url: source.url?.trim(),
    notes: source.notes ?? "",
    updated_by: userId,
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
    .select("*")
    .order("created_at", { ascending: false });
  fail(error);
  return Promise.all(((data ?? []) as AssetRow[]).map(async (asset) => {
    const { data: signed } = await client().storage.from("netbite-content").createSignedUrl(asset.object_path, 3600);
    return { ...asset, preview_url: signed?.signedUrl };
  }));
}
export async function uploadAsset(
  file: File,
  altText: string,
  dimensions: { width: number; height: number },
  userId: string,
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
      uploaded_by: userId,
    });
  fail(error);
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
    issues: Array<{ path: string; message: string }>;
    totals: Record<string, number>;
  };
}
export async function publishRelease(
  changelog: string,
  minimumAppVersion: string,
) {
  const { data, error } = await client().functions.invoke(
    "publish-content-release",
    { body: { changelog, minimumAppVersion } },
  );
  fail(error);
  if (data?.error) throw new Error(data.error);
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
export async function rollbackRelease(releaseId: string) {
  const { data, error } = await client().functions.invoke(
    "rollback-content-release",
    { body: { releaseId } },
  );
  fail(error);
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function getAuditLog() {
  const { data, error } = await client()
    .from("content_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  fail(error);
  return (data ?? []) as AuditRow[];
}
