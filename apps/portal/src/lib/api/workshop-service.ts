import { getPortalClient } from "@/lib/api/client";
import { throwIfServiceError } from "@/lib/api/errors";
import type {
  WorkshopAssessmentRow, WorkshopClassRow, WorkshopLessonRow, WorkshopRow,
  WorkshopTopologyRow, WorkshopVersionRow,
} from "@/lib/api/types";

const client = getPortalClient;

export async function getWorkshops(): Promise<WorkshopRow[]> {
  const { data, error } = await client().from("workshops")
    .select("id,title,description,archived,current_version_id,updated_at")
    .order("updated_at", { ascending: false });
  throwIfServiceError(error, "Workshops could not be loaded.");
  return (data ?? []) as WorkshopRow[];
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
export async function createWorkshopLesson(workshopId: string, position: number): Promise<WorkshopLessonRow> {
  const stableId = `lesson-${crypto.randomUUID()}`;
  const { data, error } = await client().from("workshop_lessons")
    .insert({ workshop_id: workshopId, stable_id: stableId, position, draft: { id: stableId, title: "New lesson", summary: "", blocks: [] } })
    .select("id,workshop_id,stable_id,position,draft,archived").single();
  throwIfServiceError(error, "The lesson could not be added.");
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
export async function createWorkshopAssessment(workshopId: string, mode: "practice" | "graded"): Promise<WorkshopAssessmentRow> {
  const stableId = `assessment-${crypto.randomUUID()}`;
  const settings = mode === "graded" ? { maximumAttempts: 1, gradePolicy: "highest", passingPercentage: 80, feedbackRelease: "final-attempt", shuffleQuestions: false, shuffleAnswers: false } : {};
  const { data, error } = await client().from("workshop_assessments")
    .insert({ workshop_id: workshopId, stable_id: stableId, title: "New assessment", mode, draft: { instructions: "Answer every question.", questions: [] }, settings })
    .select("id,workshop_id,stable_id,title,mode,draft,settings,archived").single();
  throwIfServiceError(error, "The assessment could not be added.");
  return data as WorkshopAssessmentRow;
}
export async function saveWorkshopAssessment(row: WorkshopAssessmentRow): Promise<void> {
  const { error } = await client().from("workshop_assessments").update({ title: row.title, mode: row.mode, draft: row.draft, settings: row.settings, archived: row.archived }).eq("id", row.id);
  throwIfServiceError(error, "The assessment could not be saved.");
}
async function workshopAction(body: Record<string, unknown>) {
  const { data, error } = await client().functions.invoke("workshop-service", { body });
  throwIfServiceError(error, "The workshop service is unavailable.");
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
export async function setWorkshopClassEnrollment(classId: string, enabled: boolean): Promise<void> {
  const { error } = await client().from("workshop_classes").update({ join_enabled: enabled }).eq("id", classId);
  throwIfServiceError(error, "Class enrollment could not be updated.");
}
export const getWorkshopGradebook = (classId: string) => workshopAction({ action: "gradebook", classId }) as Promise<{ rows: Array<Record<string, unknown>> }>;
