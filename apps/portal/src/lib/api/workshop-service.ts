import { getPortalClient } from "@/lib/api/client";
import { throwIfFunctionError, throwIfServiceError } from "@/lib/api/errors";
import type {
  WorkshopAssessmentRow, WorkshopClassRow, WorkshopLessonRow, WorkshopRow,
  WorkshopTopologyRow, WorkshopVersionRow,
} from "@/lib/api/types";
import type { AssessmentQuestion } from "@/lib/api/types";

const client = getPortalClient;

export interface BankQuestion { id: string; title: string; question: AssessmentQuestion; updated_at: string }
export async function getQuestionBank(): Promise<BankQuestion[]> {
  const { data, error } = await client().from("workshop_question_bank").select("id,title,question,updated_at").order("updated_at", { ascending: false }).limit(100);
  throwIfServiceError(error, "Your question bank could not be loaded.");
  return (data ?? []) as BankQuestion[];
}
export async function saveQuestionToBank(question: AssessmentQuestion): Promise<void> {
  const title = question.prompt.trim().slice(0, 120);
  if (title.length < 2 || question.choices.length < 2 || !question.choices.some((choice) => choice.id === question.correctChoiceId)) throw new Error("Finish the question and choose a correct answer before saving it to the bank.");
  const { error } = await client().from("workshop_question_bank").insert({ title, question: structuredClone(question) });
  throwIfServiceError(error, "The question could not be saved to your private bank.");
}
export async function deleteQuestionFromBank(id: string): Promise<void> {
  const { error } = await client().from("workshop_question_bank").delete().eq("id", id);
  throwIfServiceError(error, "The question could not be removed from your bank.");
}

export async function getWorkshops(): Promise<WorkshopRow[]> {
  const { data, error } = await client().from("workshops")
    .select("id,title,description,archived,current_version_id,updated_at")
    .order("updated_at", { ascending: false });
  throwIfServiceError(error, "Workshops could not be loaded.");
  return (data ?? []) as WorkshopRow[];
}
export interface WorkshopAnnouncement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}
export async function getWorkshopAnnouncements(classId: string): Promise<WorkshopAnnouncement[]> {
  const { data, error } = await client().from("workshop_announcements")
    .select("id,title,body,created_at").eq("class_id", classId)
    .order("created_at", { ascending: false }).limit(20);
  throwIfServiceError(error, "Class announcements could not be loaded.");
  return (data ?? []) as WorkshopAnnouncement[];
}
export async function postWorkshopAnnouncement(classId: string, title: string, body: string): Promise<void> {
  const { error } = await client().rpc("post_workshop_announcement", {
    p_class_id: classId, p_title: title.trim(), p_body: body.trim(),
  });
  throwIfServiceError(error, "The announcement could not be sent. Nothing was posted.");
}
export interface RosterImportRow { row: number; email: string; status: 'invalid' | 'duplicate' | 'unmatched' | 'already-enrolled' | 'ready' | 'enrolled' }
export async function processWorkshopRoster(classId: string, rows: Array<{ email: string }>, commit = false): Promise<RosterImportRow[]> {
  const { data, error } = await client().rpc('process_workshop_roster', { p_class_id: classId, p_rows: rows, p_commit: commit });
  throwIfServiceError(error, commit ? 'The roster was not imported.' : 'The roster preview could not be checked.');
  if (!Array.isArray(data)) throw new Error('The roster response could not be verified.');
  return data as RosterImportRow[];
}
export async function createWorkshop(title: string, description: string): Promise<WorkshopRow> {
  const { data, error } = await client().from("workshops")
    .insert({ title: title.trim(), description: description.trim() })
    .select("id,title,description,archived,current_version_id,updated_at").single();
  throwIfServiceError(error, "The workshop could not be created.");
  return data as WorkshopRow;
}
export async function saveWorkshop(workshop: WorkshopRow): Promise<WorkshopRow> {
  const { data, error } = await client().from("workshops")
    .update({ title: workshop.title.trim(), description: workshop.description.trim(), archived: workshop.archived })
    .eq("id", workshop.id).select("id,title,description,archived,current_version_id,updated_at").single();
  throwIfServiceError(error, "The workshop could not be saved.");
  return data as WorkshopRow;
}
export async function deleteWorkshop(workshopId: string): Promise<string> {
  const { data, error } = await client().from("workshops").delete().eq("id", workshopId).select("id").single();
  throwIfServiceError(error, "This workshop could not be deleted. Archive it if students or published versions depend on it.");
  if (!data?.id) throw new Error("The workshop deletion could not be confirmed.");
  return data.id as string;
}
export async function getWorkshopVersions(workshopId: string): Promise<WorkshopVersionRow[]> {
  const { data, error } = await client().from("workshop_versions")
    .select("id,workshop_id,version,checksum,published_at").eq("workshop_id", workshopId)
    .order("version", { ascending: false });
  throwIfServiceError(error, "Workshop version history could not be loaded.");
  return (data ?? []) as WorkshopVersionRow[];
}
export async function getWorkshopContent(workshopId: string) {
  const db = client();
  const [lessons, topologies, assessments, flashcards] = await Promise.all([
    db.from("workshop_lessons").select("id,workshop_id,stable_id,position,draft,archived").eq("workshop_id", workshopId).order("position"),
    db.from("workshop_topologies").select("id,workshop_id,stable_id,definition").eq("workshop_id", workshopId).order("stable_id"),
    db.from("workshop_assessments").select("id,workshop_id,stable_id,title,mode,draft,settings,archived").eq("workshop_id", workshopId).order("stable_id"),
    db.from("workshop_flashcards").select("*").eq("workshop_id", workshopId).order("position"),
  ]);
  throwIfServiceError(lessons.error ?? topologies.error ?? assessments.error ?? flashcards.error, "Workshop content could not be loaded.");
  return { lessons: (lessons.data ?? []) as WorkshopLessonRow[], topologies: (topologies.data ?? []) as WorkshopTopologyRow[], assessments: (assessments.data ?? []) as WorkshopAssessmentRow[], flashcards: flashcards.data ?? [] };
}
export async function createWorkshopLesson(workshopId: string, position: number, starter?: Record<string, unknown>): Promise<WorkshopLessonRow> {
  const stableId = `lesson-${crypto.randomUUID()}`;
  const { data, error } = await client().from("workshop_lessons")
    .insert({ workshop_id: workshopId, stable_id: stableId, position, draft: { id: stableId, title: "New lesson", summary: "", blocks: [], ...starter } })
    .select("id,workshop_id,stable_id,position,draft,archived").single();
  throwIfServiceError(error, "The lesson could not be added.");
  return data as WorkshopLessonRow;
}
export async function copyWorkshopLesson(source: WorkshopLessonRow, draft: Record<string, unknown>, position: number): Promise<WorkshopLessonRow> {
  const stableId = String(draft.id);
  const { data, error } = await client().from("workshop_lessons")
    .insert({ workshop_id: source.workshop_id, stable_id: stableId, position, draft, archived: false })
    .select("id,workshop_id,stable_id,position,draft,archived").single();
  throwIfServiceError(error, "The lesson could not be duplicated.");
  return data as WorkshopLessonRow;
}
export async function saveWorkshopLesson(row: WorkshopLessonRow): Promise<void> {
  const { error } = await client().from("workshop_lessons").update({ draft: row.draft, archived: row.archived }).eq("id", row.id);
  throwIfServiceError(error, "The lesson could not be saved.");
}
export async function deleteWorkshopLesson(lessonId: string): Promise<string> {
  const { data, error } = await client().from("workshop_lessons").delete().eq("id", lessonId).select("id").single();
  throwIfServiceError(error, "The lesson could not be deleted.");
  if (!data?.id) throw new Error("The lesson deletion could not be confirmed.");
  return data.id as string;
}
export async function saveWorkshopTopology(row: WorkshopTopologyRow): Promise<WorkshopTopologyRow> {
  const payload = { workshop_id: row.workshop_id, stable_id: row.stable_id, definition: row.definition };
  const { data, error } = row.id
    ? await client().from("workshop_topologies").update(payload).eq("id", row.id).select("id,workshop_id,stable_id,definition").single()
    : await client().from("workshop_topologies").insert(payload).select("id,workshop_id,stable_id,definition").single();
  throwIfServiceError(error, "The topology could not be saved.");
  return data as WorkshopTopologyRow;
}
export async function deleteWorkshopTopology(topologyId: string): Promise<string> {
  const { data, error } = await client().from("workshop_topologies").delete().eq("id", topologyId).select("id").single();
  throwIfServiceError(error, "The topology could not be deleted.");
  if (!data?.id) throw new Error("The topology deletion could not be confirmed.");
  return data.id as string;
}
export async function createWorkshopAssessment(workshopId: string, mode: "practice" | "graded", starter?: { title: string; draft: Record<string, unknown> }): Promise<WorkshopAssessmentRow> {
  const stableId = `assessment-${crypto.randomUUID()}`;
  const settings = mode === "graded" ? { maximumAttempts: 1, gradePolicy: "highest", passingPercentage: 80, feedbackRelease: "final-attempt", shuffleQuestions: false, shuffleAnswers: false } : {};
  const { data, error } = await client().from("workshop_assessments")
    .insert({ workshop_id: workshopId, stable_id: stableId, title: starter?.title ?? "New assessment", mode, draft: starter?.draft ?? { instructions: "Answer every question.", questions: [] }, settings })
    .select("id,workshop_id,stable_id,title,mode,draft,settings,archived").single();
  throwIfServiceError(error, "The assessment could not be added.");
  return data as WorkshopAssessmentRow;
}
export async function copyWorkshopAssessment(source: WorkshopAssessmentRow, draft: Record<string, unknown>): Promise<WorkshopAssessmentRow> {
  const stableId = `assessment-${crypto.randomUUID()}`;
  const { data, error } = await client().from("workshop_assessments")
    .insert({ workshop_id: source.workshop_id, stable_id: stableId, title: `${source.title} (copy)`, mode: source.mode, draft, settings: structuredClone(source.settings), archived: false })
    .select("id,workshop_id,stable_id,title,mode,draft,settings,archived").single();
  throwIfServiceError(error, "The assessment could not be duplicated.");
  return data as WorkshopAssessmentRow;
}
export async function saveWorkshopAssessment(row: WorkshopAssessmentRow): Promise<void> {
  const { error } = await client().from("workshop_assessments").update({ title: row.title, mode: row.mode, draft: row.draft, settings: row.settings, archived: row.archived }).eq("id", row.id);
  throwIfServiceError(error, "The assessment could not be saved.");
}
export async function deleteWorkshopAssessment(assessmentId: string): Promise<string> {
  const { data, error } = await client().from("workshop_assessments").delete().eq("id", assessmentId).select("id").single();
  throwIfServiceError(error, "The assessment could not be deleted.");
  if (!data?.id) throw new Error("The assessment deletion could not be confirmed.");
  return data.id as string;
}
async function workshopAction(body: Record<string, unknown>) {
  const { data, error } = await client().functions.invoke("workshop-service", { body });
  await throwIfFunctionError(error, "The workshop service is unavailable.");
  if (data?.error) throwIfServiceError(data.error, "The workshop request could not be completed.");
  return data;
}
export const publishWorkshop = (workshopId: string) => workshopAction({ action: "publish", workshopId, requestId: crypto.randomUUID() });
export const createWorkshopClass = (workshopId: string, title: string) => workshopAction({ action: "create-class", workshopId, title });
export async function getWorkshopClasses(): Promise<WorkshopClassRow[]> {
  const { data, error } = await client().from("workshop_classes").select("id,workshop_id,version_id,title,join_code,archived,join_enabled,created_at").order("created_at", { ascending: false });
  throwIfServiceError(error, "Classes could not be loaded.");
  return (data ?? []) as WorkshopClassRow[];
}
export async function getInstructorOverview() {
  const db = client();
  const [workshops, classes, assessments] = await Promise.all([
    getWorkshops(),
    getWorkshopClasses(),
    db.from("workshop_assessments").select("id,mode,archived"),
  ]);
  throwIfServiceError(assessments.error, "Assessment summary could not be loaded.");
  return {
    workshops,
    classes,
    assessments: (assessments.data ?? []) as Array<{ id: string; mode: "practice" | "graded"; archived: boolean }>,
  };
}
export async function setWorkshopClassEnrollment(classId: string, enabled: boolean): Promise<void> {
  const { error } = await client().from("workshop_classes").update({ join_enabled: enabled }).eq("id", classId);
  throwIfServiceError(error, "Class enrollment could not be updated.");
}
export const getWorkshopClassRoster = (classId: string) =>
  workshopAction({ action: "class-roster", classId }) as Promise<{
    students: import("@/lib/api/types").WorkshopClassRosterEntry[];
  }>;
export const getWorkshopGradebook = (classId: string) => workshopAction({ action: "gradebook", classId }) as Promise<{ rows: Array<Record<string, unknown>> }>;
export interface QuestionOutcomeCount { correct: number; incorrect: number }
export interface AssessmentAnalytics {
  assessmentId: string;
  assessmentTitle: string;
  allAttempts: number;
  recordedAttempts: number;
  questions: Array<{ questionId: string; prompt: string; all: QuestionOutcomeCount; recorded: QuestionOutcomeCount }>;
}
export interface AttemptDetail {
  assessmentTitle: string;
  attempts: Array<{
    attemptId: string;
    attemptNumber: number;
    submittedAt: string;
    score: number;
    total: number;
    percentage: number;
    late: boolean;
    recorded: boolean;
    answers: Array<{ questionId: string; prompt: string; selectedChoice: string; correctChoice: string; correct: boolean }>;
  }>;
}
export const getAssessmentAnalytics = (classId: string, assessmentId: string) => workshopAction({ action: "assessment-analytics", classId, assessmentId }) as Promise<AssessmentAnalytics>;
export const getAttemptDetail = (classId: string, assessmentId: string, studentId: string) => workshopAction({ action: "attempt-detail", classId, assessmentId, studentId }) as Promise<AttemptDetail>;
