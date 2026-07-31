import type { CloudProgressSnapshot, Entitlement, UserProfile } from '@/core/account/types';
import { supabase } from '@/services/supabase';

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function numberRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => Number.isFinite(entry[1])),
  );
}

export function deserializeCloudProgress(row: Record<string, unknown>): CloudProgressSnapshot {
  const updatedAt = typeof row.updated_at === 'string' && Number.isFinite(Date.parse(row.updated_at))
    ? row.updated_at
    : new Date(0).toISOString();
  return {
    schemaVersion: Number.isInteger(row.schema_version) && Number(row.schema_version) > 0 ? Number(row.schema_version) : 1,
    completedLessonIds: stringArray(row.completed_lesson_ids),
    completedLabIds: stringArray(row.completed_lab_ids),
    quizScores: numberRecord(row.quiz_scores),
    quizContentVersions: numberRecord(row.quiz_content_versions),
    reviewedFlashcardChapterIds: stringArray(row.reviewed_flashcard_chapter_ids),
    flashcardContentVersions: numberRecord(row.flashcard_content_versions),
    flashcardPositions: numberRecord(row.flashcard_positions),
    cliGuideSeen: Boolean(row.cli_guide_seen),
    hapticsEnabled: row.haptics_enabled !== false,
    motionPreference: row.motion_preference === 'reduced' ? 'reduced' : 'system',
    updatedAt,
  };
}

function toRow(userId: string, value: CloudProgressSnapshot) {
  return {
    user_id: userId,
    schema_version: value.schemaVersion,
    completed_lesson_ids: value.completedLessonIds,
    completed_lab_ids: value.completedLabIds,
    quiz_scores: value.quizScores,
    quiz_content_versions: value.quizContentVersions,
    reviewed_flashcard_chapter_ids: value.reviewedFlashcardChapterIds,
    flashcard_content_versions: value.flashcardContentVersions,
    flashcard_positions: value.flashcardPositions,
    cli_guide_seen: value.cliGuideSeen,
    haptics_enabled: value.hapticsEnabled,
    motion_preference: value.motionPreference,
    updated_at: value.updatedAt,
  };
}

export async function pullCloudProgress(userId: string) {
  if (!supabase) return undefined;
  const { data, error } = await supabase.from('learning_progress').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? deserializeCloudProgress(data) : undefined;
}

export async function pushCloudProgress(userId: string, snapshot: CloudProgressSnapshot) {
  if (!supabase) throw new Error('Cloud services are not configured.');
  const { error } = await supabase.from('learning_progress').upsert(toRow(userId, snapshot), { onConflict: 'user_id' });
  if (error) throw error;
}

export async function fetchProfile(userId: string, email?: string): Promise<UserProfile> {
  if (!supabase) return { id: userId, email };
  const { data } = await supabase.from('profiles').select('display_name,avatar_url').eq('id', userId).maybeSingle();
  return { id: userId, email, displayName: data?.display_name ?? undefined, avatarUrl: data?.avatar_url ?? undefined };
}

export async function refreshEntitlement(userId: string): Promise<Entitlement | undefined> {
  if (!supabase) return undefined;
  const { data, error } = await supabase.from('entitlements').select('product_id,status,source,granted_at').eq('user_id', userId).eq('product_id', 'netbite_pro').maybeSingle();
  if (error) throw error;
  return data ? {
    productId: 'netbite_pro',
    status: data.status,
    source: data.source,
    grantedAt: data.granted_at,
  } : undefined;
}
