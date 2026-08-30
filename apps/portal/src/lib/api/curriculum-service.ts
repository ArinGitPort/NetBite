import { getPortalClient } from "@/lib/api/client";
import { throwIfServiceError } from "@/lib/api/errors";
import type { ChapterRow, CourseRow, FlashcardRow, LessonDraft, LessonRow, QuizRow } from "@/lib/api/types";

export async function getCurriculum() {
  const client = getPortalClient();
  const [courses, chapters, lessons, quiz, flashcards] = await Promise.all([
    client.from("content_courses").select("id,position,definition").order("position"),
    client.from("content_chapters").select("id,course_id,position,definition").order("course_id").order("position"),
    client.from("content_lessons").select("id,chapter_id,position,requirement,draft,archived,updated_at").order("chapter_id").order("position"),
    client.from("content_quiz_questions").select("id,chapter_id,lesson_id,position,draft,archived").order("chapter_id").order("position"),
    client.from("content_flashcards").select("id,chapter_id,lesson_id,position,draft,archived").order("chapter_id").order("position"),
  ]);
  [courses, chapters, lessons, quiz, flashcards].forEach(({ error }) => throwIfServiceError(error));
  return { courses: (courses.data ?? []) as CourseRow[], chapters: (chapters.data ?? []) as ChapterRow[], lessons: (lessons.data ?? []) as LessonRow[], quiz: (quiz.data ?? []) as QuizRow[], flashcards: (flashcards.data ?? []) as FlashcardRow[] };
}
export async function createLesson(chapterId: string, id: string, position: number, illustration: string): Promise<void> {
  const draft: LessonDraft = { id, chapterId, order: position, title: "New lesson", eyebrow: "NETWORK OPERATIONS", body: "Explain the networking problem in plain English.", takeaway: "State what the learner should remember.", illustration, sections: [] };
  const { error } = await getPortalClient().from("content_lessons").insert({ id, chapter_id: chapterId, position, requirement: "supplemental", draft });
  throwIfServiceError(error);
}
export async function saveLesson(row: LessonRow): Promise<void> {
  const { error } = await getPortalClient().from("content_lessons").update({ draft: { ...row.draft, id: row.id, chapterId: row.chapter_id, order: row.position } }).eq("id", row.id);
  throwIfServiceError(error);
}
export async function setLessonArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await getPortalClient().from("content_lessons").update({ archived }).eq("id", id);
  throwIfServiceError(error);
}
export async function reorderLessons(chapterId: string, orderedIds: string[]): Promise<void> {
  const { error } = await getPortalClient().rpc("reorder_content_lessons", { target_chapter_id: chapterId, ordered_ids: orderedIds });
  throwIfServiceError(error);
}
export async function saveQuiz(row: QuizRow): Promise<void> {
  const { error } = await getPortalClient().from("content_quiz_questions").update({ lesson_id: row.lesson_id, draft: row.draft }).eq("id", row.id);
  throwIfServiceError(error);
}
export async function createQuiz(chapterId: string, lessonId: string, position: number): Promise<void> {
  const id = `remote-quiz-${crypto.randomUUID()}`;
  const draft = { id, lessonId, prompt: "Write an application question.", answers: ["Correct answer", "Misconception", "Different misconception"], correctAnswerIndex: 0, explanation: "Explain why the networking rule supports this answer." };
  const { error } = await getPortalClient().from("content_quiz_questions").insert({ id, chapter_id: chapterId, lesson_id: lessonId, position, draft });
  throwIfServiceError(error);
}
export async function saveFlashcard(row: FlashcardRow): Promise<void> {
  const { error } = await getPortalClient().from("content_flashcards").update({ lesson_id: row.lesson_id, draft: row.draft }).eq("id", row.id);
  throwIfServiceError(error);
}
export async function createFlashcard(chapterId: string, lessonId: string, position: number): Promise<void> {
  const id = `remote-card-${crypto.randomUUID()}`;
  const draft = { id, lessonId, prompt: "Write a recall question.", answer: "Write the direct answer.", explanation: "Explain why it matters." };
  const { error } = await getPortalClient().from("content_flashcards").insert({ id, chapter_id: chapterId, lesson_id: lessonId, position, draft });
  throwIfServiceError(error);
}
export async function deleteAssessment(table: "content_quiz_questions" | "content_flashcards", id: string): Promise<void> {
  const { error } = await getPortalClient().from(table).delete().eq("id", id);
  throwIfServiceError(error);
}
