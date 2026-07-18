import type { StateStorage } from 'zustand/middleware';

const memoryFallback = new Map<string, string>();

function getBrowserStorage() {
  try {
    return typeof globalThis.localStorage === 'undefined' ? undefined : globalThis.localStorage;
  } catch {
    return undefined;
  }
}

// Web is a preview target. Browser storage avoids Expo SQLite's alpha WASM setup
// while preserving the same persisted-game behavior during local testing.
export const gameStorage: StateStorage = {
  getItem: (name) => {
    const browserStorage = getBrowserStorage();

    try {
      return browserStorage?.getItem(name) ?? memoryFallback.get(name) ?? null;
    } catch {
      return memoryFallback.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    const browserStorage = getBrowserStorage();

    try {
      browserStorage?.setItem(name, value);
    } catch {
      memoryFallback.set(name, value);
      return;
    }

    if (!browserStorage) memoryFallback.set(name, value);
  },
  removeItem: (name) => {
    const browserStorage = getBrowserStorage();

    try {
      browserStorage?.removeItem(name);
    } finally {
      memoryFallback.delete(name);
    }
  },
};
