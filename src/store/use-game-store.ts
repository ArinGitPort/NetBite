import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { gameStorage } from '@/store/game-storage';

import {
  createChapterOneTopology,
  createPC,
  createRouter,
  createSwitch,
  getNextDeviceName,
  type CableEdge,
  type ConnectionSelectionResult,
  type DeviceNode,
  type DeviceType,
  type NetworkTopology,
  type Position,
} from '@/core/network/models';

export interface GameState {
  topology: NetworkTopology;
  topologyCanvasWidth: number;
  selectedConnectionStartId?: string;
  selectedDeviceForRemovalId?: string;
  completedLessonIds: string[];
  quizScores: Record<string, number>;
  quizContentVersions: Record<string, number>;
  reviewedFlashcardChapterIds: string[];
  flashcardContentVersions: Record<string, number>;
  flashcardPositions: Record<string, number>;
  completedLabIds: string[];
  addDevice: (type: DeviceType, position: Position) => void;
  moveDevice: (deviceId: string, position: Position) => void;
  removeDevice: (deviceId: string) => void;
  selectDeviceForRemoval: (deviceId: string) => void;
  clearDeviceForRemoval: () => void;
  selectDeviceForConnection: (deviceId: string) => ConnectionSelectionResult;
  removeCable: (cableId: string) => void;
  cancelConnection: () => void;
  resizeTopologyCanvas: (width: number, deviceSize: number) => void;
  resetLab: () => void;
  completeLesson: (lessonId: string) => void;
  saveQuizScore: (chapterId: string, score: number, contentVersion: number) => void;
  markFlashcardsReviewed: (chapterId: string, contentVersion: number) => void;
  saveFlashcardPosition: (chapterId: string, index: number) => void;
  clearFlashcardPosition: (chapterId: string) => void;
  completeLab: (labId: string) => void;
}

function buildDevice(type: DeviceType, name: string, position: Position): DeviceNode {
  if (type === 'pc') return createPC(name, position);
  if (type === 'switch') return createSwitch(name, position);
  return createRouter(name, position);
}

function cableExists(cables: CableEdge[], firstId: string, secondId: string) {
  return cables.some(
    (cable) =>
      (cable.fromDeviceId === firstId && cable.toDeviceId === secondId) ||
      (cable.fromDeviceId === secondId && cable.toDeviceId === firstId),
  );
}

export const useGameStore = create<GameState>()(persist((set, get) => ({
  topology: createChapterOneTopology(),
  topologyCanvasWidth: 272,
  completedLessonIds: [],
  quizScores: {},
  quizContentVersions: {},
  reviewedFlashcardChapterIds: [],
  flashcardContentVersions: {},
  flashcardPositions: {},
  completedLabIds: [],

  addDevice: (type, position) =>
    set((state) => {
      return {
        topology: {
          ...state.topology,
          devices: [...state.topology.devices, buildDevice(type, getNextDeviceName(state.topology, type), position)],
        },
      };
    }),

  moveDevice: (deviceId, position) =>
    set((state) => ({
      topology: {
        ...state.topology,
        devices: state.topology.devices.map((device) =>
          device.id === deviceId ? { ...device, position } : device,
        ),
      },
    })),

  removeDevice: (deviceId) =>
    set((state) => ({
      selectedConnectionStartId: state.selectedConnectionStartId === deviceId
        ? undefined
        : state.selectedConnectionStartId,
      selectedDeviceForRemovalId: state.selectedDeviceForRemovalId === deviceId
        ? undefined
        : state.selectedDeviceForRemovalId,
      topology: {
        devices: state.topology.devices.filter((device) => device.id !== deviceId),
        cables: state.topology.cables.filter(
          (cable) => cable.fromDeviceId !== deviceId && cable.toDeviceId !== deviceId,
        ),
      },
    })),

  selectDeviceForRemoval: (deviceId) =>
    set((state) => ({
      selectedConnectionStartId: undefined,
      selectedDeviceForRemovalId: state.selectedDeviceForRemovalId === deviceId
        ? undefined
        : deviceId,
    })),
  clearDeviceForRemoval: () => set({ selectedDeviceForRemovalId: undefined }),

  selectDeviceForConnection: (deviceId) => {
    const state = get();
    if (!state.topology.devices.some((device) => device.id === deviceId)) return 'device-missing';

    const startId = state.selectedConnectionStartId;
    if (!startId) {
      set({ selectedConnectionStartId: deviceId, selectedDeviceForRemovalId: undefined });
      return 'start-selected';
    }
    if (startId === deviceId) {
      set({ selectedConnectionStartId: undefined, selectedDeviceForRemovalId: undefined });
      return 'cancelled';
    }
    if (cableExists(state.topology.cables, startId, deviceId)) {
      set({ selectedConnectionStartId: undefined, selectedDeviceForRemovalId: undefined });
      return 'duplicate';
    }

    const cable: CableEdge = {
      id: `cable-${startId}-${deviceId}`,
      fromDeviceId: startId,
      toDeviceId: deviceId,
    };
    set({
      selectedConnectionStartId: undefined,
      selectedDeviceForRemovalId: undefined,
      topology: { ...state.topology, cables: [...state.topology.cables, cable] },
    });
    return 'connected';
  },

  removeCable: (cableId) =>
    set((state) => ({
      topology: {
        ...state.topology,
        cables: state.topology.cables.filter((cable) => cable.id !== cableId),
      },
    })),
  cancelConnection: () => set({ selectedConnectionStartId: undefined }),
  resizeTopologyCanvas: (width, deviceSize) =>
    set((state) => {
      if (width === state.topologyCanvasWidth) return state;
      const centerShift = (width - state.topologyCanvasWidth) / 2;
      return {
        topologyCanvasWidth: width,
        topology: {
          ...state.topology,
          devices: state.topology.devices.map((device) => ({
            ...device,
            position: {
              ...device.position,
              x: Math.max(0, Math.min(width - deviceSize, device.position.x + centerShift)),
            },
          })),
        },
      };
    }),
  resetLab: () =>
    set((state) => ({
      topology: createChapterOneTopology(state.topologyCanvasWidth),
      selectedConnectionStartId: undefined,
      selectedDeviceForRemovalId: undefined,
    })),
  completeLesson: (lessonId) =>
    set((state) => ({
      completedLessonIds: state.completedLessonIds.includes(lessonId)
        ? state.completedLessonIds
        : [...state.completedLessonIds, lessonId],
    })),
  saveQuizScore: (chapterId, score, contentVersion) => set((state) => ({
    quizScores: {
      ...state.quizScores,
      [chapterId]: state.quizContentVersions[chapterId] === contentVersion
        ? Math.max(state.quizScores[chapterId] ?? 0, score)
        : score,
    },
    quizContentVersions: { ...state.quizContentVersions, [chapterId]: contentVersion },
  })),
  markFlashcardsReviewed: (chapterId, contentVersion) => set((state) => ({
    reviewedFlashcardChapterIds: state.reviewedFlashcardChapterIds.includes(chapterId)
      ? state.reviewedFlashcardChapterIds
      : [...state.reviewedFlashcardChapterIds, chapterId],
    flashcardContentVersions: { ...state.flashcardContentVersions, [chapterId]: contentVersion },
  })),
  saveFlashcardPosition: (chapterId, index) => set((state) => ({
    flashcardPositions: { ...state.flashcardPositions, [chapterId]: Math.max(0, index) },
  })),
  clearFlashcardPosition: (chapterId) => set((state) => {
    const flashcardPositions = { ...state.flashcardPositions };
    delete flashcardPositions[chapterId];
    return { flashcardPositions };
  }),
  completeLab: (labId) => set((state) => ({
    completedLabIds: state.completedLabIds.includes(labId)
      ? state.completedLabIds
      : [...state.completedLabIds, labId],
  })),
}), {
  name: 'netbite-game-state-v1',
  storage: createJSONStorage(() => gameStorage),
  version: 4,
  skipHydration: true,
  partialize: (state) => ({
    topology: state.topology,
    topologyCanvasWidth: state.topologyCanvasWidth,
    completedLessonIds: state.completedLessonIds,
    quizScores: state.quizScores,
    quizContentVersions: state.quizContentVersions,
    reviewedFlashcardChapterIds: state.reviewedFlashcardChapterIds,
    flashcardContentVersions: state.flashcardContentVersions,
    flashcardPositions: state.flashcardPositions,
    completedLabIds: state.completedLabIds,
  }),
  migrate: (persistedState, version) => {
    const legacyState = persistedState as Partial<GameState> & {
      quizScore?: number;
      flashcardsReviewed?: boolean;
      labComplete?: boolean;
    };
    const migratedState = version >= 2
      ? legacyState
      : {
          ...legacyState,
          quizScores: legacyState.quizScore === undefined ? {} : { 1: legacyState.quizScore },
          reviewedFlashcardChapterIds: legacyState.flashcardsReviewed ? ['1'] : [],
          completedLabIds: legacyState.labComplete ? ['first-network'] : [],
        };

    const legacyQuizVersions = Object.fromEntries(Object.keys(migratedState.quizScores ?? {}).map((chapterId) => [chapterId, 1]));
    const legacyFlashcardVersions = Object.fromEntries((migratedState.reviewedFlashcardChapterIds ?? []).map((chapterId) => [chapterId, 1]));

    return {
      ...migratedState,
      flashcardPositions: migratedState.flashcardPositions ?? {},
      quizContentVersions: migratedState.quizContentVersions ?? legacyQuizVersions,
      flashcardContentVersions: migratedState.flashcardContentVersions ?? legacyFlashcardVersions,
    } as GameState;
  },
}));
