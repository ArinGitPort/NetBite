import {
  createChapterOneTopology,
  createPC,
  createSwitch,
  findPacketDemoPath,
  getNextDeviceName,
  validateTwoPCsToSameSwitch,
  type NetworkTopology,
} from '@/core/network/models';

function cable(id: string, fromDeviceId: string, toDeviceId: string) {
  return { id, fromDeviceId, toDeviceId };
}

describe('Chapter 1 network rules', () => {
  test('starts with two PCs and one switch but no completed network', () => {
    const topology = createChapterOneTopology();

    expect(topology.devices.filter((device) => device.type === 'pc')).toHaveLength(2);
    expect(topology.devices.filter((device) => device.type === 'switch')).toHaveLength(1);
    expect(validateTwoPCsToSameSwitch(topology).success).toBe(false);
  });

  test('accepts two PCs connected to the same switch', () => {
    const topology = createChapterOneTopology();
    const [firstPC, networkSwitch, secondPC] = topology.devices;
    topology.cables = [
      cable('first', firstPC.id, networkSwitch.id),
      cable('second', secondPC.id, networkSwitch.id),
    ];

    expect(validateTwoPCsToSameSwitch(topology).success).toBe(true);
    expect(findPacketDemoPath(topology)).toMatchObject({
      source: { id: firstPC.id },
      intermediary: { id: networkSwitch.id },
      destination: { id: secondPC.id },
    });
  });

  test('routes a packet between the selected PCs when more than two are connected', () => {
    const topology = createChapterOneTopology();
    const [firstPC, networkSwitch, secondPC] = topology.devices;
    const thirdPC = createPC('PC 3', { x: 0, y: 0 });
    topology.devices.push(thirdPC);
    topology.cables = [
      cable('first', firstPC.id, networkSwitch.id),
      cable('second', secondPC.id, networkSwitch.id),
      cable('third', thirdPC.id, networkSwitch.id),
    ];

    expect(findPacketDemoPath(topology, thirdPC.id, firstPC.id)).toMatchObject({
      source: { id: thirdPC.id },
      intermediary: { id: networkSwitch.id },
      destination: { id: firstPC.id },
    });
    expect(findPacketDemoPath(topology, firstPC.id, firstPC.id)).toBeUndefined();
  });

  test('rejects PCs connected to different switches', () => {
    const firstPC = createPC('PC 1', { x: 0, y: 0 });
    const secondPC = createPC('PC 2', { x: 0, y: 0 });
    const firstSwitch = createSwitch('Switch 1', { x: 0, y: 0 });
    const secondSwitch = createSwitch('Switch 2', { x: 0, y: 0 });
    const topology: NetworkTopology = {
      devices: [firstPC, secondPC, firstSwitch, secondSwitch],
      cables: [
        cable('first', firstPC.id, firstSwitch.id),
        cable('second', secondPC.id, secondSwitch.id),
      ],
    };

    expect(validateTwoPCsToSameSwitch(topology)).toMatchObject({
      success: false,
      reason: 'Connect both PCs to the same switch.',
    });
  });

  test('reuses an available label without duplicating an existing device name', () => {
    const topology: NetworkTopology = {
      devices: [
        createPC('PC 2', { x: 0, y: 0 }),
        createPC('PC 3', { x: 0, y: 0 }),
      ],
      cables: [],
    };

    expect(getNextDeviceName(topology, 'pc')).toBe('PC 1');
  });
});
