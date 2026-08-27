import { calculateGradebookSummary, validateGradedAssessmentSettings, validateWorkshopTopology, type GradebookStudentRow, type MobileAccountRole, type WorkshopLibraryEntry, type WorkshopSubmissionResult } from '@/core/workshops/types';
import { describeOperationError, withTimeout } from '@/core/reliability/recoverable-operation';
import { supabase } from '@/services/supabase';

export class WorkshopServiceError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

function requireCloud() {
  if (!supabase) throw new WorkshopServiceError('OFFLINE', 'Online classes are unavailable until NetBite can reach its learning service.');
  return supabase;
}

function safeMessage(error: unknown, fallback: string) {
  return describeOperationError(error, fallback).message;
}

export function parseWorkshopLibrary(value: unknown): WorkshopLibraryEntry[] {
  if (!Array.isArray(value)) throw new WorkshopServiceError('INVALID_LIBRARY', 'The class library could not be verified. Your offline copy was not changed.');
  return value.map((entry): WorkshopLibraryEntry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new WorkshopServiceError('INVALID_LIBRARY', 'The class library contains an invalid record.');
    const row = entry as Record<string, unknown>;
    const rawManifest = row.manifest;
    if (!rawManifest || typeof rawManifest !== 'object' || Array.isArray(rawManifest)) throw new WorkshopServiceError('INVALID_LIBRARY', 'A workshop download is incomplete.');
    const packageValue = rawManifest as Record<string, unknown>;
    if (typeof row.classId !== 'string' || typeof row.joinedAt !== 'string' || typeof packageValue.workshopId !== 'string' || typeof packageValue.versionId !== 'string' || typeof packageValue.title !== 'string' || !Array.isArray(packageValue.lessons) || !Array.isArray(packageValue.topologies) || !Array.isArray(packageValue.flashcards) || !Array.isArray(packageValue.assessments)) {
      throw new WorkshopServiceError('INVALID_LIBRARY', 'A workshop download is not compatible with this version of NetBite.');
    }
    const manifest = packageValue as unknown as WorkshopLibraryEntry['manifest'];
    const ids = new Set<string>();
    for (const lesson of manifest.lessons) {
      if (!lesson?.id || ids.has(lesson.id) || !lesson.title?.trim() || !Array.isArray(lesson.blocks)) throw new WorkshopServiceError('INVALID_LIBRARY', 'A workshop lesson is incomplete or repeated.');
      ids.add(lesson.id);
    }
    for (const topology of manifest.topologies) {
      if (!topology?.id || ids.has(topology.id) || validateWorkshopTopology(topology).some((issue) => issue.severity === 'error')) throw new WorkshopServiceError('INVALID_LIBRARY', 'A workshop topology could not be verified.');
      ids.add(topology.id);
    }
    for (const assessment of manifest.assessments) {
      if (!assessment?.id || ids.has(assessment.id) || !Array.isArray(assessment.questions) || !assessment.questions.length) throw new WorkshopServiceError('INVALID_LIBRARY', 'A workshop assessment is incomplete or repeated.');
      ids.add(assessment.id);
      if (assessment.mode === 'graded') {
        if (assessment.questions.some((question) => 'correctChoiceId' in question)) throw new WorkshopServiceError('INVALID_LIBRARY', 'Protected assessment answers were included in a learner download.');
        if (!assessment.settings || validateGradedAssessmentSettings(assessment.settings).some((issue) => issue.severity === 'error')) throw new WorkshopServiceError('INVALID_LIBRARY', 'A graded assessment has invalid submission rules.');
      }
    }
    return {
      classId: row.classId,
      joinedAt: row.joinedAt,
      savedLessonIds: Array.isArray(row.savedLessonIds) ? row.savedLessonIds.filter((item): item is string => typeof item === 'string') : [],
      manifest,
    };
  });
}

export async function fetchMobileAccountRole(): Promise<MobileAccountRole> {
  if (!supabase) return 'student';
  try {
    const { data, error } = await withTimeout(Promise.resolve(supabase.rpc('get_mobile_account_role')));
    if (error) throw error;
    return data === 'instructor' ? 'instructor' : 'student';
  } catch { return 'student'; }
}

export async function fetchWorkshopLibrary() {
  const client = requireCloud();
  try {
    const { data, error } = await withTimeout(Promise.resolve(client.rpc('get_my_workshop_library')));
    if (error) throw error;
    return parseWorkshopLibrary(data);
  } catch (error) {
    if (error instanceof WorkshopServiceError) throw error;
    throw new WorkshopServiceError('LIBRARY_UNAVAILABLE', safeMessage(error, 'Your online class library could not be refreshed.'));
  }
}

export async function joinWorkshopClass(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,10}$/.test(normalized)) throw new WorkshopServiceError('INVALID_CODE', 'Enter the 6–10 character class code provided by your instructor.');
  const { data, error } = await withTimeout(Promise.resolve(requireCloud().rpc('join_workshop_class', { p_code: normalized })));
  if (error) throw new WorkshopServiceError('JOIN_FAILED', 'That class code is invalid, revoked, or temporarily unavailable.');
  return data as { classId: string; versionId: string; joined: boolean };
}

export async function setWorkshopLessonSaved(classId: string, lessonId: string, saved: boolean) {
  const { error } = await withTimeout(Promise.resolve(requireCloud().rpc('set_workshop_lesson_saved', { p_class_id: classId, p_lesson_id: lessonId, p_saved: saved })));
  if (error) throw new WorkshopServiceError('SAVE_FAILED', 'The saved lesson could not be updated online. Your offline copy remains available.');
}

export async function submitWorkshopAssessment(input: { classId: string; assessmentId: string; answers: Record<string, string>; requestId: string }) {
  const { data, error } = await withTimeout(requireCloud().functions.invoke('workshop-service', { body: { action: 'submit', ...input } }));
  if (error) throw new WorkshopServiceError('SUBMISSION_FAILED', 'The assessment was not submitted. Your answers remain saved on this device.');
  if (data?.error) throw new WorkshopServiceError(String(data.error.code ?? 'SUBMISSION_FAILED'), String(data.error.message ?? 'The assessment was not submitted.'));
  return data as WorkshopSubmissionResult;
}

export async function fetchWorkshopAssessmentStatus(classId: string, assessmentId: string) {
  const { data, error } = await withTimeout(requireCloud().functions.invoke('workshop-service', { body: { action: 'assessment-status', classId, assessmentId } }));
  if (error) throw new WorkshopServiceError('RESULT_UNAVAILABLE', 'Assessment results could not be refreshed.');
  if (data?.error) throw new WorkshopServiceError(String(data.error.code ?? 'RESULT_UNAVAILABLE'), String(data.error.message ?? 'Assessment results could not be refreshed.'));
  return data as { submitted: boolean; result?: WorkshopSubmissionResult };
}

export async function fetchInstructorClasses() {
  const client = requireCloud();
  const { data, error } = await withTimeout(Promise.resolve(client.from('workshop_classes')
    .select('id,workshop_id,version_id,title,join_code,archived,created_at')
    .order('created_at', { ascending: false })));
  if (error) throw new WorkshopServiceError('CLASSES_UNAVAILABLE', 'Instructor classes could not be refreshed.');
  return (data ?? []) as { id: string; workshop_id: string; version_id: string; title: string; join_code: string; archived: boolean; created_at: string }[];
}

export async function fetchInstructorClassSummary(classId: string) {
  const { data, error } = await withTimeout(requireCloud().functions.invoke('workshop-service', { body: { action: 'gradebook', classId } }));
  if (error || data?.error) throw new WorkshopServiceError('SUMMARY_UNAVAILABLE', 'The class summary could not be refreshed.');
  const rows = Array.isArray(data?.rows) ? data.rows as GradebookStudentRow[] : [];
  return calculateGradebookSummary(rows);
}

export async function fetchInstructorRequest() {
  const { data, error } = await withTimeout(Promise.resolve(requireCloud().from('instructor_requests')
    .select('display_name,institution,reason,status,requested_at,reviewed_at').maybeSingle()));
  if (error) throw new WorkshopServiceError('REQUEST_UNAVAILABLE', 'Instructor access status could not be checked.');
  return data as { display_name: string; institution: string; reason: string; status: 'pending' | 'approved' | 'declined' | 'revoked'; requested_at: string; reviewed_at?: string } | null;
}

export async function requestInstructorAccess(displayName: string, institution: string, reason: string) {
  if (displayName.trim().length < 2) throw new WorkshopServiceError('INVALID_NAME', 'Enter your full display name.');
  if (institution.trim().length < 2) throw new WorkshopServiceError('INVALID_INSTITUTION', 'Enter your school or institution.');
  const { error } = await withTimeout(Promise.resolve(requireCloud().rpc('request_instructor_access', { p_display_name: displayName.trim(), p_institution: institution.trim(), p_reason: reason.trim() })));
  if (error) throw new WorkshopServiceError('REQUEST_FAILED', 'The instructor request could not be submitted. Try again later.');
}
