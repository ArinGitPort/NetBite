import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { WorkshopLibraryEntry } from '@/core/workshops/types';

export type WorkshopAssetMap = Record<string, Record<string, string>>;

const ROOT_NAME = 'netbite-workshops';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function getWorkshopImageUrls(entry: WorkshopLibraryEntry): string[] {
  return [...new Set(entry.manifest.lessons.flatMap((lesson) => lesson.blocks)
    .filter((block) => block.type === 'image' && typeof block.imageUrl === 'string')
    .map((block) => block.imageUrl!.trim())
    .filter((url) => /^https:\/\//i.test(url)))];
}

function extensionFor(url: string) {
  try {
    const extension = new URL(url).pathname.match(/\.(png|jpe?g|webp|gif)$/i)?.[1]?.toLowerCase();
    return extension ? `.${extension === 'jpeg' ? 'jpg' : extension}` : '.img';
  } catch {
    return '.img';
  }
}

async function fileNameFor(url: string) {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, url);
  return `${digest}${extensionFor(url)}`;
}

function rootDirectory() {
  const root = new Directory(Paths.document, ROOT_NAME);
  if (!root.exists) root.create({ idempotent: true, intermediates: true });
  return root;
}

export function isWorkshopAssetMapAvailable(versionId: string, urls: string[], assetMap: WorkshopAssetMap) {
  const mapping = assetMap[versionId];
  return Boolean(mapping && urls.every((url) => {
    const uri = mapping[url];
    return typeof uri === 'string' && new File(uri).exists;
  }));
}

export async function cacheWorkshopVersionAssets(entry: WorkshopLibraryEntry): Promise<Record<string, string>> {
  const urls = getWorkshopImageUrls(entry);
  if (!urls.length) return {};

  const root = rootDirectory();
  const finalDirectory = new Directory(root, entry.manifest.versionId);
  const stagingDirectory = new Directory(root, `${entry.manifest.versionId}.staging`);
  const backupDirectory = new Directory(root, `${entry.manifest.versionId}.backup`);
  if (stagingDirectory.exists) stagingDirectory.delete();
  if (backupDirectory.exists) backupDirectory.delete();
  stagingDirectory.create({ idempotent: true, intermediates: true });

  try {
    for (const url of urls) {
      const target = new File(stagingDirectory, await fileNameFor(url));
      const downloaded = await File.downloadFileAsync(url, target, { idempotent: true });
      if (!downloaded.exists || downloaded.size <= 0 || downloaded.size > MAX_IMAGE_BYTES || (downloaded.type && !downloaded.type.startsWith('image/'))) {
        throw new Error('A workshop image was invalid, empty, or exceeded the 8 MB offline limit.');
      }
    }

    if (finalDirectory.exists) await finalDirectory.move(backupDirectory);
    await stagingDirectory.move(finalDirectory);
    if (backupDirectory.exists) backupDirectory.delete();
    return Object.fromEntries(await Promise.all(urls.map(async (url) => [url, new File(finalDirectory, await fileNameFor(url)).uri])));
  } catch (error) {
    if (stagingDirectory.exists) stagingDirectory.delete();
    if (!finalDirectory.exists && backupDirectory.exists) await backupDirectory.move(finalDirectory);
    throw error;
  }
}

export async function prepareWorkshopLibraryAssets(library: WorkshopLibraryEntry[], existing: WorkshopAssetMap): Promise<WorkshopAssetMap> {
  const next: WorkshopAssetMap = {};
  for (const entry of library) {
    const urls = getWorkshopImageUrls(entry);
    next[entry.manifest.versionId] = isWorkshopAssetMapAvailable(entry.manifest.versionId, urls, existing)
      ? existing[entry.manifest.versionId]
      : await cacheWorkshopVersionAssets(entry);
  }
  return next;
}

export function resolveWorkshopImageUri(versionId: string, remoteUrl: string | undefined, assetMap: WorkshopAssetMap) {
  if (!remoteUrl) return undefined;
  return assetMap[versionId]?.[remoteUrl] ?? remoteUrl;
}
