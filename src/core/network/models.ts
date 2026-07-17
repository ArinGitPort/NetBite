export type DeviceType = 'pc' | 'switch' | 'router';

export interface Position {
  x: number;
  y: number;
}

export interface DeviceNode {
  id: string;
  type: DeviceType;
  name: string;
  position: Position;
}

export interface CableEdge {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
}

export interface NetworkTopology {
  devices: DeviceNode[];
  cables: CableEdge[];
}

export interface LabValidationResult {
  success: boolean;
  reason: string;
  learningTip?: string;
}

let nextDeviceId = 0;

function createDevice(type: DeviceType, name: string, position: Position): DeviceNode {
  nextDeviceId += 1;
  return { id: `${type}-${nextDeviceId}`, type, name, position };
}

export function createPC(name: string, position: Position): DeviceNode {
  return createDevice('pc', name, position);
}

export function createSwitch(name: string, position: Position): DeviceNode {
  return createDevice('switch', name, position);
}

export function createRouter(name: string, position: Position): DeviceNode {
  return createDevice('router', name, position);
}

export function createChapterOneTopology(): NetworkTopology {
  return {
    devices: [
      createPC('PC 1', { x: 8, y: 56 }),
      createSwitch('Switch 1', { x: 96, y: 176 }),
      createPC('PC 2', { x: 176, y: 56 }),
    ],
    cables: [],
  };
}

/** Validates only the physical connection concept taught in Chapter 1. */
export function validateTwoPCsToSameSwitch(topology: NetworkTopology): LabValidationResult {
  const pcs = topology.devices.filter((device) => device.type === 'pc');
  const switches = topology.devices.filter((device) => device.type === 'switch');

  if (pcs.length < 2) {
    return {
      success: false,
      reason: 'Place at least two PCs on the canvas.',
      learningTip: 'A network needs two or more connected devices.',
    };
  }

  if (switches.length === 0) {
    return {
      success: false,
      reason: 'Add a switch so the PCs have a shared connection point.',
      learningTip: 'A switch connects devices inside the same local network.',
    };
  }

  const connectedDeviceIds = (switchId: string) =>
    new Set(
      topology.cables.flatMap((cable) => {
        if (cable.fromDeviceId === switchId) return [cable.toDeviceId];
        if (cable.toDeviceId === switchId) return [cable.fromDeviceId];
        return [];
      }),
    );

  const successfulSwitch = switches.find((networkSwitch) => {
    const connections = connectedDeviceIds(networkSwitch.id);
    return pcs.filter((pc) => connections.has(pc.id)).length >= 2;
  });

  if (!successfulSwitch) {
    return {
      success: false,
      reason: 'Connect both PCs to the same switch.',
      learningTip: 'Tap Connect, then tap a PC and the switch. Repeat for the other PC.',
    };
  }

  return {
    success: true,
    reason: 'Nice work! Both PCs are connected to the same switch.',
    learningTip: 'You built a small local area network (LAN).',
  };
}
