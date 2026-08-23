import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

import { canonicalize } from '@/core/content-delivery/canonical-json';
import { ContentCache } from '@/core/content-delivery/content-cache';
import type { ContentRepository, ContentUpdateResult, RemoteCurriculumManifest, RemoteCurriculumPackage, RemoteCurriculumPayload } from '@/core/content-delivery/types';
import { isRemoteCurriculumPackage, validateRemoteCurriculumPayload } from '@/core/content-delivery/validation';
import { supabase } from '@/services/supabase';

const CONTENT_SCHEMA_VERSION = 1;
const CONTENT_REQUEST_TIMEOUT_MS = 8_000;
const cache = new ContentCache();

async function boundedQuery<T>(run: (signal: AbortSignal) => PromiseLike<T>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONTENT_REQUEST_TIMEOUT_MS);
  try { return await run(controller.signal); } finally { clearTimeout(timer); }
}

function compareVersions(left: string, right: string) {
  const a = left.split('.').map(Number); const b = right.split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

function manifestFromRow(row: Record<string, unknown>): RemoteCurriculumManifest {
  return {
    releaseId: String(row.id), releaseVersion: Number(row.release_version), schemaVersion: Number(row.schema_version),
    minimumAppVersion: String(row.minimum_app_version), checksum: String(row.checksum),
    publishedAt: String(row.published_at), changelog: String(row.changelog),
  };
}

export class SupabaseContentRepository implements ContentRepository {
  async getActiveCurriculum() { return cache.getActive(); }

  async checkForUpdate() {
    if (!supabase) return undefined;
    const client = supabase;
    const { data, error } = await boundedQuery((signal) => client.from('content_releases').select('id,release_version,schema_version,minimum_app_version,checksum,published_at,changelog').order('release_version', { ascending: false }).limit(1).abortSignal(signal).maybeSingle());
    if (error) throw error;
    return data ? manifestFromRow(data) : undefined;
  }

  async downloadAndActivate(manifest: RemoteCurriculumManifest): Promise<ContentUpdateResult> {
    if (!supabase) return { status: 'offline', changed: false, message: 'Cloud content is not configured.' };
    const client = supabase;
    if (manifest.schemaVersion !== CONTENT_SCHEMA_VERSION) return { status: 'error', changed: false, message: 'This content release needs a newer content schema.' };
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';
    if (compareVersions(appVersion, manifest.minimumAppVersion) < 0) return { status: 'error', changed: false, message: 'Update NetBite before installing this curriculum release.' };
    const { data, error } = await boundedQuery((signal) => client.from('content_releases').select('package').eq('id', manifest.releaseId).abortSignal(signal).single());
    if (error) throw error;
    const payload = data?.package as RemoteCurriculumPayload;
    const validation = validateRemoteCurriculumPayload(payload);
    if (!validation.valid) return { status: 'error', changed: false, message: `Content validation failed: ${validation.issues[0]?.message ?? 'Unknown content error.'}` };
    const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonicalize(payload));
    if (checksum !== manifest.checksum) return { status: 'error', changed: false, message: 'Content checksum did not match the published release.' };
    const content: RemoteCurriculumPackage = { ...payload, manifest };
    if (!isRemoteCurriculumPackage(content)) return { status: 'error', changed: false, message: 'Published content is incomplete.' };
    await cache.activate(content);
    return { status: 'updated', changed: true, message: `Learning materials updated to release ${manifest.releaseVersion}.`, manifest };
  }

  async restorePreviousRelease(): Promise<ContentUpdateResult> {
    const restored = await cache.restorePrevious();
    return restored ? { status: 'updated', changed: true, message: `Restored curriculum release ${restored.manifest.releaseVersion}.`, manifest: restored.manifest } : { status: 'current', changed: false, message: 'No previous curriculum release is stored.' };
  }
}

export const contentRepository = new SupabaseContentRepository();
