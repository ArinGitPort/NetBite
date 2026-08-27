import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { WorkshopAttemptDraft, WorkshopLibraryEntry } from '@/core/workshops/types';
import type { WorkshopAssetMap } from '@/core/workshops/workshop-assets';
import { mergeCompatibleWorkshopLibrary } from '@/core/workshops/workshop-library';
import { gameStorage } from '@/store/game-storage';

interface WorkshopState {
  library: WorkshopLibraryEntry[];
  drafts: Record<string, WorkshopAttemptDraft>;
  assetUris: WorkshopAssetMap;
  lastUpdatedAt?: string;
  replaceLibrary: (library: WorkshopLibraryEntry[], assetUris?: WorkshopAssetMap) => void;
  toggleSavedLesson: (classId: string, lessonId: string) => boolean;
  saveDraft: (draft: WorkshopAttemptDraft) => void;
  clearDraft: (classId: string, assessmentId: string) => void;
  clearWorkshops: () => void;
}

const draftKey = (classId: string, assessmentId: string) => `${classId}:${assessmentId}`;

function validLibrary(value: unknown): WorkshopLibraryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is WorkshopLibraryEntry => Boolean(entry && typeof entry === 'object' && typeof entry.classId === 'string' && entry.manifest && typeof entry.manifest.versionId === 'string' && Array.isArray(entry.manifest.lessons)));
}

export const useWorkshopStore = create<WorkshopState>()(persist((set) => ({
  library: [],
  drafts: {},
  assetUris: {},
  replaceLibrary: (library, assetUris) => set((state) => ({ library: mergeCompatibleWorkshopLibrary(state.library, library), assetUris: assetUris ?? state.assetUris, lastUpdatedAt: new Date().toISOString() })),
  toggleSavedLesson: (classId, lessonId) => {
    let nextSaved = false;
    set((state) => ({ library: state.library.map((entry) => {
      if (entry.classId !== classId) return entry;
      nextSaved = !entry.savedLessonIds.includes(lessonId);
      return { ...entry, savedLessonIds: nextSaved ? [...entry.savedLessonIds, lessonId] : entry.savedLessonIds.filter((id) => id !== lessonId) };
    }) }));
    return nextSaved;
  },
  saveDraft: (draft) => set((state) => ({ drafts: { ...state.drafts, [draftKey(draft.classId, draft.assessmentId)]: draft } })),
  clearDraft: (classId, assessmentId) => set((state) => { const drafts = { ...state.drafts }; delete drafts[draftKey(classId, assessmentId)]; return { drafts }; }),
  clearWorkshops: () => set({ library: [], drafts: {}, assetUris: {}, lastUpdatedAt: undefined }),
}), {
  name: 'netbite-workshops-v1',
  storage: createJSONStorage(() => gameStorage),
  version: 2,
  skipHydration: true,
  partialize: (state) => ({ library: state.library, drafts: state.drafts, assetUris: state.assetUris, lastUpdatedAt: state.lastUpdatedAt }),
  merge: (persisted, current) => ({ ...current, ...(persisted as Partial<WorkshopState>), assetUris: (persisted as Partial<WorkshopState> | undefined)?.assetUris ?? {}, library: validLibrary((persisted as Partial<WorkshopState> | undefined)?.library) }),
}));

export const getWorkshopDraft = (classId: string, assessmentId: string) => useWorkshopStore.getState().drafts[draftKey(classId, assessmentId)];
