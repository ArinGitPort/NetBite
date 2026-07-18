import { ETHERNET_BROADCAST_MAC, type SwitchFrame } from '@/core/network/switching';

export const SWITCH_DESK_PORTS = [1, 2, 3];

export const SWITCH_DESK_ENDPOINTS = [
  { id: 'pc-a', name: 'PC A', macAddress: '02:00:00:00:00:0A', port: 1 },
  { id: 'pc-b', name: 'PC B', macAddress: '02:00:00:00:00:0B', port: 2 },
  { id: 'pc-c', name: 'PC C', macAddress: '02:00:00:00:00:0C', port: 3 },
] as const;

export type SwitchPrediction = 'port-1' | 'port-2' | 'port-3' | 'flood';

export interface SwitchDeskScenario {
  id: string;
  title: string;
  sourceName: string;
  destinationName: string;
  frame: SwitchFrame;
}

const [pcA, pcB, pcC] = SWITCH_DESK_ENDPOINTS;

export const SWITCH_DESK_SCENARIOS: SwitchDeskScenario[] = [
  {
    id: 'unknown-a-to-b',
    title: 'FIRST CONTACT',
    sourceName: pcA.name,
    destinationName: pcB.name,
    frame: { sourceMac: pcA.macAddress, destinationMac: pcB.macAddress, ingressPort: pcA.port },
  },
  {
    id: 'known-b-to-a',
    title: 'REPLY FRAME',
    sourceName: pcB.name,
    destinationName: pcA.name,
    frame: { sourceMac: pcB.macAddress, destinationMac: pcA.macAddress, ingressPort: pcB.port },
  },
  {
    id: 'broadcast-c',
    title: 'LOCAL BROADCAST',
    sourceName: pcC.name,
    destinationName: 'EVERY INTERFACE',
    frame: { sourceMac: pcC.macAddress, destinationMac: ETHERNET_BROADCAST_MAC, ingressPort: pcC.port },
  },
  {
    id: 'known-a-to-b',
    title: 'LEARNED DESTINATION',
    sourceName: pcA.name,
    destinationName: pcB.name,
    frame: { sourceMac: pcA.macAddress, destinationMac: pcB.macAddress, ingressPort: pcA.port },
  },
];

export const SWITCH_PREDICTIONS: { id: SwitchPrediction; label: string }[] = [
  { id: 'port-1', label: 'FORWARD TO PORT 1' },
  { id: 'port-2', label: 'FORWARD TO PORT 2' },
  { id: 'port-3', label: 'FORWARD TO PORT 3' },
  { id: 'flood', label: 'FLOOD OTHER PORTS' },
];
