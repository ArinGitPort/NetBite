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
  | "dashboard" | "curriculum" | "assessments" | "sources" | "assets"
  | "releases" | "audit" | "workshops" | "classes"
  | "workshop-assessments" | "gradebook" | "instructors";

export interface WorkshopRow {
  id: string; title: string; description: string; archived: boolean;
  current_version_id?: string; updated_at: string;
}
export interface WorkshopLessonRow {
  id: string; workshop_id: string; stable_id: string; position: number;
  draft: Record<string, unknown>; archived: boolean;
}
export interface WorkshopTopologyRow {
  id: string; workshop_id: string; stable_id: string;
  definition: Record<string, unknown>;
}
export interface WorkshopAssessmentRow {
  id: string; workshop_id: string; stable_id: string; title: string;
  mode: "practice" | "graded"; draft: Record<string, unknown>;
  settings: Record<string, unknown>; archived: boolean;
}
export interface WorkshopClassRow {
  id: string; workshop_id: string; version_id: string; title: string;
  join_code: string; archived: boolean; join_enabled: boolean; created_at: string;
}
export interface WorkshopClassRosterEntry {
  displayName: string;
  joinedAt: string;
}
export interface InstructorRequestRow {
  user_id: string; display_name: string; institution: string; reason: string;
  status: "pending" | "approved" | "declined" | "revoked";
  requested_at: string; reviewed_at?: string;
}
export interface WorkshopVersionRow {
  id: string; workshop_id: string; version: number; checksum: string; published_at: string;
}
export interface CourseRow { id: string; position: number; definition: Record<string, unknown>; }
export interface ChapterRow { id: string; course_id: string; position: number; definition: Record<string, unknown>; }
export interface LessonDraft {
  id: string; chapterId: string; order: number; title: string; eyebrow: string;
  body: string; takeaway: string; illustration: string;
  sections?: Array<{ heading: string; body: string }>;
  example?: unknown; checkpoint?: unknown;
}
export interface LessonRow {
  id: string; chapter_id: string; position: number;
  requirement: "core" | "supplemental"; draft: LessonDraft;
  archived: boolean; updated_at: string;
}
export interface QuizRow {
  id: string; chapter_id: string; lesson_id: string; position: number;
  draft: { id: string; lessonId: string; prompt: string; answers: string[];
    correctAnswerIndex: number; explanation: string; };
  archived: boolean;
}
export interface FlashcardRow {
  id: string; chapter_id: string; lesson_id: string; position: number;
  draft: { id: string; lessonId: string; prompt: string; answer: string; explanation: string; };
  archived: boolean;
}
export interface SourceRow { id: string; lesson_id?: string; label: string; url: string; notes: string; }
export interface AssetRow {
  id: string; lesson_id?: string; object_path: string; mime_type: string;
  byte_size: number; width: number; height: number; alt_text: string;
  published: boolean; preview_url?: string;
}
export interface ReleaseRow {
  id: string; release_version: number; schema_version: number;
  minimum_app_version: string; changelog: string; checksum: string;
  published_at: string; rollback_of?: string;
}
export interface SafeAuditEntry {
  id: number; actionLabel: string; contentLabel: string;
  administratorName?: string; summary: string; occurredAt: string;
}
