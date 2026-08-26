import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

import { canonicalize } from '@/core/content-delivery/canonical-json';
import { ContentCache } from '@/core/content-delivery/content-cache';
import { parsePublicContentRelease } from '@/core/content-delivery/public-release-parser';
import type { ContentRepository, ContentUpdateResult, PublicCurriculumRelease, RemoteCurriculumManifest, RemoteCurriculumPackage } from '@/core/content-delivery/types';
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

export class SupabaseContentRepository implements ContentRepository {
  private pendingRelease?: PublicCurriculumRelease;

  async getActiveCurriculum() { return cache.getActive(); }

  async checkForUpdate() {
    if (!supabase) return undefined;
    const client = supabase;
    const { data, error } = await boundedQuery((signal) => client.rpc('get_active_content_release').abortSignal(signal));
    if (error) throw error;
    const release = parsePublicContentRelease(data);
    this.pendingRelease = release;
    return release?.manifest;
  }

  async downloadAndActivate(manifest: RemoteCurriculumManifest): Promise<ContentUpdateResult> {
    if (!supabase) return { status: 'offline', changed: false, message: 'Cloud content is not configured.' };
    const client = supabase;
    if (manifest.schemaVersion !== CONTENT_SCHEMA_VERSION) return { status: 'error', changed: false, message: 'This content release needs a newer content schema.' };
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';
    if (compareVersions(appVersion, manifest.minimumAppVersion) < 0) return { status: 'error', changed: false, message: 'Update NetBite before installing this curriculum release.' };
    let release = this.pendingRelease?.manifest.releaseId === manifest.releaseId ? this.pendingRelease : undefined;
    if (!release) {
      const { data, error } = await boundedQuery((signal) => client.rpc('get_active_content_release').abortSignal(signal));
      if (error) throw error;
      release = parsePublicContentRelease(data);
    }
    if (!release || release.manifest.releaseId !== manifest.releaseId) return { status: 'error', changed: false, message: 'The published curriculum changed. Check for updates again.' };
    const payload = release.package;
    const validation = validateRemoteCurriculumPayload(payload);
    if (!validation.valid) return { status: 'error', changed: false, message: `Content validation failed: ${validation.issues[0]?.message ?? 'Unknown content error.'}` };
    const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonicalize(payload));
    if (checksum !== manifest.checksum) return { status: 'error', changed: false, message: 'Content checksum did not match the published release.' };
    const content: RemoteCurriculumPackage = { ...payload, manifest };
    if (!isRemoteCurriculumPackage(content)) return { status: 'error', changed: false, message: 'Published content is incomplete.' };
    await cache.activate(content);
    this.pendingRelease = undefined;
    return { status: 'updated', changed: true, message: `Learning materials updated to release ${manifest.releaseVersion}.`, manifest };
  }

  async restorePreviousRelease(): Promise<ContentUpdateResult> {
    const restored = await cache.restorePrevious();
    return restored ? { status: 'updated', changed: true, message: `Restored curriculum release ${restored.manifest.releaseVersion}.`, manifest: restored.manifest } : { status: 'current', changed: false, message: 'No previous curriculum release is stored.' };
  }
}

export const contentRepository = new SupabaseContentRepository();
