import type { PublicCurriculumRelease, RemoteCurriculumPayload } from '@/core/content-delivery/types';

export function parsePublicContentRelease(value: unknown): PublicCurriculumRelease | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as { manifest?: unknown; package?: unknown };
  if (!candidate.manifest || typeof candidate.manifest !== 'object' || !candidate.package || typeof candidate.package !== 'object') return undefined;
  const manifest = candidate.manifest as Record<string, unknown>;
  if (
    typeof manifest.releaseId !== 'string' || !manifest.releaseId ||
    typeof manifest.releaseVersion !== 'number' || !Number.isInteger(manifest.releaseVersion) || manifest.releaseVersion < 1 ||
    typeof manifest.schemaVersion !== 'number' || !Number.isInteger(manifest.schemaVersion) || manifest.schemaVersion < 1 ||
    typeof manifest.minimumAppVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(manifest.minimumAppVersion) ||
    typeof manifest.checksum !== 'string' || !/^[a-f0-9]{64}$/i.test(manifest.checksum) ||
    typeof manifest.publishedAt !== 'string' || Number.isNaN(Date.parse(manifest.publishedAt)) ||
    typeof manifest.changelog !== 'string'
  ) return undefined;
  return {
    manifest: {
      releaseId: manifest.releaseId,
      releaseVersion: manifest.releaseVersion,
      schemaVersion: manifest.schemaVersion,
      minimumAppVersion: manifest.minimumAppVersion,
      checksum: manifest.checksum,
      publishedAt: manifest.publishedAt,
      changelog: manifest.changelog,
    },
    package: candidate.package as RemoteCurriculumPayload,
  };
}
