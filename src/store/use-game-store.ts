import { create } from 'zustand';

import {
  createChapterOneTopology,
  createPC,
  createRouter,
  createSwitch,
  type CableEdge,
  type DeviceNode,
  type DeviceType,
  type NetworkTopology,
  type Position,
} from '@/core/network/models';

interface GameState {
  topology: NetworkTopology;
  selectedConnectionStartId?: string;
  completedLessonIds: string[];
  quizScore?: number;
  flashcardsReviewed: boolean;
  labComplete: boolean;
  addDevice: (type: DeviceType, position: Position) => void;
  moveDevice: (deviceId: string, position: Position) => void;
  selectDeviceForConnection: (deviceId: string) => void;
  removeCable: (cableId: string) => void;
  cancelConnection: () => void;
  resetLab: () => void;
  completeLesson: (lessonId: string) => void;
  saveQuizScore: (score: number) => void;
  markFlashcardsReviewed: () => void;
  completeLab: () => void;
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

export const useGameStore = create<GameState>((set) => ({
  topology: createChapterOneTopology(),
  completedLessonIds: [],
  flashcardsReviewed: false,
  labComplete: false,

  addDevice: (type, position) =>
    set((state) => {
      const count = state.topology.devices.filter((device) => device.type === type).length + 1;
      const label = type === 'pc' ? 'PC' : type === 'switch' ? 'Switch' : 'Router';
      return {
        topology: {
          ...state.topology,
          devices: [...state.topology.devices, buildDevice(type, `${label} ${count}`, position)],
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

  selectDeviceForConnection: (deviceId) =>
    set((state) => {
      const startId = state.selectedConnectionStartId;
      if (!startId) return { selectedConnectionStartId: deviceId };
      if (startId === deviceId) return { selectedConnectionStartId: undefined };
      if (cableExists(state.topology.cables, startId, deviceId)) {
        return { selectedConnectionStartId: undefined };
      }

      const cable: CableEdge = {
        id: `cable-${startId}-${deviceId}`,
        fromDeviceId: startId,
        toDeviceId: deviceId,
      };
      return {
        selectedConnectionStartId: undefined,
        topology: { ...state.topology, cables: [...state.topology.cables, cable] },
      };
    }),

  removeCable: (cableId) =>
    set((state) => ({
      topology: {
        ...state.topology,
        cables: state.topology.cables.filter((cable) => cable.id !== cableId),
      },
    })),
  cancelConnection: () => set({ selectedConnectionStartId: undefined }),
  resetLab: () => set({ topology: createChapterOneTopology(), selectedConnectionStartId: undefined, labComplete: false }),
  completeLesson: (lessonId) =>
    set((state) => ({
      completedLessonIds: state.completedLessonIds.includes(lessonId)
        ? state.completedLessonIds
        : [...state.completedLessonIds, lessonId],
    })),
  saveQuizScore: (quizScore) => set({ quizScore }),
  markFlashcardsReviewed: () => set({ flashcardsReviewed: true }),
  completeLab: () => set({ labComplete: true }),
}));
