export type SwitchPort = number;

export interface MacTableEntry {
  macAddress: string;
  port: SwitchPort;
}

export interface SwitchFrame {
  sourceMac: string;
  destinationMac: string;
  ingressPort: SwitchPort;
}

export type SwitchDecisionReason = 'known-unicast' | 'unknown-unicast' | 'broadcast' | 'same-port';
export type SwitchDecisionAction = 'forward' | 'flood' | 'filter';

export interface SwitchDecision {
  action: SwitchDecisionAction;
  reason: SwitchDecisionReason;
  learnedEntry: MacTableEntry;
  tableAfter: MacTableEntry[];
  egressPorts: SwitchPort[];
}

export const ETHERNET_BROADCAST_MAC = 'FF:FF:FF:FF:FF:FF';

export function normalizeMacAddress(macAddress: string) {
  return macAddress.toUpperCase();
}

function learnSource(table: MacTableEntry[], sourceMac: string, ingressPort: SwitchPort) {
  const normalizedSource = normalizeMacAddress(sourceMac);
  const learnedEntry = { macAddress: normalizedSource, port: ingressPort };
  const existingIndex = table.findIndex(
    (entry) => normalizeMacAddress(entry.macAddress) === normalizedSource,
  );

  if (existingIndex < 0) return { learnedEntry, tableAfter: [...table, learnedEntry] };

  const tableAfter = [...table];
  tableAfter[existingIndex] = learnedEntry;
  return { learnedEntry, tableAfter };
}

/**
 * Applies one deterministic Ethernet switching decision.
 * The function models source learning and destination lookup only; it has no timing or traffic simulation.
 */
export function processSwitchFrame(
  table: MacTableEntry[],
  frame: SwitchFrame,
  activePorts: SwitchPort[],
): SwitchDecision {
  const { learnedEntry, tableAfter } = learnSource(table, frame.sourceMac, frame.ingressPort);
  const destinationMac = normalizeMacAddress(frame.destinationMac);
  const otherActivePorts = activePorts.filter((port) => port !== frame.ingressPort);

  if (destinationMac === ETHERNET_BROADCAST_MAC) {
    return {
      action: 'flood',
      reason: 'broadcast',
      learnedEntry,
      tableAfter,
      egressPorts: otherActivePorts,
    };
  }

  const destinationEntry = tableAfter.find(
    (entry) => normalizeMacAddress(entry.macAddress) === destinationMac,
  );

  if (!destinationEntry || !activePorts.includes(destinationEntry.port)) {
    return {
      action: 'flood',
      reason: 'unknown-unicast',
      learnedEntry,
      tableAfter,
      egressPorts: otherActivePorts,
    };
  }

  if (destinationEntry.port === frame.ingressPort) {
    return {
      action: 'filter',
      reason: 'same-port',
      learnedEntry,
      tableAfter,
      egressPorts: [],
    };
  }

  return {
    action: 'forward',
    reason: 'known-unicast',
    learnedEntry,
    tableAfter,
    egressPorts: [destinationEntry.port],
  };
}
