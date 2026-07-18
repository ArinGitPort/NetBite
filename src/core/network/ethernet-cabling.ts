import type { DeviceType } from '@/core/network/models';

export type EthernetCableType = 'straight-through' | 'crossover';

export interface EthernetCableTask {
  id: string;
  firstDevice: DeviceType;
  firstLabel: string;
  secondDevice: DeviceType;
  secondLabel: string;
  correctCable: EthernetCableType;
  explanation: string;
}

export interface EthernetCableLabResult {
  success: boolean;
  correctCount: number;
  total: number;
  firstIncorrectTask?: EthernetCableTask;
}

export const ethernetCableTasks: EthernetCableTask[] = [
  {
    id: 'pc-to-switch',
    firstDevice: 'pc',
    firstLabel: 'PC',
    secondDevice: 'switch',
    secondLabel: 'Switch',
    correctCable: 'straight-through',
    explanation: 'In legacy/manual cabling, unlike device types such as a PC and switch use straight-through wiring.',
  },
  {
    id: 'router-to-switch',
    firstDevice: 'router',
    firstLabel: 'Router',
    secondDevice: 'switch',
    secondLabel: 'Switch',
    correctCable: 'straight-through',
    explanation: 'In legacy/manual cabling, a router Ethernet interface connects to a switch with straight-through wiring.',
  },
  {
    id: 'switch-to-switch',
    firstDevice: 'switch',
    firstLabel: 'Switch A',
    secondDevice: 'switch',
    secondLabel: 'Switch B',
    correctCable: 'crossover',
    explanation: 'In legacy/manual cabling, like devices such as two switches use crossover wiring.',
  },
];

/** Checks cable choices for the lab's explicit legacy/manual Ethernet mode. */
export function validateEthernetCableChoices(
  selections: Partial<Record<string, EthernetCableType>>,
): EthernetCableLabResult {
  const firstIncorrectTask = ethernetCableTasks.find(
    (task) => selections[task.id] !== task.correctCable,
  );
  const correctCount = ethernetCableTasks.filter(
    (task) => selections[task.id] === task.correctCable,
  ).length;

  return {
    success: firstIncorrectTask === undefined,
    correctCount,
    total: ethernetCableTasks.length,
    firstIncorrectTask,
  };
}
