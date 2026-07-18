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

export type ConnectionSelectionResult =
  | 'start-selected'
  | 'connected'
  | 'cancelled'
  | 'duplicate'
  | 'device-missing';

let nextDeviceId = 0;
const deviceIdSession = Date.now().toString(36);

function createDevice(type: DeviceType, name: string, position: Position): DeviceNode {
  nextDeviceId += 1;
  return { id: `${type}-${deviceIdSession}-${nextDeviceId}`, type, name, position };
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

export function getNextDeviceName(topology: NetworkTopology, type: DeviceType): string {
  const label = type === 'pc' ? 'PC' : type === 'switch' ? 'Switch' : 'Router';
  const usedNumbers = new Set(
    topology.devices
      .filter((device) => device.type === type)
      .map((device) => Number(device.name.match(/(\d+)$/)?.[1]))
      .filter((number) => Number.isInteger(number) && number > 0),
  );

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;
  return `${label} ${nextNumber}`;
}

const DEFAULT_CANVAS_WIDTH = 272;
const DEFAULT_DEVICE_SIZE = 88;

export function createChapterOneTopology(
  canvasWidth = DEFAULT_CANVAS_WIDTH,
  deviceSize = DEFAULT_DEVICE_SIZE,
): NetworkTopology {
  const centeredX = Math.max(0, (canvasWidth - deviceSize) / 2);
  const horizontalSpread = Math.min(88, Math.max(0, centeredX - 8));

  return {
    devices: [
      createPC('PC 1', { x: centeredX - horizontalSpread, y: 56 }),
      createSwitch('Switch 1', { x: centeredX, y: 176 }),
      createPC('PC 2', { x: centeredX + horizontalSpread, y: 56 }),
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

/** Returns a PC -> switch -> PC path, optionally constrained to chosen endpoints. */
export function findPacketDemoPath(
  topology: NetworkTopology,
  sourceId?: string,
  destinationId?: string,
): PacketDemoPath | undefined {
  const pcs = topology.devices.filter((device) => device.type === 'pc');
  const sources = sourceId ? pcs.filter((pc) => pc.id === sourceId) : pcs;
  const switches = topology.devices.filter((device) => device.type === 'switch');

  for (const networkSwitch of switches) {
    const connections = connectedDeviceIds(topology, networkSwitch.id);
    const connectedPCs = pcs.filter((pc) => connections.has(pc.id));

    for (const source of sources) {
      if (!connections.has(source.id)) continue;
      const destination = destinationId
        ? connectedPCs.find((pc) => pc.id === destinationId && pc.id !== source.id)
        : connectedPCs.find((pc) => pc.id !== source.id);

      if (destination) return { source, intermediary: networkSwitch, destination };
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
