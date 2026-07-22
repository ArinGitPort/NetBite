import {
  calculateSubnetRange,
  parseIPv4Address,
  selectBestRoute,
  type RouteEntry,
} from '@/core/network/advanced-networking';
import {
  cloneCliNetwork,
  executeCliCommand,
  parseCliCommand,
  type CliCommandResult,
  type CliDeviceState,
  type CliNetworkState,
} from '@/core/network/cli-simulator';

export type SandboxDeviceType = 'pc' | 'switch' | 'router';
export type SandboxSwitchportMode = 'access' | 'trunk';

export interface SandboxPosition { x: number; y: number }
export interface SandboxInterface {
  id: string;
  name: string;
  macAddress: string;
  adminUp: boolean;
  ipv4?: string;
  prefix?: number;
  switchportMode?: SandboxSwitchportMode;
  accessVlan?: number;
  allowedVlans?: number[];
}
export interface SandboxArpEntry { ip: string; macAddress: string; interfaceId: string }
export interface SandboxMacEntry { macAddress: string; interfaceId: string; vlan: number }
export interface SandboxDevice {
  id: string;
  name: string;
  type: SandboxDeviceType;
  position: SandboxPosition;
  interfaces: SandboxInterface[];
  routes: RouteEntry[];
  vlans: number[];
  defaultGateway?: string;
  arpTable: SandboxArpEntry[];
  macTable: SandboxMacEntry[];
}
export interface SandboxLinkEndpoint { deviceId: string; interfaceId: string }
export interface SandboxLink { id: string; a: SandboxLinkEndpoint; b: SandboxLinkEndpoint }
export interface SandboxWorkspace {
  schemaVersion: 1;
  devices: SandboxDevice[];
  links: SandboxLink[];
  nextDeviceNumber: Record<SandboxDeviceType, number>;
}
export type SandboxTraceTone = 'neutral' | 'active' | 'success' | 'warning';
export interface SandboxTraceEvent {
  id: string;
  title: string;
  detail: string;
  deviceIds: string[];
  linkIds: string[];
  tone: SandboxTraceTone;
}
export interface SandboxTraceResult {
  success: boolean;
  reason: string;
  conclusion: string;
  suggestion?: string;
  events: SandboxTraceEvent[];
  state: SandboxWorkspace;
}
export interface SandboxCliExecutionResult {
  state: SandboxWorkspace;
  sessionState: CliNetworkState;
  result?: CliCommandResult;
  trace?: SandboxTraceResult;
  error?: string;
  workspaceMutated?: boolean;
}
export type SandboxConnectionResult =
  | { ok: true; state: SandboxWorkspace; link: SandboxLink }
  | { ok: false; reason: 'same-device' | 'duplicate' | 'no-free-interface' | 'layer2-cycle' | 'device-missing'; message: string };
export interface SandboxValidationIssue {
  level: 'warning' | 'error';
  code: string;
  message: string;
  deviceIds: string[];
}
export type SandboxPingReadinessIssueCode =
  | 'source-required'
  | 'source-missing'
  | 'source-unconfigured'
  | 'source-interface-down'
  | 'destination-required'
  | 'destination-invalid';
export interface SandboxPingReadinessIssue {
  code: SandboxPingReadinessIssueCode;
  message: string;
  deviceId?: string;
}
export interface SandboxPingReadiness {
  ready: boolean;
  sourceDeviceId?: string;
  sourceInterfaceId?: string;
  sourceAddress?: string;
  destinationIp?: string;
  issues: SandboxPingReadinessIssue[];
}
export interface SandboxBeginnerLanDeviceChange {
  deviceId: string;
  deviceName: string;
  before: string;
  after: string;
}
export interface SandboxBeginnerLanSetup {
  pcIds: [string, string];
  switchId: string;
  changes: SandboxBeginnerLanDeviceChange[];
  overwritesExistingConfiguration: boolean;
  requiresChanges: boolean;
}

export const SANDBOX_MAX_DEVICES = 12;
const BROADCAST_MAC = 'FF:FF:FF:FF:FF:FF';

function cloneWorkspace(state: SandboxWorkspace): SandboxWorkspace {
  return {
    ...state,
    nextDeviceNumber: { ...state.nextDeviceNumber },
    links: state.links.map((link) => ({ ...link, a: { ...link.a }, b: { ...link.b } })),
    devices: state.devices.map((device) => ({
      ...device,
      position: { ...device.position },
      routes: device.routes.map((route) => ({ ...route })),
      vlans: [...device.vlans],
      arpTable: device.arpTable.map((entry) => ({ ...entry })),
      macTable: device.macTable.map((entry) => ({ ...entry })),
      interfaces: device.interfaces.map((item) => ({
        ...item,
        allowedVlans: item.allowedVlans ? [...item.allowedVlans] : undefined,
      })),
    })),
  };
}

function macFor(deviceNumber: number, interfaceNumber: number) {
  return `02:4E:42:${deviceNumber.toString(16).padStart(2, '0')}:00:${interfaceNumber.toString(16).padStart(2, '0')}`.toUpperCase();
}

function interfaceNames(type: SandboxDeviceType) {
  if (type === 'pc') return ['E0'];
  if (type === 'switch') return Array.from({ length: 8 }, (_, index) => `F0/${index + 1}`);
  return Array.from({ length: 4 }, (_, index) => `G0/${index}`);
}

export function createSandboxDevice(type: SandboxDeviceType, number: number, position: SandboxPosition): SandboxDevice {
  const label = type === 'pc' ? 'PC' : type === 'switch' ? 'SW' : 'R';
  return {
    id: `${type}-${number}`,
    name: `${label}-${number}`,
    type,
    position,
    interfaces: interfaceNames(type).map((name, index) => ({
      id: name,
      name,
      macAddress: macFor(number + (type === 'switch' ? 40 : type === 'router' ? 80 : 0), index + 1),
      adminUp: true,
      ...(type === 'switch' ? { switchportMode: 'access' as const, accessVlan: 1 } : {}),
    })),
    routes: [],
    vlans: type === 'switch' ? [1] : [],
    arpTable: [],
    macTable: [],
  };
}

export function createEmptySandboxWorkspace(): SandboxWorkspace {
  return { schemaVersion: 1, devices: [], links: [], nextDeviceNumber: { pc: 1, switch: 1, router: 1 } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isSandboxWorkspace(value: unknown): value is SandboxWorkspace {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.devices) || !Array.isArray(value.links) || !isRecord(value.nextDeviceNumber)) return false;
  const counters = value.nextDeviceNumber;
  if (!(['pc', 'switch', 'router'] as const).every((type) => Number.isInteger(counters[type]) && Number(counters[type]) > 0)) return false;
  const deviceIds = new Set<string>();
  const interfaceIds = new Map<string, Set<string>>();
  for (const candidate of value.devices) {
    if (!isRecord(candidate) || typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !['pc', 'switch', 'router'].includes(String(candidate.type)) || !isRecord(candidate.position) || !Number.isFinite(candidate.position.x) || !Number.isFinite(candidate.position.y) || !Array.isArray(candidate.interfaces) || !candidate.interfaces.length || !Array.isArray(candidate.routes) || !Array.isArray(candidate.vlans) || !Array.isArray(candidate.arpTable) || !Array.isArray(candidate.macTable) || deviceIds.has(candidate.id)) return false;
    const ids = new Set<string>();
    for (const item of candidate.interfaces) {
      if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.macAddress !== 'string' || typeof item.adminUp !== 'boolean' || ids.has(item.id)) return false;
      ids.add(item.id);
    }
    if (candidate.type === 'pc' && (candidate.interfaces.length !== 1 || candidate.interfaces[0].id !== 'E0')) return false;
    deviceIds.add(candidate.id);
    interfaceIds.set(candidate.id, ids);
  }
  const linkIds = new Set<string>();
  const occupiedEndpoints = new Set<string>();
  return value.links.every((candidate) => {
    if (!isRecord(candidate) || typeof candidate.id !== 'string' || !isRecord(candidate.a) || !isRecord(candidate.b)) return false;
    const endpointIsValid = (endpoint: Record<string, unknown>) => typeof endpoint.deviceId === 'string' && typeof endpoint.interfaceId === 'string' && Boolean(interfaceIds.get(endpoint.deviceId)?.has(endpoint.interfaceId));
    if (!endpointIsValid(candidate.a) || !endpointIsValid(candidate.b) || linkIds.has(candidate.id)) return false;
    const aKey = `${candidate.a.deviceId}:${candidate.a.interfaceId}`; const bKey = `${candidate.b.deviceId}:${candidate.b.interfaceId}`;
    if (aKey === bKey || occupiedEndpoints.has(aKey) || occupiedEndpoints.has(bKey)) return false;
    linkIds.add(candidate.id); occupiedEndpoints.add(aKey); occupiedEndpoints.add(bKey);
    return true;
  });
}

export function createGuidedSandboxWorkspace(): SandboxWorkspace {
  let state = createEmptySandboxWorkspace();
  state = addSandboxDevice(state, 'pc', { x: 40, y: 80 }).state;
  state = addSandboxDevice(state, 'switch', { x: 250, y: 170 }).state;
  state = addSandboxDevice(state, 'pc', { x: 460, y: 80 }).state;
  return state;
}

export function createReadyRoutedSandboxWorkspace(): SandboxWorkspace {
  let state = createEmptySandboxWorkspace();
  state = addSandboxDevice(state, 'pc', { x: 10, y: 150 }).state;
  state = addSandboxDevice(state, 'switch', { x: 155, y: 150 }).state;
  state = addSandboxDevice(state, 'router', { x: 310, y: 150 }).state;
  state = addSandboxDevice(state, 'switch', { x: 465, y: 150 }).state;
  state = addSandboxDevice(state, 'pc', { x: 610, y: 150 }).state;
  for (const [first, second] of [['pc-1', 'switch-1'], ['switch-1', 'router-1'], ['router-1', 'switch-2'], ['switch-2', 'pc-2']] as const) {
    const result = connectSandboxInterfaces(state, first, second);
    if (result.ok) state = result.state;
  }
  state = configureSandboxDevice(state, 'pc-1', { interfaceId: 'E0', interface: { ipv4: '192.168.10.10', prefix: 24 }, defaultGateway: '192.168.10.1' }).state;
  state = configureSandboxDevice(state, 'router-1', { interfaceId: 'G0/0', interface: { ipv4: '192.168.10.1', prefix: 24 } }).state;
  state = configureSandboxDevice(state, 'router-1', { interfaceId: 'G0/1', interface: { ipv4: '192.168.20.1', prefix: 24 } }).state;
  state = configureSandboxDevice(state, 'pc-2', { interfaceId: 'E0', interface: { ipv4: '192.168.20.20', prefix: 24 }, defaultGateway: '192.168.20.1' }).state;
  return state;
}

export function addSandboxDevice(state: SandboxWorkspace, type: SandboxDeviceType, position: SandboxPosition) {
  if (state.devices.length >= SANDBOX_MAX_DEVICES) return { ok: false as const, state, message: `The sandbox supports up to ${SANDBOX_MAX_DEVICES} devices.` };
  const next = cloneWorkspace(state);
  const number = next.nextDeviceNumber[type];
  const device = createSandboxDevice(type, number, position);
  next.nextDeviceNumber[type] = number + 1;
  next.devices.push(device);
  return { ok: true as const, state: next, device };
}

export function moveSandboxDevice(state: SandboxWorkspace, deviceId: string, position: SandboxPosition) {
  const next = cloneWorkspace(state); const device = findDevice(next, deviceId);
  if (!device) return state;
  device.position = { x: Math.max(0, Math.min(640, position.x)), y: Math.max(0, Math.min(340, position.y)) };
  return next;
}

export function removeSandboxDevice(state: SandboxWorkspace, deviceId: string) {
  const next = cloneWorkspace(state);
  next.devices = next.devices.filter((device) => device.id !== deviceId);
  next.links = next.links.filter((link) => link.a.deviceId !== deviceId && link.b.deviceId !== deviceId);
  return next;
}

export function removeSandboxLink(state: SandboxWorkspace, linkId: string) {
  const next = cloneWorkspace(state);
  next.links = next.links.filter((link) => link.id !== linkId);
  return next;
}

function connectedInterfaceIds(state: SandboxWorkspace) {
  return new Set(state.links.flatMap((link) => [`${link.a.deviceId}:${link.a.interfaceId}`, `${link.b.deviceId}:${link.b.interfaceId}`]));
}

function findDevice(state: SandboxWorkspace, id: string) { return state.devices.find((device) => device.id === id); }
function findInterface(device: SandboxDevice | undefined, id: string) { return device?.interfaces.find((item) => item.id === id); }
function endpointKey(endpoint: SandboxLinkEndpoint) { return `${endpoint.deviceId}:${endpoint.interfaceId}`; }

function switchGraphHasPath(state: SandboxWorkspace, sourceId: string, destinationId: string) {
  const edges = state.links.flatMap((link) => {
    const a = findDevice(state, link.a.deviceId); const b = findDevice(state, link.b.deviceId);
    return a?.type === 'switch' && b?.type === 'switch' ? [[a.id, b.id] as const] : [];
  });
  const visited = new Set<string>(); const queue = [sourceId];
  while (queue.length) {
    const current = queue.shift()!;
    if (current === destinationId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    edges.forEach(([a, b]) => {
      if (a === current && !visited.has(b)) queue.push(b);
      if (b === current && !visited.has(a)) queue.push(a);
    });
  }
  return false;
}

export function connectSandboxInterfaces(
  state: SandboxWorkspace,
  firstDeviceId: string,
  secondDeviceId: string,
  preferredFirstInterfaceId?: string,
  preferredSecondInterfaceId?: string,
): SandboxConnectionResult {
  if (firstDeviceId === secondDeviceId) return { ok: false, reason: 'same-device', message: 'Choose two different devices.' };
  const first = findDevice(state, firstDeviceId); const second = findDevice(state, secondDeviceId);
  if (!first || !second) return { ok: false, reason: 'device-missing', message: 'One of the selected devices is no longer present.' };
  if (state.links.some((link) => [link.a.deviceId, link.b.deviceId].includes(firstDeviceId) && [link.a.deviceId, link.b.deviceId].includes(secondDeviceId))) {
    return { ok: false, reason: 'duplicate', message: 'These devices already have an Ethernet link.' };
  }
  if (first.type === 'switch' && second.type === 'switch' && switchGraphHasPath(state, first.id, second.id)) {
    return { ok: false, reason: 'layer2-cycle', message: 'That link would create a Layer 2 loop. STP is outside this sandbox, so loop-forming links are blocked.' };
  }
  const occupied = connectedInterfaceIds(state);
  const choose = (device: SandboxDevice, preferred?: string) => preferred
    ? device.interfaces.find((item) => item.id === preferred && !occupied.has(`${device.id}:${item.id}`))
    : device.interfaces.find((item) => !occupied.has(`${device.id}:${item.id}`));
  const aInterface = choose(first, preferredFirstInterfaceId); const bInterface = choose(second, preferredSecondInterfaceId);
  if (!aInterface || !bInterface) return { ok: false, reason: 'no-free-interface', message: 'A selected device has no free Ethernet interface.' };
  const next = cloneWorkspace(state);
  const link: SandboxLink = {
    id: `link-${first.id}-${aInterface.id}-${second.id}-${bInterface.id}`,
    a: { deviceId: first.id, interfaceId: aInterface.id },
    b: { deviceId: second.id, interfaceId: bInterface.id },
  };
  next.links.push(link);
  return { ok: true, state: next, link };
}

export function validateSandboxTopology(state: SandboxWorkspace): SandboxValidationIssue[] {
  const issues: SandboxValidationIssue[] = [];
  const addresses = new Map<string, string[]>();
  state.devices.forEach((device) => device.interfaces.forEach((item) => {
    if (!item.ipv4) return;
    addresses.set(item.ipv4, [...(addresses.get(item.ipv4) ?? []), device.id]);
    if (!parseIPv4Address(item.ipv4) || item.prefix === undefined || !calculateSubnetRange(item.ipv4, item.prefix)) {
      issues.push({ level: 'error', code: 'invalid-ipv4', message: `${device.name} ${item.name} has an invalid IPv4 configuration.`, deviceIds: [device.id] });
    } else if (item.prefix <= 30) {
      const range = calculateSubnetRange(item.ipv4, item.prefix)!;
      if (item.ipv4 === range.network || item.ipv4 === range.broadcast) issues.push({ level: 'warning', code: 'reserved-host-address', message: `${device.name} ${item.name} uses a network or broadcast address rather than an ordinary host address.`, deviceIds: [device.id] });
    }
  }));
  addresses.forEach((deviceIds, address) => {
    if (deviceIds.length > 1) issues.push({ level: 'warning', code: 'duplicate-ipv4', message: `${address} is configured on more than one interface.`, deviceIds });
  });
  state.devices.filter((device) => device.type === 'pc' && device.defaultGateway).forEach((device) => {
    const item = device.interfaces[0];
    if (!item.ipv4 || item.prefix === undefined || !calculateSubnetRange(item.ipv4, item.prefix) || !parseIPv4Address(device.defaultGateway!)) return;
    const hostRange = calculateSubnetRange(item.ipv4, item.prefix)!;
    const gatewayRange = calculateSubnetRange(device.defaultGateway!, item.prefix);
    if (!gatewayRange || gatewayRange.network !== hostRange.network) issues.push({ level: 'warning', code: 'gateway-off-subnet', message: `${device.name}'s gateway is outside its local subnet.`, deviceIds: [device.id] });
  });
  return issues;
}

export function getSandboxPingReadiness(
  state: SandboxWorkspace,
  sourceDeviceId?: string,
  destinationIp = '',
): SandboxPingReadiness {
  const issues: SandboxPingReadinessIssue[] = [];
  const source = sourceDeviceId ? findDevice(state, sourceDeviceId) : undefined;
  const normalizedDestination = destinationIp.trim();
  let selectedSourceInterface: SandboxInterface | undefined;
  if (!sourceDeviceId) {
    issues.push({ code: 'source-required', message: 'Choose a source device.' });
  } else if (!source) {
    issues.push({ code: 'source-missing', message: 'The selected source device is no longer available.' });
  } else {
    const configured = source.interfaces.filter((item) => item.ipv4 && item.prefix !== undefined && calculateSubnetRange(item.ipv4, item.prefix));
    if (!configured.length) {
      issues.push({ code: 'source-unconfigured', message: `${source.name} does not have a saved IPv4 address and prefix.`, deviceId: source.id });
    } else if (!configured.some((item) => item.adminUp)) {
      issues.push({ code: 'source-interface-down', message: `${source.name}'s addressed interface is down.`, deviceId: source.id });
    } else {
      selectedSourceInterface = sourceInterfaceForPing(source, normalizedDestination);
    }
  }

  if (!normalizedDestination) {
    issues.push({ code: 'destination-required', message: 'Enter or choose a destination IPv4 address.' });
  } else if (!parseIPv4Address(normalizedDestination)) {
    issues.push({ code: 'destination-invalid', message: 'Enter a valid destination such as 192.168.10.20.' });
  }

  return {
    ready: issues.length === 0,
    sourceDeviceId: source?.id,
    sourceInterfaceId: selectedSourceInterface?.id,
    sourceAddress: selectedSourceInterface?.ipv4,
    destinationIp: normalizedDestination || undefined,
    issues,
  };
}

function endpointForDevice(link: SandboxLink, deviceId: string) {
  if (link.a.deviceId === deviceId) return link.a;
  if (link.b.deviceId === deviceId) return link.b;
  return undefined;
}

export function previewBeginnerLanSetup(state: SandboxWorkspace): SandboxBeginnerLanSetup | undefined {
  const pcs = state.devices.filter((device) => device.type === 'pc').sort((a, b) => a.id.localeCompare(b.id));
  const switches = state.devices.filter((device) => device.type === 'switch');
  if (state.devices.length !== 3 || pcs.length !== 2 || switches.length !== 1) return undefined;
  const networkSwitch = switches[0];
  const pcLinks = pcs.map((pc) => state.links.find((link) => {
    const deviceIds = [link.a.deviceId, link.b.deviceId];
    return deviceIds.includes(pc.id) && deviceIds.includes(networkSwitch.id);
  }));
  const pcInterfaces = pcs.map((pc) => findInterface(pc, 'E0'));
  if (pcLinks.some((link) => !link) || pcInterfaces.some((item) => !item)) return undefined;

  const addresses = ['192.168.10.10', '192.168.10.20'] as const;
  const changes = pcs.map((pc, index) => {
    const item = pcInterfaces[index]!;
    const beforeAddress = item.ipv4 && item.prefix !== undefined ? `${item.ipv4}/${item.prefix}` : 'NOT CONFIGURED';
    const before = `${beforeAddress}${pc.defaultGateway ? ` / GATEWAY ${pc.defaultGateway}` : ''}${item.adminUp ? '' : ' / DOWN'}`;
    return { deviceId: pc.id, deviceName: pc.name, before, after: `${addresses[index]}/24 / NO GATEWAY` };
  });
  const switchNeedsChanges = pcLinks.some((link) => {
    const endpoint = endpointForDevice(link!, networkSwitch.id)!;
    const item = findInterface(networkSwitch, endpoint.interfaceId);
    return !item?.adminUp || item.switchportMode !== 'access' || (item.accessVlan ?? 1) !== 1;
  }) || !networkSwitch.vlans.includes(1);
  const pcNeedsChanges = pcs.some((pc, index) => {
    const item = pcInterfaces[index]!;
    return item.ipv4 !== addresses[index] || item.prefix !== 24 || !item.adminUp || Boolean(pc.defaultGateway);
  });
  const overwritesExistingConfiguration = pcs.some((pc, index) => {
    const item = pcInterfaces[index]!;
    return Boolean((item.ipv4 && item.ipv4 !== addresses[index]) || (item.prefix !== undefined && item.prefix !== 24) || pc.defaultGateway);
  }) || pcLinks.some((link) => {
    const endpoint = endpointForDevice(link!, networkSwitch.id)!;
    const item = findInterface(networkSwitch, endpoint.interfaceId);
    return item?.switchportMode === 'trunk' || (item?.accessVlan !== undefined && item.accessVlan !== 1);
  });

  return {
    pcIds: [pcs[0].id, pcs[1].id],
    switchId: networkSwitch.id,
    changes,
    overwritesExistingConfiguration,
    requiresChanges: pcNeedsChanges || switchNeedsChanges,
  };
}

export function applyBeginnerLanSetup(state: SandboxWorkspace) {
  const preview = previewBeginnerLanSetup(state);
  if (!preview) return { ok: false as const, state, message: 'Connect exactly two PCs to one switch before using the beginner setup.' };
  let next = state;
  const addresses = ['192.168.10.10', '192.168.10.20'] as const;
  preview.pcIds.forEach((deviceId, index) => {
    next = configureSandboxDevice(next, deviceId, {
      defaultGateway: '',
      interfaceId: 'E0',
      interface: { adminUp: true, ipv4: addresses[index], prefix: 24 },
    }).state;
  });
  next = configureSandboxDevice(next, preview.switchId, { vlans: [1] }).state;
  state.links.filter((link) => [link.a.deviceId, link.b.deviceId].includes(preview.switchId)).forEach((link) => {
    const endpoint = endpointForDevice(link, preview.switchId);
    if (!endpoint) return;
    next = configureSandboxDevice(next, preview.switchId, {
      interfaceId: endpoint.interfaceId,
      interface: { adminUp: true, switchportMode: 'access', accessVlan: 1, allowedVlans: undefined },
    }).state;
  });
  return { ok: true as const, state: next, preview };
}

export type SandboxDevicePatch = Partial<Pick<SandboxDevice, 'defaultGateway' | 'vlans' | 'routes'>> & {
  interfaceId?: string;
  interface?: Partial<Omit<SandboxInterface, 'id' | 'name' | 'macAddress'>>;
};

export function configureSandboxDevice(state: SandboxWorkspace, deviceId: string, patch: SandboxDevicePatch) {
  const next = cloneWorkspace(state); const device = findDevice(next, deviceId);
  if (!device) return { ok: false as const, state, message: 'Device not found.' };
  const normalizedGateway = patch.defaultGateway?.trim();
  if (patch.defaultGateway !== undefined && normalizedGateway !== '' && !parseIPv4Address(normalizedGateway!)) return { ok: false as const, state, message: 'Enter a valid IPv4 default gateway.' };
  if (patch.routes) device.routes = patch.routes.map((route) => ({ ...route }));
  if (patch.vlans) {
    if (!patch.vlans.every((vlan) => Number.isInteger(vlan) && vlan >= 1 && vlan <= 4094)) return { ok: false as const, state, message: 'VLAN IDs must be from 1 through 4094.' };
    device.vlans = [...new Set([1, ...patch.vlans])].sort((a, b) => a - b);
  }
  if (patch.defaultGateway !== undefined) device.defaultGateway = normalizedGateway || undefined;
  if (patch.interfaceId && patch.interface) {
    const item = findInterface(device, patch.interfaceId);
    if (!item) return { ok: false as const, state, message: 'Interface not found.' };
    const normalizedAddress = patch.interface.ipv4?.trim();
    if (patch.interface.ipv4 !== undefined && normalizedAddress !== '' && !parseIPv4Address(normalizedAddress!)) return { ok: false as const, state, message: 'Enter a valid IPv4 address.' };
    if (patch.interface.prefix !== undefined && (!Number.isInteger(patch.interface.prefix) || patch.interface.prefix < 0 || patch.interface.prefix > 32)) return { ok: false as const, state, message: 'Prefix length must be from 0 through 32.' };
    if (patch.interface.accessVlan !== undefined && (patch.interface.accessVlan < 1 || patch.interface.accessVlan > 4094)) return { ok: false as const, state, message: 'Access VLAN must be from 1 through 4094.' };
    if (patch.interface.allowedVlans && !patch.interface.allowedVlans.every((vlan) => vlan >= 1 && vlan <= 4094)) return { ok: false as const, state, message: 'Allowed VLANs must be from 1 through 4094.' };
    const normalizedInterface = { ...patch.interface };
    if (patch.interface.ipv4 !== undefined) normalizedInterface.ipv4 = normalizedAddress || undefined;
    Object.assign(item, normalizedInterface);
  }
  return { ok: true as const, state: next, issues: validateSandboxTopology(next) };
}

function linkOtherEndpoint(link: SandboxLink, endpoint: SandboxLinkEndpoint) { return endpointKey(link.a) === endpointKey(endpoint) ? link.b : link.a; }
function interfaceCarriesVlan(device: SandboxDevice, item: SandboxInterface, vlan: number) {
  if (!item.adminUp) return false;
  if (device.type !== 'switch') return true;
  return item.switchportMode === 'trunk' ? Boolean(item.allowedVlans?.includes(vlan)) : (item.accessVlan ?? 1) === vlan;
}

function inferSourceVlan(state: SandboxWorkspace, deviceId: string, interfaceId: string) {
  const link = state.links.find((candidate) => [endpointKey(candidate.a), endpointKey(candidate.b)].includes(`${deviceId}:${interfaceId}`));
  if (!link) return 1;
  const other = linkOtherEndpoint(link, { deviceId, interfaceId }); const otherDevice = findDevice(state, other.deviceId); const otherInterface = findInterface(otherDevice, other.interfaceId);
  return otherDevice?.type === 'switch' && otherInterface?.switchportMode !== 'trunk' ? otherInterface?.accessVlan ?? 1 : 1;
}

function layer2Path(state: SandboxWorkspace, source: SandboxLinkEndpoint, destination: SandboxLinkEndpoint, vlan: number, enforceVlan = true) {
  const queue: { endpoint: SandboxLinkEndpoint; devices: string[]; links: string[] }[] = [{ endpoint: source, devices: [source.deviceId], links: [] }];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!; const key = endpointKey(current.endpoint);
    if (key === endpointKey(destination)) return current;
    if (visited.has(key)) continue;
    visited.add(key);
    const currentDevice = findDevice(state, current.endpoint.deviceId); const currentInterface = findInterface(currentDevice, current.endpoint.interfaceId);
    if (!currentDevice || !currentInterface || !currentInterface.adminUp || (enforceVlan && !interfaceCarriesVlan(currentDevice, currentInterface, vlan))) continue;
    if (currentDevice.type === 'switch') {
      currentDevice.interfaces.filter((item) => item.id !== currentInterface.id && item.adminUp && (!enforceVlan || interfaceCarriesVlan(currentDevice, item, vlan))).forEach((item) => {
        queue.push({ endpoint: { deviceId: currentDevice.id, interfaceId: item.id }, devices: current.devices, links: current.links });
      });
    }
    state.links.filter((link) => endpointKey(link.a) === key || endpointKey(link.b) === key).forEach((link) => {
      const other = linkOtherEndpoint(link, current.endpoint);
      queue.push({ endpoint: other, devices: current.devices.includes(other.deviceId) ? current.devices : [...current.devices, other.deviceId], links: [...current.links, link.id] });
    });
  }
  return undefined;
}

function learnAlongPath(state: SandboxWorkspace, deviceIds: string[], linkIds: string[], sourceMac: string, vlan: number) {
  deviceIds.forEach((deviceId) => {
    const device = findDevice(state, deviceId);
    if (device?.type !== 'switch') return;
    const link = linkIds
      .map((linkId) => state.links.find((candidate) => candidate.id === linkId))
      .find((candidate) => candidate?.a.deviceId === deviceId || candidate?.b.deviceId === deviceId);
    const interfaceId = link?.a.deviceId === deviceId ? link.a.interfaceId : link?.b.interfaceId;
    if (!interfaceId) return;
    const existing = device.macTable.find((entry) => entry.macAddress === sourceMac && entry.vlan === vlan);
    if (existing?.interfaceId === interfaceId) return;
    device.macTable = [...device.macTable.filter((entry) => !(entry.macAddress === sourceMac && entry.vlan === vlan)), { macAddress: sourceMac, interfaceId, vlan }];
  });
}

export function processSandboxFrame(state: SandboxWorkspace, sourceDeviceId: string, destinationMac = BROADCAST_MAC): SandboxTraceResult {
  const next = cloneWorkspace(state); const source = findDevice(next, sourceDeviceId); const sourceInterface = source?.interfaces.find((item) => item.adminUp);
  if (!source || !sourceInterface) return failure(next, 'No active source interface.', 'The frame was not sent.', 'Enable and connect an interface.');
  const destination = destinationMac === BROADCAST_MAC ? undefined : next.devices.find((device) => device.interfaces.some((item) => item.macAddress === destinationMac.toUpperCase()));
  if (destinationMac !== BROADCAST_MAC && !destination) return failure(next, 'Destination MAC is not present.', 'The destination is unknown in this workspace.', 'Choose an existing endpoint or send a broadcast.');
  const vlan = inferSourceVlan(next, source.id, sourceInterface.id);
  const destinationInterface = destination?.interfaces.find((item) => item.macAddress === destinationMac.toUpperCase());
  const sourceEndpoint = { deviceId: source.id, interfaceId: sourceInterface.id };
  const path = destination && destinationInterface ? layer2Path(next, sourceEndpoint, { deviceId: destination.id, interfaceId: destinationInterface.id }, vlan) : undefined;
  if (destination && !path) return failure(next, `No Layer 2 path carries VLAN ${vlan}.`, 'The frame cannot reach the selected destination.', 'Check links, access VLANs, and both trunk endpoints.');
  const floodPaths = destination ? [] : next.devices.flatMap((device) => device.interfaces.flatMap((item) => {
    if (device.id === source.id && item.id === sourceInterface.id) return [];
    const candidate = layer2Path(next, sourceEndpoint, { deviceId: device.id, interfaceId: item.id }, vlan);
    return candidate ? [candidate] : [];
  }));
  const devices = path?.devices ?? [...new Set([source.id, ...floodPaths.flatMap((item) => item.devices)])];
  const links = path?.links ?? [...new Set(floodPaths.flatMap((item) => item.links))];
  const firstSwitch = devices.map((id) => findDevice(next, id)).find((device) => device?.type === 'switch');
  const destinationKnown = Boolean(destination && firstSwitch?.macTable.some((entry) => entry.macAddress === destinationMac.toUpperCase() && entry.vlan === vlan));
  learnAlongPath(next, devices, links, sourceInterface.macAddress, vlan);
  return {
    success: true,
    reason: destination ? `Frame delivered in VLAN ${vlan}.` : `Broadcast emitted in VLAN ${vlan}.`,
    conclusion: destination ? 'The selected Layer 2 path is available.' : 'Broadcasts remain inside the modeled VLAN broadcast domain.',
    events: [
      event('frame-source', 'FRAME CREATED', `${source.name} uses source MAC ${sourceInterface.macAddress}.`, [source.id], [], 'active'),
      event('frame-path', destination ? destinationKnown ? 'KNOWN UNICAST FORWARDED' : 'UNKNOWN UNICAST FLOODED' : 'BROADCAST FLOODED', destination ? destinationKnown ? `The switch uses its VLAN ${vlan} MAC entry for the selected path.` : `The unknown destination is flooded in VLAN ${vlan}; only the addressed endpoint accepts it.` : `Switches flood VLAN ${vlan} except toward each ingress port.`, devices, links, 'success'),
    ],
    state: next,
  };
}

function event(id: string, title: string, detail: string, deviceIds: string[], linkIds: string[], tone: SandboxTraceTone): SandboxTraceEvent {
  return { id, title, detail, deviceIds, linkIds, tone };
}
function failure(state: SandboxWorkspace, reason: string, conclusion: string, suggestion: string, events: SandboxTraceEvent[] = []): SandboxTraceResult {
  return { success: false, reason, conclusion, suggestion, events: [...events, event('failure', 'TRACE STOPPED', reason, [], [], 'warning')], state };
}

function activeInterfaceWithAddress(device: SandboxDevice) { return device.interfaces.find((item) => item.adminUp && item.ipv4 && item.prefix !== undefined); }
function routeForDevice(device: SandboxDevice, destination: string) {
  const connected = device.interfaces.flatMap((item) => {
    if (!item.adminUp || !item.ipv4 || item.prefix === undefined) return [];
    const range = calculateSubnetRange(item.ipv4, item.prefix);
    return range ? [{ prefix: range.network, prefixLength: item.prefix, exitInterface: item.id, source: 'connected' as const }] : [];
  });
  return selectBestRoute(destination, [...connected, ...device.routes]);
}

function sourceInterfaceForPing(device: SandboxDevice, destination: string) {
  const active = device.interfaces.filter((item) => item.adminUp && item.ipv4 && item.prefix !== undefined);
  if (!active.length || device.type === 'pc' || !parseIPv4Address(destination)) return active[0];
  const route = routeForDevice(device, destination);
  if (!route) return active[0];
  const nextHop = route.nextHop ?? destination;
  return findInterface(device, route.exitInterface) ?? active.find((item) => calculateSubnetRange(item.ipv4!, item.prefix!)?.network === calculateSubnetRange(nextHop, item.prefix!)?.network) ?? active[0];
}

export function traceSandboxIPv4Path(state: SandboxWorkspace, sourceDeviceId: string, destinationIp: string) {
  if (!parseIPv4Address(destinationIp)) return { success: false as const, reason: 'invalid-destination', deviceIds: [] as string[], linkIds: [] as string[], steps: [] as { currentId: string; nextHopIp: string; interfaceId: string; l2Devices: string[]; l2Links: string[] }[] };
  let current = findDevice(state, sourceDeviceId); const visited = new Set<string>(); const deviceIds: string[] = []; const linkIds: string[] = []; const steps = [];
  for (let count = 0; current && count <= state.devices.length + 1; count += 1) {
    if (visited.has(current.id)) return { success: false as const, reason: 'routing-loop', deviceIds, linkIds, steps };
    visited.add(current.id); deviceIds.push(current.id);
    if (current.interfaces.some((item) => item.adminUp && item.ipv4 === destinationIp)) return { success: true as const, reason: 'delivered', deviceIds, linkIds, steps };
    const route = routeForDevice(current, destinationIp);
    let nextHopIp: string | undefined; let outgoing: SandboxInterface | undefined;
    if (current.type === 'pc') {
      const hostInterface = activeInterfaceWithAddress(current);
      if (!hostInterface) {
        const configuredButDown = current.interfaces.some((item) => item.ipv4 && item.prefix !== undefined && !item.adminUp);
        return { success: false as const, reason: configuredButDown ? 'interface-down' : 'source-unconfigured', deviceIds, linkIds, steps };
      }
      const local = calculateSubnetRange(hostInterface.ipv4!, hostInterface.prefix!); const target = calculateSubnetRange(destinationIp, hostInterface.prefix!);
      const sameSubnet = local?.network === target?.network;
      nextHopIp = sameSubnet ? destinationIp : current.defaultGateway;
      outgoing = hostInterface;
      if (!nextHopIp) return { success: false as const, reason: 'no-default-gateway', deviceIds, linkIds, steps };
      if (!sameSubnet && calculateSubnetRange(nextHopIp, hostInterface.prefix!)?.network !== local?.network) return { success: false as const, reason: 'gateway-off-subnet', deviceIds, linkIds, steps };
    } else {
      if (!route) {
        const matchingDownInterface = current.interfaces.some((item) => {
          if (item.adminUp || !item.ipv4 || item.prefix === undefined) return false;
          return calculateSubnetRange(item.ipv4, item.prefix)?.network === calculateSubnetRange(destinationIp, item.prefix)?.network;
        });
        return { success: false as const, reason: matchingDownInterface ? 'interface-down' : 'no-route', deviceIds, linkIds, steps };
      }
      nextHopIp = route.nextHop ?? destinationIp;
      outgoing = findInterface(current, route.exitInterface) ?? current.interfaces.find((item) => {
        if (!item.ipv4 || item.prefix === undefined) return false;
        return calculateSubnetRange(item.ipv4, item.prefix)?.network === calculateSubnetRange(nextHopIp!, item.prefix)?.network;
      });
      if (!outgoing) return { success: false as const, reason: 'no-exit-interface', deviceIds, linkIds, steps };
    }
    if (!outgoing.adminUp) return { success: false as const, reason: 'interface-down', deviceIds, linkIds, steps };
    const nextDevice = state.devices.find((device) => device.interfaces.some((item) => item.adminUp && item.ipv4 === nextHopIp));
    const nextInterface = nextDevice?.interfaces.find((item) => item.adminUp && item.ipv4 === nextHopIp);
    if (!nextDevice || !nextInterface) return { success: false as const, reason: 'next-hop-unresolved', deviceIds, linkIds, steps };
    const vlan = inferSourceVlan(state, current.id, outgoing.id);
    const l2 = layer2Path(state, { deviceId: current.id, interfaceId: outgoing.id }, { deviceId: nextDevice.id, interfaceId: nextInterface.id }, vlan);
    if (!l2) {
      const physicalPath = layer2Path(state, { deviceId: current.id, interfaceId: outgoing.id }, { deviceId: nextDevice.id, interfaceId: nextInterface.id }, vlan, false);
      return { success: false as const, reason: physicalPath ? 'vlan-blocked' : 'no-layer2-path', deviceIds, linkIds, steps };
    }
    l2.devices.forEach((id) => { if (!deviceIds.includes(id)) deviceIds.push(id); });
    l2.links.forEach((id) => { if (!linkIds.includes(id)) linkIds.push(id); });
    steps.push({ currentId: current.id, nextHopIp, interfaceId: outgoing.id, l2Devices: l2.devices, l2Links: l2.links });
    current = nextDevice;
  }
  return { success: false as const, reason: 'routing-loop', deviceIds, linkIds, steps };
}

function applyPathLearning(state: SandboxWorkspace, path: ReturnType<typeof traceSandboxIPv4Path>) {
  if (!('steps' in path)) return;
  path.steps.forEach((step) => {
    const current = findDevice(state, step.currentId); const outgoing = findInterface(current, step.interfaceId);
    const target = state.devices.find((device) => device.interfaces.some((item) => item.ipv4 === step.nextHopIp)); const targetInterface = target?.interfaces.find((item) => item.ipv4 === step.nextHopIp);
    if (!current || !outgoing || !targetInterface) return;
    const existing = current.arpTable.find((entry) => entry.ip === step.nextHopIp);
    if (existing?.macAddress === targetInterface.macAddress && existing.interfaceId === outgoing.id) {
      learnAlongPath(state, step.l2Devices, step.l2Links, outgoing.macAddress, inferSourceVlan(state, current.id, outgoing.id));
      return;
    }
    current.arpTable = [...current.arpTable.filter((entry) => entry.ip !== step.nextHopIp), { ip: step.nextHopIp, macAddress: targetInterface.macAddress, interfaceId: outgoing.id }];
    learnAlongPath(state, step.l2Devices, step.l2Links, outgoing.macAddress, inferSourceVlan(state, current.id, outgoing.id));
  });
}

export function simulateSandboxPing(state: SandboxWorkspace, sourceDeviceId: string, destinationIp: string): SandboxTraceResult {
  const next = cloneWorkspace(state); const forward = traceSandboxIPv4Path(next, sourceDeviceId, destinationIp);
  const destinationOwners = next.devices.filter((device) => device.interfaces.some((item) => item.adminUp && item.ipv4 === destinationIp));
  if (destinationOwners.length > 1) return failure(next, `Destination ${destinationIp} is duplicated.`, 'The model cannot identify one unambiguous destination interface.', 'Give every active interface a unique IPv4 address.');
  const source = findDevice(next, sourceDeviceId);
  const sourceAddress = source
    ? findInterface(source, forward.steps[0]?.interfaceId)?.ipv4 ?? activeInterfaceWithAddress(source)?.ipv4
    : undefined;
  const destination = next.devices.find((device) => device.interfaces.some((item) => item.ipv4 === destinationIp));
  if (!forward.success) {
    const explanation = explainPingFailure(forward.reason, 'forward');
    return failure(next, explanation.reason, explanation.conclusion, explanation.suggestion, [event('ping-forward', 'ECHO REQUEST', `${source?.name ?? 'Source'} attempts ${destinationIp}.`, forward.deviceIds, forward.linkIds, 'active')]);
  }
  applyPathLearning(next, forward);
  if (!destination || !sourceAddress) return failure(next, 'The return endpoint is not fully configured.', 'The forward path exists, but a complete round trip was not established.', 'Configure both endpoint addresses.');
  const reverse = traceSandboxIPv4Path(next, destination.id, sourceAddress);
  if (!reverse.success) {
    const explanation = explainPingFailure(reverse.reason, 'return');
    return failure(next, explanation.reason, explanation.conclusion, explanation.suggestion, [event('ping-forward', 'ECHO REQUEST DELIVERED', `The request reached ${destination.name}.`, forward.deviceIds, forward.linkIds, 'active')]);
  }
  applyPathLearning(next, reverse);
  const learningEvents = forward.steps.flatMap((step, index) => {
    const current = findDevice(state, step.currentId);
    const cached = current?.arpTable.some((entry) => entry.ip === step.nextHopIp);
    return [
      event(`next-hop-${index}`, cached ? 'ARP CACHE USED' : 'NEXT-HOP MAC RESOLVED', cached ? `${current?.name} already knows the MAC for ${step.nextHopIp}.` : `${current?.name} resolves ${step.nextHopIp} before sending the frame.`, step.l2Devices, step.l2Links, 'neutral'),
      event(`route-${index}`, index === 0 ? 'FORWARD PATH SELECTED' : 'LINK-LAYER FRAME REPLACED', index === 0 ? `${current?.name} sends through its selected Layer 2 path.` : `${current?.name} keeps the IP endpoints and builds a new Ethernet frame for the next link.`, step.l2Devices, step.l2Links, 'active'),
    ];
  });
  return {
    success: true,
    reason: 'The modeled ICMP Echo round trip succeeded.',
    conclusion: 'This confirms reachability for this configured path; it does not measure latency or prove every application works.',
    events: [
      event('ping-forward', 'ECHO REQUEST CREATED', `${source?.name} sends toward ${destinationIp}.`, [sourceIdOrEmpty(source)], [], 'active'),
      ...learningEvents,
      event('ping-reverse', 'ECHO REPLY', `${destination.name} returns an Echo Reply.`, reverse.deviceIds, reverse.linkIds, 'success'),
    ],
    state: next,
  };
}

function explainPingFailure(reason: string, phase: 'forward' | 'return') {
  const direction = phase === 'forward' ? 'Forward path' : 'Return path';
  if (reason === 'source-unconfigured') return { reason: `${direction} stopped: the source has no active IPv4 configuration.`, conclusion: 'No Echo round trip can begin from this device.', suggestion: 'Configure and enable an IPv4 interface on the source.' };
  if (reason === 'interface-down') return { reason: `${direction} stopped: a required interface is disabled.`, conclusion: phase === 'forward' ? 'The Echo Request cannot leave through the required interface.' : 'The Echo Reply cannot return through the required interface.', suggestion: 'Inspect interface state and enable the required port.' };
  if (reason === 'vlan-blocked') return { reason: `${direction} stopped: the required VLAN is blocked along the Layer 2 path.`, conclusion: 'The physical links exist, but their VLAN configuration does not carry this traffic.', suggestion: 'Check access VLANs, trunk mode, and allowed VLANs.' };
  if (reason === 'no-layer2-path') return { reason: `${direction} stopped: no active Layer 2 path reaches the next hop.`, conclusion: 'The required endpoint or gateway cannot be reached over the current links.', suggestion: 'Check cabling and interface state.' };
  if (reason === 'no-default-gateway' || reason === 'gateway-off-subnet') return { reason: `${direction} stopped: ${reason.replaceAll('-', ' ')}.`, conclusion: 'Remote traffic has no usable local gateway.', suggestion: 'Configure a gateway inside the source subnet.' };
  if (reason === 'no-route' || reason === 'no-exit-interface' || reason === 'next-hop-unresolved') return { reason: `${direction} stopped: ${reason.replaceAll('-', ' ')}.`, conclusion: phase === 'forward' ? 'No usable route to the destination was found.' : 'The destination was reached, but no usable return route was found.', suggestion: 'Inspect connected and static routes plus the selected next hop.' };
  return { reason: `${direction} stopped: ${reason.replaceAll('-', ' ')}.`, conclusion: phase === 'forward' ? 'No Echo Reply can be established from the modeled state.' : 'The destination was reached, but no Echo Reply returned.', suggestion: 'Inspect addressing, links, gateways, VLANs, and routes.' };
}

function sourceIdOrEmpty(device: SandboxDevice | undefined) { return device ? device.id : ''; }

export function clearSandboxLearnedState(state: SandboxWorkspace) {
  const next = cloneWorkspace(state);
  next.devices.forEach((device) => { device.arpTable = []; device.macTable = []; });
  return next;
}

export function createSandboxCliState(state: SandboxWorkspace): CliNetworkState {
  return {
    devices: state.devices.map((device): CliDeviceState => ({
      id: device.id,
      name: device.name,
      type: device.type === 'pc' ? 'host' : device.type,
      mode: 'user-exec',
      interfaces: device.interfaces.map((item) => ({ ...item, name: item.id, linkUp: state.links.some((link) => [endpointKey(link.a), endpointKey(link.b)].includes(`${device.id}:${item.id}`)) })),
      routes: device.routes.map((route) => ({ ...route })),
      vlans: [...device.vlans],
      arpEntries: device.arpTable.map((entry) => ({ ip: entry.ip, macAddress: entry.macAddress, interfaceName: entry.interfaceId })),
      macEntries: device.macTable.map((entry) => ({ macAddress: entry.macAddress, interfaceName: entry.interfaceId, vlan: entry.vlan })),
    })),
    links: state.links.map((link) => ({ aDeviceId: link.a.deviceId, aInterface: link.a.interfaceId, bDeviceId: link.b.deviceId, bInterface: link.b.interfaceId })),
  };
}

function syncCliSessionFromWorkspace(session: CliNetworkState, workspace: SandboxWorkspace) {
  const synced = createSandboxCliState(workspace);
  synced.devices.forEach((device) => {
    const previous = session.devices.find((candidate) => candidate.id === device.id);
    if (!previous) return;
    device.mode = previous.mode;
    device.selectedInterface = previous.selectedInterface;
    device.selectedVlan = previous.selectedVlan;
  });
  return synced;
}

function learnedStateChanged(before: SandboxWorkspace, after: SandboxWorkspace) {
  return before.devices.some((device) => {
    const next = after.devices.find((candidate) => candidate.id === device.id);
    return !next || JSON.stringify(device.arpTable) !== JSON.stringify(next.arpTable) || JSON.stringify(device.macTable) !== JSON.stringify(next.macTable);
  });
}

function sandboxPingOutput(trace: SandboxTraceResult, destination: string): CliCommandResult['output'] {
  const output: CliCommandResult['output'] = [{ text: `PING TARGET ${destination}`, tone: 'normal' }];
  output.push({ text: trace.success ? 'ECHO REPLY RECEIVED / THIS ROUND TRIP SUCCEEDED' : `NO ECHO REPLY / ${trace.reason.toUpperCase()}`, tone: trace.success ? 'success' : 'warning' });
  output.push({ text: trace.conclusion.toUpperCase(), tone: 'muted' });
  if (trace.suggestion) output.push({ text: `NEXT CHECK / ${trace.suggestion.toUpperCase()}`, tone: 'muted' });
  return output;
}

function mergeCliState(state: SandboxWorkspace, cli: CliNetworkState) {
  const next = cloneWorkspace(state);
  next.devices.forEach((device) => {
    const cliDevice = cli.devices.find((item) => item.id === device.id); if (!cliDevice) return;
    device.routes = cliDevice.routes.map((route) => ({ ...route })); device.vlans = [...cliDevice.vlans];
    if (cliDevice.arpEntries) device.arpTable = cliDevice.arpEntries.map((entry) => ({ ip: entry.ip, macAddress: entry.macAddress, interfaceId: entry.interfaceName }));
    if (cliDevice.macEntries) device.macTable = cliDevice.macEntries.map((entry) => ({ macAddress: entry.macAddress, interfaceId: entry.interfaceName, vlan: entry.vlan }));
    device.interfaces.forEach((item) => {
      const cliInterface = cliDevice.interfaces.find((candidate) => candidate.name === item.id); if (!cliInterface) return;
      Object.assign(item, { adminUp: cliInterface.adminUp, ipv4: cliInterface.ipv4, prefix: cliInterface.prefix, switchportMode: cliInterface.switchportMode, accessVlan: cliInterface.accessVlan, allowedVlans: cliInterface.allowedVlans ? [...cliInterface.allowedVlans] : undefined });
    });
  });
  return next;
}

export function executeSandboxCliCommand(
  state: SandboxWorkspace,
  deviceId: string,
  input: string,
  sessionState: CliNetworkState = createSandboxCliState(state),
): SandboxCliExecutionResult {
  const parsed = parseCliCommand(input);
  if (!parsed.ok) return { state, sessionState, error: parsed.error };
  const cli = cloneCliNetwork(sessionState);
  if (parsed.command.kind === 'ping') {
    const effectiveWorkspace = mergeCliState(state, cli);
    const source = findDevice(effectiveWorkspace, deviceId);
    const trace = source?.interfaces.some((item) => item.adminUp && item.ipv4 && item.prefix !== undefined)
      ? simulateSandboxPing(effectiveWorkspace, deviceId, parsed.command.destination)
      : failure(effectiveWorkspace, 'The selected device has no active IPv4 interface.', 'It cannot originate an IPv4 Echo Request.', 'Choose R-1 or configure and enable an IPv4 interface.');
    const workspaceMutated = learnedStateChanged(effectiveWorkspace, trace.state);
    const nextSession = syncCliSessionFromWorkspace(cli, trace.state);
    const result: CliCommandResult = {
      accepted: true,
      mutated: workspaceMutated,
      state: nextSession,
      output: sandboxPingOutput(trace, parsed.command.destination),
      events: [trace.success ? `ping-success:${parsed.command.destination}` : `ping-failure:${parsed.command.destination}`],
    };
    return { state: trace.state, sessionState: nextSession, result, trace, workspaceMutated };
  }
  const result = executeCliCommand(cli, deviceId, parsed.command);
  const workspaceMutated = result.events.some((item) => item === 'config-change' || item === 'clear-arp' || item === 'clear-mac');
  return { state: workspaceMutated ? mergeCliState(state, result.state) : state, sessionState: result.state, result, workspaceMutated };
}
