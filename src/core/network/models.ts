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

export interface PacketDemoPath {
  source: DeviceNode;
  intermediary: DeviceNode;
  destination: DeviceNode;
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

function connectedDeviceIds(topology: NetworkTopology, deviceId: string) {
  return new Set(
    topology.cables.flatMap((cable) => {
      if (cable.fromDeviceId === deviceId) return [cable.toDeviceId];
      if (cable.toDeviceId === deviceId) return [cable.fromDeviceId];
      return [];
    }),
  );
}

/** Returns one simple PC -> switch -> PC path for the Chapter 1 visual demo. */
export function findPacketDemoPath(topology: NetworkTopology): PacketDemoPath | undefined {
  const pcs = topology.devices.filter((device) => device.type === 'pc');
  const switches = topology.devices.filter((device) => device.type === 'switch');

  for (const networkSwitch of switches) {
    const connections = connectedDeviceIds(topology, networkSwitch.id);
    const connectedPCs = pcs.filter((pc) => connections.has(pc.id));
    if (connectedPCs.length >= 2) {
      return {
        source: connectedPCs[0],
        intermediary: networkSwitch,
        destination: connectedPCs[1],
      };
    }
  }

  return undefined;
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

  const successfulSwitch = switches.find((networkSwitch) => {
    const connections = connectedDeviceIds(topology, networkSwitch.id);
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
