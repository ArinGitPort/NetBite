import type { CloudProgressSnapshot } from '@/core/account/types';
import { migrateIllustrationBookmarks } from '@/core/learning/adaptive-learning';
import type { GameState } from '@/store/use-game-store';

export const CLOUD_PROGRESS_SCHEMA_VERSION = 3;

const unique = (values: string[]) => [...new Set(values)];
const timestamp = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function emptyLearningProgress(updatedAt = new Date(0).toISOString()): CloudProgressSnapshot {
  return {
    schemaVersion: CLOUD_PROGRESS_SCHEMA_VERSION,
    completedLessonIds: [],
    completedLabIds: [],
    quizScores: {},
    quizContentVersions: {},
    reviewedFlashcardChapterIds: [],
    flashcardContentVersions: {},
    flashcardPositions: {},
    cliGuideSeen: false,
    hapticsEnabled: true,
    motionPreference: 'system',
    reviewSignals: {},
    savedLearningItems: {},
    activityHistory: [],
    readinessScores: {},
    completedCapstoneIds: [],
    courseAchievements: {},
    updatedAt,
  };
}

export function serializeLearningProgress(
  state: Pick<GameState,
    'completedLessonIds' | 'completedLabIds' | 'quizScores' | 'quizContentVersions'
    | 'reviewedFlashcardChapterIds' | 'flashcardContentVersions' | 'flashcardPositions'
    | 'cliGuideSeen' | 'hapticsEnabled' | 'motionPreference'>
    & Partial<Pick<GameState, 'reviewSignals' | 'savedLearningItems' | 'activityHistory' | 'readinessScores' | 'completedCapstoneIds' | 'courseAchievements'>>,
  updatedAt = new Date().toISOString(),
): CloudProgressSnapshot {
  return {
    schemaVersion: CLOUD_PROGRESS_SCHEMA_VERSION,
    completedLessonIds: unique(state.completedLessonIds),
    completedLabIds: unique(state.completedLabIds),
    quizScores: { ...state.quizScores },
    quizContentVersions: { ...state.quizContentVersions },
    reviewedFlashcardChapterIds: unique(state.reviewedFlashcardChapterIds),
    flashcardContentVersions: { ...state.flashcardContentVersions },
    flashcardPositions: { ...state.flashcardPositions },
    cliGuideSeen: state.cliGuideSeen,
    hapticsEnabled: state.hapticsEnabled,
    motionPreference: state.motionPreference,
    reviewSignals: { ...(state.reviewSignals ?? {}) },
    savedLearningItems: migrateIllustrationBookmarks(state.savedLearningItems ?? {}, updatedAt),
    activityHistory: [...(state.activityHistory ?? [])],
    readinessScores: { ...(state.readinessScores ?? {}) },
    completedCapstoneIds: unique(state.completedCapstoneIds ?? []),
    courseAchievements: { ...(state.courseAchievements ?? {}) },
    updatedAt,
  };
}

function mergeVersionedScores(local: CloudProgressSnapshot, cloud: CloudProgressSnapshot) {
  const scores: Record<string, number> = {};
  const versions: Record<string, number> = {};
  const ids = unique([...Object.keys(local.quizScores), ...Object.keys(cloud.quizScores)]);
  ids.forEach((id) => {
    const localVersion = local.quizContentVersions[id] ?? 1;
    const cloudVersion = cloud.quizContentVersions[id] ?? 1;
    const version = Math.max(localVersion, cloudVersion);
    versions[id] = version;
    if (localVersion === cloudVersion) scores[id] = Math.max(local.quizScores[id] ?? 0, cloud.quizScores[id] ?? 0);
    else scores[id] = localVersion > cloudVersion ? local.quizScores[id] ?? 0 : cloud.quizScores[id] ?? 0;
  });
  return { scores, versions };
}

export function mergeLearningProgress(local: CloudProgressSnapshot, cloud: CloudProgressSnapshot): CloudProgressSnapshot {
  const localTime = timestamp(local.updatedAt);
  const cloudTime = timestamp(cloud.updatedAt);
  const localIsNewer = localTime >= cloudTime;
  const recent = localIsNewer ? local : cloud;
  const quiz = mergeVersionedScores(local, cloud);
  const flashcardVersions: Record<string, number> = {};
  unique([...Object.keys(local.flashcardContentVersions), ...Object.keys(cloud.flashcardContentVersions)])
    .forEach((id) => { flashcardVersions[id] = Math.max(local.flashcardContentVersions[id] ?? 1, cloud.flashcardContentVersions[id] ?? 1); });
  const reviewSignals = mergeTimestampedRecords(local.reviewSignals ?? {}, cloud.reviewSignals ?? {}, (left, right) => ({ ...right, missCount: Math.max(left.missCount, right.missCount) }));
  const savedLearningItems = migrateIllustrationBookmarks(mergeTimestampedRecords(local.savedLearningItems ?? {}, cloud.savedLearningItems ?? {}));
  const activityHistory = [...(local.activityHistory ?? []), ...(cloud.activityHistory ?? [])]
    .filter((event, index, values) => values.findIndex((candidate) => candidate.id === event.id) === index)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 50);
  const readinessScores = numberMaximums(local.readinessScores ?? {}, cloud.readinessScores ?? {});
  const courseAchievements = { ...(cloud.courseAchievements ?? {}), ...(local.courseAchievements ?? {}) };

  return {
    schemaVersion: Math.max(local.schemaVersion, cloud.schemaVersion),
    completedLessonIds: unique([...local.completedLessonIds, ...cloud.completedLessonIds]),
    completedLabIds: unique([...local.completedLabIds, ...cloud.completedLabIds]),
    quizScores: quiz.scores,
    quizContentVersions: quiz.versions,
    reviewedFlashcardChapterIds: unique([...local.reviewedFlashcardChapterIds, ...cloud.reviewedFlashcardChapterIds]),
    flashcardContentVersions: flashcardVersions,
    flashcardPositions: { ...recent.flashcardPositions },
    cliGuideSeen: local.cliGuideSeen || cloud.cliGuideSeen,
    hapticsEnabled: recent.hapticsEnabled,
    motionPreference: recent.motionPreference,
    reviewSignals,
    savedLearningItems,
    activityHistory,
    readinessScores,
    completedCapstoneIds: unique([...(local.completedCapstoneIds ?? []), ...(cloud.completedCapstoneIds ?? [])]),
    courseAchievements,
    updatedAt: new Date(Math.max(localTime, cloudTime)).toISOString(),
  };
}

export function hasLearningProgress(snapshot: CloudProgressSnapshot) {
  return snapshot.completedLessonIds.length > 0
    || snapshot.completedLabIds.length > 0
    || Object.keys(snapshot.quizScores).length > 0
    || snapshot.reviewedFlashcardChapterIds.length > 0
    || Object.keys(snapshot.reviewSignals ?? {}).length > 0
    || Object.keys(snapshot.savedLearningItems ?? {}).length > 0
    || (snapshot.activityHistory ?? []).length > 0
    || Object.keys(snapshot.readinessScores ?? {}).length > 0
    || (snapshot.completedCapstoneIds ?? []).length > 0
    || Object.keys(snapshot.courseAchievements ?? {}).length > 0;
}

export function applyLearningProgress(snapshot: CloudProgressSnapshot) {
  return {
    completedLessonIds: snapshot.completedLessonIds,
    completedLabIds: snapshot.completedLabIds,
    quizScores: snapshot.quizScores,
    quizContentVersions: snapshot.quizContentVersions,
    reviewedFlashcardChapterIds: snapshot.reviewedFlashcardChapterIds,
    flashcardContentVersions: snapshot.flashcardContentVersions,
    flashcardPositions: snapshot.flashcardPositions,
    cliGuideSeen: snapshot.cliGuideSeen,
    hapticsEnabled: snapshot.hapticsEnabled,
    motionPreference: snapshot.motionPreference,
    reviewSignals: snapshot.reviewSignals ?? {},
    savedLearningItems: migrateIllustrationBookmarks(snapshot.savedLearningItems ?? {}, snapshot.updatedAt),
    activityHistory: snapshot.activityHistory ?? [],
    readinessScores: snapshot.readinessScores ?? {},
    completedCapstoneIds: snapshot.completedCapstoneIds ?? [],
    courseAchievements: snapshot.courseAchievements ?? {},
  };
}

function numberMaximums(local: Record<string, number>, cloud: Record<string, number>) {
  return Object.fromEntries(unique([...Object.keys(local), ...Object.keys(cloud)]).map((key) => [key, Math.max(local[key] ?? 0, cloud[key] ?? 0)]));
}

function mergeTimestampedRecords<T extends { updatedAt: string }>(local: Record<string, T>, cloud: Record<string, T>, combine?: (older: T, newer: T) => T) {
  const result: Record<string, T> = {};
  unique([...Object.keys(local), ...Object.keys(cloud)]).forEach((key) => {
    const left = local[key];
    const right = cloud[key];
    if (!left) result[key] = right;
    else if (!right) result[key] = left;
    else {
      const [older, newer] = timestamp(left.updatedAt) <= timestamp(right.updatedAt) ? [left, right] : [right, left];
      result[key] = combine ? combine(older, newer) : newer;
    }
  });
  return result;
}
