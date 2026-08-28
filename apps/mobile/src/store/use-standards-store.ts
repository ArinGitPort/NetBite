import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { parseRfcMetadataResponse, type RfcCacheEntry, type RfcMetadata } from '@/core/standards/ietf-api';
import { gameStorage } from '@/store/game-storage';

interface StandardsState {
  cache: Record<string, RfcCacheEntry>;
  cacheMetadata: (metadata: RfcMetadata, retrievedAt?: string) => RfcCacheEntry;
  getCachedMetadata: (documentName: string) => RfcCacheEntry | undefined;
  clearCache: () => void;
}

export function validateRfcCache(value: unknown): Record<string, RfcCacheEntry> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value).reduce<Record<string, RfcCacheEntry>>((valid, [key, entry]) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return valid;
    const candidate = entry as Partial<RfcCacheEntry>;
    if (typeof candidate.retrievedAt !== 'string' || Number.isNaN(Date.parse(candidate.retrievedAt))) return valid;
    try {
      const metadata = parseRfcMetadataResponse(candidate.metadata?.rawResponse);
      if (metadata.name !== key.toLowerCase()) return valid;
      valid[key.toLowerCase()] = { metadata, retrievedAt: candidate.retrievedAt };
    } catch {
      // Ignore malformed cache entries so a damaged record cannot block startup.
    }
    return valid;
  }, {});
}

export const useStandardsStore = create<StandardsState>()(persist((set, get) => ({
  cache: {},
  cacheMetadata: (metadata, retrievedAt = new Date().toISOString()) => {
    const entry = { metadata, retrievedAt };
    set((state) => ({ cache: { ...state.cache, [metadata.name]: entry } }));
    return entry;
  },
  getCachedMetadata: (documentName) => get().cache[documentName.trim().toLowerCase()],
  clearCache: () => set({ cache: {} }),
}), {
  name: 'netbite-standards-cache-v1',
  storage: createJSONStorage(() => gameStorage),
  version: 1,
  skipHydration: true,
  partialize: (state) => ({ cache: state.cache }),
  merge: (persisted, current) => ({ ...current, cache: validateRfcCache((persisted as Partial<StandardsState> | undefined)?.cache) }),
}));

export function getCachedRfcMetadata(documentName: string) {
  return useStandardsStore.getState().getCachedMetadata(documentName);
}
