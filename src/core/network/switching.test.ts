import {
  ETHERNET_BROADCAST_MAC,
  processSwitchFrame,
  type MacTableEntry,
} from '@/core/network/switching';

const PC_A = '02:00:00:00:00:0A';
const PC_B = '02:00:00:00:00:0B';
const PC_C = '02:00:00:00:00:0C';
const PORTS = [1, 2, 3];

describe('Ethernet switch decisions', () => {
  test('learns a source MAC on the ingress port and floods an unknown destination', () => {
    const decision = processSwitchFrame([], {
      sourceMac: PC_A,
      destinationMac: PC_B,
      ingressPort: 1,
    }, PORTS);

    expect(decision.tableAfter).toEqual([{ macAddress: PC_A, port: 1 }]);
    expect(decision.reason).toBe('unknown-unicast');
    expect(decision.egressPorts).toEqual([2, 3]);
  });

  test('updates the port when a learned source moves', () => {
    const table: MacTableEntry[] = [{ macAddress: PC_A, port: 1 }];
    const decision = processSwitchFrame(table, {
      sourceMac: PC_A,
      destinationMac: PC_C,
      ingressPort: 3,
    }, PORTS);

    expect(decision.tableAfter).toEqual([{ macAddress: PC_A, port: 3 }]);
  });

  test('forwards a known unicast only to the learned destination port', () => {
    const table: MacTableEntry[] = [{ macAddress: PC_A, port: 1 }];
    const decision = processSwitchFrame(table, {
      sourceMac: PC_B,
      destinationMac: PC_A,
      ingressPort: 2,
    }, PORTS);

    expect(decision.reason).toBe('known-unicast');
    expect(decision.egressPorts).toEqual([1]);
    expect(decision.tableAfter).toContainEqual({ macAddress: PC_B, port: 2 });
  });

  test('floods a broadcast to every active port except ingress', () => {
    const decision = processSwitchFrame([], {
      sourceMac: PC_C,
      destinationMac: ETHERNET_BROADCAST_MAC,
      ingressPort: 3,
    }, PORTS);

    expect(decision.reason).toBe('broadcast');
    expect(decision.egressPorts).toEqual([1, 2]);
    expect(decision.egressPorts).not.toContain(3);
  });

  test('filters a known destination on the ingress port', () => {
    const table: MacTableEntry[] = [{ macAddress: PC_B, port: 2 }];
    const decision = processSwitchFrame(table, {
      sourceMac: PC_A,
      destinationMac: PC_B,
      ingressPort: 2,
    }, PORTS);

    expect(decision.action).toBe('filter');
    expect(decision.egressPorts).toEqual([]);
  });
});
