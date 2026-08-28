import type { ChapterDefinition, CourseDefinition, LessonIllustration } from '@/content/types';

export type ContentUpdateStatus = 'bundled' | 'checking' | 'current' | 'updating' | 'updated' | 'offline' | 'error';

export interface RemoteCurriculumManifest {
  releaseId: string;
  releaseVersion: number;
  schemaVersion: number;
  minimumAppVersion: string;
  checksum: string;
  publishedAt: string;
  changelog: string;
}

export interface RemoteContentAsset {
  id: string;
  lessonId?: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  altText: string;
}

export interface RemoteContentSource {
  id: string;
  lessonId?: string;
  label: string;
  url: string;
}

export interface RemoteChapterDefinition extends ChapterDefinition {
  lessons: (ChapterDefinition['lessons'][number] & {
    requirement?: 'core' | 'supplemental';
    remoteAssetId?: string;
  })[];
}

export interface RemoteCurriculumPayload {
  courses: CourseDefinition[];
  chapters: RemoteChapterDefinition[];
  assets: RemoteContentAsset[];
  sources: RemoteContentSource[];
  supportedIllustrations: LessonIllustration[];
}

export interface RemoteCurriculumPackage extends RemoteCurriculumPayload {
  manifest: RemoteCurriculumManifest;
}

export interface PublicCurriculumRelease {
  manifest: RemoteCurriculumManifest;
  package: RemoteCurriculumPayload;
}

export interface ContentUpdateResult {
  status: ContentUpdateStatus;
  changed: boolean;
  message: string;
  manifest?: RemoteCurriculumManifest;
}

export interface ContentRepository {
  getActiveCurriculum(): Promise<RemoteCurriculumPackage | undefined>;
  checkForUpdate(): Promise<RemoteCurriculumManifest | undefined>;
  downloadAndActivate(manifest: RemoteCurriculumManifest): Promise<ContentUpdateResult>;
  restorePreviousRelease(): Promise<ContentUpdateResult>;
}

export interface ContentValidationIssue {
  path: string;
  message: string;
}

export interface ContentValidationResult {
  valid: boolean;
  issues: ContentValidationIssue[];
}
