import { calculateSubnetRange, parseIPv4Address, selectBestRoute, type RouteEntry } from '@/core/network/advanced-networking';
export { prefixToSubnetMask } from '@netbite/networking';

export type CliMode = 'user-exec' | 'privileged-exec' | 'global-config' | 'interface-config' | 'subinterface-config' | 'vlan-config';
export type CliDeviceType = 'host' | 'router' | 'switch';
export type CliOutputTone = 'normal' | 'muted' | 'success' | 'warning';

export interface CliOutputLine { text: string; tone: CliOutputTone }
export interface CliInterfaceState {
  name: string;
  adminUp: boolean;
  linkUp: boolean;
  parentInterface?: string;
  encapsulationVlan?: number;
  ipv4?: string;
  prefix?: number;
  switchportMode?: 'access' | 'trunk';
  accessVlan?: number;
  allowedVlans?: number[];
}
export interface CliDeviceState {
  id: string;
  name: string;
  type: CliDeviceType;
  mode: CliMode;
  selectedInterface?: string;
  selectedVlan?: number;
  interfaces: CliInterfaceState[];
  routes: RouteEntry[];
  vlans: number[];
  arpEntries?: { ip: string; macAddress: string; interfaceName: string }[];
  macEntries?: { macAddress: string; interfaceName: string; vlan: number }[];
}
export interface CliLink { aDeviceId: string; aInterface: string; bDeviceId: string; bInterface: string }
export interface CliNetworkState { devices: CliDeviceState[]; links: CliLink[] }
export type CliLinkContextKind = 'network' | 'mismatch' | 'vlan' | 'trunk' | 'operational' | 'ethernet';
export interface CliLinkContext {
  kind: CliLinkContextKind;
  label: string;
  tone: 'normal' | 'success' | 'warning';
  networkLabel?: string;
}
export interface CliLabDefinition {
  id: string;
  chapterId: string;
  title: string;
  createState: () => CliNetworkState;
}

function linkedInterface(state: CliNetworkState, deviceId: string, interfaceName: string) {
  const device = state.devices.find((item) => item.id === deviceId);
  return { device, interfaceState: device?.interfaces.find((item) => item.name === interfaceName) };
}

export function deriveCliLinkContext(state: CliNetworkState, link: CliLink): CliLinkContext {
  const a = linkedInterface(state, link.aDeviceId, link.aInterface);
  const b = linkedInterface(state, link.bDeviceId, link.bInterface);
  if (!a.interfaceState || !b.interfaceState) return { kind: 'operational', label: 'INTERFACE NOT FOUND', tone: 'warning' };

  let routedContext: CliLinkContext | undefined;
  if (a.interfaceState.ipv4 && a.interfaceState.prefix !== undefined && b.interfaceState.ipv4 && b.interfaceState.prefix !== undefined) {
    const aRange = calculateSubnetRange(a.interfaceState.ipv4, a.interfaceState.prefix);
    const bRange = calculateSubnetRange(b.interfaceState.ipv4, b.interfaceState.prefix);
    routedContext = aRange && bRange && aRange.network === bRange.network && a.interfaceState.prefix === b.interfaceState.prefix
      ? { kind: 'network', label: `${aRange.network}/${a.interfaceState.prefix}`, tone: 'normal' }
      : { kind: 'mismatch', label: 'SUBNET MISMATCH', tone: 'warning' };
  }

  if (![a.interfaceState, b.interfaceState].every((item) => item.adminUp && item.linkUp)) {
    return { kind: 'operational', label: 'LINK DOWN', networkLabel: routedContext?.kind === 'network' ? routedContext.label : undefined, tone: 'warning' };
  }

  if (routedContext) return routedContext;

  const switchEndpoints = [a, b].filter((item) => item.device?.type === 'switch');
  if (switchEndpoints.length === 2) {
    const [left, right] = switchEndpoints.map((item) => item.interfaceState!);
    if (left.switchportMode !== 'trunk' || right.switchportMode !== 'trunk') return { kind: 'trunk', label: 'NOT TRUNKED', tone: 'warning' };
    const rightVlans = new Set(right.allowedVlans ?? []);
    const commonVlans = [...new Set(left.allowedVlans ?? [])].filter((vlan) => rightVlans.has(vlan)).sort((x, y) => x - y);
    return commonVlans.length
      ? { kind: 'trunk', label: `TRUNK VLANs ${commonVlans.join(',')}`, tone: 'success' }
      : { kind: 'trunk', label: 'NO COMMON VLANs', tone: 'warning' };
  }

  const switchEndpoint = switchEndpoints[0];
  if (switchEndpoint) {
    const port = switchEndpoint.interfaceState!;
    const otherEndpoint = switchEndpoint === a ? b : a;
    if (otherEndpoint.device?.type === 'router') {
      if (port.switchportMode !== 'trunk') return { kind: 'trunk', label: 'NOT TRUNKED', tone: 'warning' };
      const routerVlans = otherEndpoint.device.interfaces
        .filter((item) => item.parentInterface === otherEndpoint.interfaceState?.name && item.encapsulationVlan !== undefined)
        .map((item) => item.encapsulationVlan!);
      const routerVlanSet = new Set(routerVlans);
      const commonVlans = [...new Set(port.allowedVlans ?? [])].filter((vlan) => routerVlanSet.has(vlan)).sort((x, y) => x - y);
      return commonVlans.length
        ? { kind: 'trunk', label: `TRUNK VLANs ${commonVlans.join(',')}`, tone: 'success' }
        : { kind: 'trunk', label: 'NO COMMON VLANs', tone: 'warning' };
    }
    if (port.switchportMode === 'trunk') {
      return port.allowedVlans?.length
        ? { kind: 'trunk', label: `TRUNK VLANs ${[...new Set(port.allowedVlans)].sort((x, y) => x - y).join(',')}`, tone: 'success' }
        : { kind: 'trunk', label: 'TRUNK WITH NO ALLOWED VLANs', tone: 'warning' };
    }
    return { kind: 'vlan', label: `ACCESS VLAN ${port.accessVlan ?? 1}`, tone: 'normal' };
  }

  return { kind: 'ethernet', label: 'ETHERNET LINK', tone: 'normal' };
}

export type CliCommand =
  | { kind: 'help' }
  | { kind: 'enable' }
  | { kind: 'disable' }
  | { kind: 'configure-terminal' }
  | { kind: 'exit' }
  | { kind: 'end' }
  | { kind: 'show-running-config' }
  | { kind: 'show-ip-interface-brief' }
  | { kind: 'show-ip-route' }
  | { kind: 'show-vlan-brief' }
  | { kind: 'show-interfaces-trunk' }
  | { kind: 'show-mac-address-table' }
  | { kind: 'show-arp' }
  | { kind: 'clear-mac-address-table' }
  | { kind: 'clear-arp' }
  | { kind: 'ping'; destination: string }
  | { kind: 'interface'; name: string }
  | { kind: 'no-interface'; name: string }
  | { kind: 'encapsulation-dot1q'; vlan?: number; remove: boolean }
  | { kind: 'ip-address'; address?: string; prefixLength?: number; remove: boolean }
  | { kind: 'shutdown'; shutdown: boolean }
  | { kind: 'vlan'; vlan: number }
  | { kind: 'ip-route'; network: string; mask: string; prefixLength: number; nextHop: string; remove: boolean }
  | { kind: 'switchport-mode'; mode: 'access' | 'trunk' }
  | { kind: 'switchport-access-vlan'; vlan: number; remove: boolean }
  | { kind: 'switchport-trunk-allowed'; vlans: number[]; remove: boolean };

export type CliParseResult = { ok: true; command: CliCommand } | { ok: false; error: string };
export interface CliCommandResult {
  accepted: boolean;
  mutated: boolean;
  state: CliNetworkState;
  output: CliOutputLine[];
  events: string[];
}
export interface PathTraceResult {
  success: boolean;
  reason: 'delivered' | 'no-route' | 'next-hop-unreachable' | 'loop' | 'interface-down' | 'invalid-destination';
  hops: string[];
}
export interface PingSimulation {
  success: boolean;
  forward: PathTraceResult;
  reverse?: PathTraceResult;
  output: CliOutputLine[];
}

const normal = (text: string): CliOutputLine => ({ text, tone: 'normal' });
const muted = (text: string): CliOutputLine => ({ text, tone: 'muted' });
const warning = (text: string): CliOutputLine => ({ text, tone: 'warning' });
const success = (text: string): CliOutputLine => ({ text, tone: 'success' });

export function cloneCliNetwork(state: CliNetworkState): CliNetworkState {
  return {
    links: state.links.map((link) => ({ ...link })),
    devices: state.devices.map((device) => ({
      ...device,
      routes: device.routes.map((route) => ({ ...route })),
      vlans: [...device.vlans],
      interfaces: device.interfaces.map((item) => ({ ...item, allowedVlans: item.allowedVlans ? [...item.allowedVlans] : undefined })),
      arpEntries: device.arpEntries?.map((entry) => ({ ...entry })),
      macEntries: device.macEntries?.map((entry) => ({ ...entry })),
    })),
  };
}

export function normalizeInterfaceName(value: string) {
  const compact = value.trim().toLowerCase().replace(/\s+/g, '');
  const match = compact.match(/^(?:gigabitethernet|gi|g|fastethernet|fa|f|ethernet|e)(\d+(?:\/\d+)+(?:\.\d+)?)$/);
  if (!match) return value.trim().toUpperCase();
  const fast = /^(?:fastethernet|fa|f)/.test(compact);
  return `${fast ? 'F' : 'G'}${match[1]}`;
}

export function maskToPrefix(mask: string): number | null {
  const octets = parseIPv4Address(mask);
  if (!octets) return null;
  const bits = octets.map((octet) => octet.toString(2).padStart(8, '0')).join('');
  if (!/^1*0*$/.test(bits)) return null;
  return bits.indexOf('0') === -1 ? 32 : bits.indexOf('0');
}

function parseVlanList(value: string): number[] | null {
  if (!/^\d+(?:,\d+)*$/.test(value)) return null;
  const vlans = [...new Set(value.split(',').map(Number))].sort((a, b) => a - b);
  return vlans.every((vlan) => vlan >= 1 && vlan <= 4094) ? vlans : null;
}

export function parseCliCommand(input: string): CliParseResult {
  const value = input.trim().replace(/\s+/g, ' ');
  const lower = value.toLowerCase();
  if (!value) return { ok: false, error: 'Enter a command or choose a suggestion.' };
  if (lower === '?' || lower === 'help') return { ok: true, command: { kind: 'help' } };
  if (lower === 'enable' || lower === 'en') return { ok: true, command: { kind: 'enable' } };
  if (lower === 'disable') return { ok: true, command: { kind: 'disable' } };
  if (lower === 'configure terminal' || lower === 'conf t') return { ok: true, command: { kind: 'configure-terminal' } };
  if (lower === 'exit') return { ok: true, command: { kind: 'exit' } };
  if (lower === 'end') return { ok: true, command: { kind: 'end' } };
  if (lower === 'show running-config' || lower === 'sh running-config') return { ok: true, command: { kind: 'show-running-config' } };
  if (lower === 'show ip interface brief' || lower === 'sh ip interface brief') return { ok: true, command: { kind: 'show-ip-interface-brief' } };
  if (lower === 'show ip route' || lower === 'sh ip route') return { ok: true, command: { kind: 'show-ip-route' } };
  if (lower === 'show vlan brief' || lower === 'sh vlan brief') return { ok: true, command: { kind: 'show-vlan-brief' } };
  if (lower === 'show interfaces trunk' || lower === 'sh interfaces trunk') return { ok: true, command: { kind: 'show-interfaces-trunk' } };
  if (lower === 'show mac address-table' || lower === 'sh mac address-table') return { ok: true, command: { kind: 'show-mac-address-table' } };
  if (lower === 'show arp' || lower === 'sh arp') return { ok: true, command: { kind: 'show-arp' } };
  if (lower === 'clear mac address-table') return { ok: true, command: { kind: 'clear-mac-address-table' } };
  if (lower === 'clear arp') return { ok: true, command: { kind: 'clear-arp' } };
  if (lower.startsWith('ping ')) {
    const destination = value.slice(5).trim();
    return parseIPv4Address(destination) ? { ok: true, command: { kind: 'ping', destination } } : { ok: false, error: 'PING needs one valid IPv4 destination.' };
  }
  const interfaceMatch = lower.match(/^(?:interface|int) (.+)$/);
  if (interfaceMatch) return { ok: true, command: { kind: 'interface', name: normalizeInterfaceName(interfaceMatch[1]) } };
  const noInterfaceMatch = lower.match(/^no interface (.+)$/);
  if (noInterfaceMatch) return { ok: true, command: { kind: 'no-interface', name: normalizeInterfaceName(noInterfaceMatch[1]) } };
  const vlanMatch = lower.match(/^vlan (\d+)$/);
  if (vlanMatch) {
    const vlan = Number(vlanMatch[1]);
    return vlan >= 1 && vlan <= 4094 ? { ok: true, command: { kind: 'vlan', vlan } } : { ok: false, error: 'VLAN ID must be from 1 through 4094.' };
  }
  if (lower === 'no ip address') return { ok: true, command: { kind: 'ip-address', remove: true } };
  if (lower === 'no encapsulation dot1q') return { ok: true, command: { kind: 'encapsulation-dot1q', remove: true } };
  const encapsulationMatch = lower.match(/^encapsulation dot1q (\d+)$/);
  if (encapsulationMatch) {
    const vlan = Number(encapsulationMatch[1]);
    return vlan >= 1 && vlan <= 4094
      ? { ok: true, command: { kind: 'encapsulation-dot1q', vlan, remove: false } }
      : { ok: false, error: '802.1Q VLAN ID must be from 1 through 4094.' };
  }
  const addressMatch = lower.match(/^ip address (\S+) (\S+)$/);
  if (addressMatch) {
    const prefixLength = maskToPrefix(addressMatch[2]);
    if (!parseIPv4Address(addressMatch[1]) || prefixLength === null) return { ok: false, error: 'IP ADDRESS needs a valid IPv4 address and contiguous mask.' };
    return { ok: true, command: { kind: 'ip-address', address: addressMatch[1], prefixLength, remove: false } };
  }
  if (lower === 'shutdown') return { ok: true, command: { kind: 'shutdown', shutdown: true } };
  if (lower === 'no shutdown') return { ok: true, command: { kind: 'shutdown', shutdown: false } };
  const routeMatch = lower.match(/^(no )?ip route (\S+) (\S+) (\S+)$/);
  if (routeMatch) {
    const [, no, network, mask, nextHop] = routeMatch;
    const prefixLength = maskToPrefix(mask);
    const range = prefixLength === null ? null : calculateSubnetRange(network, prefixLength);
    if (prefixLength === null || !range || range.network !== network) return { ok: false, error: 'IP ROUTE needs a valid network address and contiguous mask.' };
    if (!parseIPv4Address(nextHop)) return { ok: false, error: 'IP ROUTE needs a valid next-hop IPv4 address.' };
    return { ok: true, command: { kind: 'ip-route', network, mask, prefixLength, nextHop, remove: Boolean(no) } };
  }
  const switchportMode = lower.match(/^switchport mode (access|trunk)$/);
  if (switchportMode) return { ok: true, command: { kind: 'switchport-mode', mode: switchportMode[1] as 'access' | 'trunk' } };
  const accessMatch = lower.match(/^(no )?switchport access vlan(?: (\d+))?$/);
  if (accessMatch) {
    const remove = Boolean(accessMatch[1]);
    const vlan = Number(accessMatch[2] ?? 1);
    if (!remove && (vlan < 1 || vlan > 4094)) return { ok: false, error: 'Access VLAN must be from 1 through 4094.' };
    return { ok: true, command: { kind: 'switchport-access-vlan', vlan, remove } };
  }
  const trunkMatch = lower.match(/^(no )?switchport trunk allowed vlan(?: (\S+))?$/);
  if (trunkMatch) {
    const remove = Boolean(trunkMatch[1]);
    const vlans = remove ? [] : parseVlanList(trunkMatch[2] ?? '');
    if (!vlans) return { ok: false, error: 'Use comma-separated VLAN IDs, for example 10,20.' };
    return { ok: true, command: { kind: 'switchport-trunk-allowed', vlans, remove } };
  }
  return { ok: false, error: 'Unknown NetBite CLI command. Enter HELP or use a suggestion.' };
}

export function getCliPrompt(device: CliDeviceState) {
  if (device.mode === 'user-exec') return `${device.name}>`;
  if (device.mode === 'privileged-exec') return `${device.name}#`;
  if (device.mode === 'global-config') return `${device.name}(config)#`;
  if (device.mode === 'interface-config') return `${device.name}(config-if)#`;
  if (device.mode === 'subinterface-config') return `${device.name}(config-subif)#`;
  return `${device.name}(config-vlan)#`;
}

export function getCliSuggestions(device: CliDeviceState, network?: CliNetworkState) {
  const pingSuggestions = device.interfaces.some((item) => item.adminUp && item.linkUp && item.ipv4)
    ? (network?.devices
      .filter((candidate) => candidate.id !== device.id && candidate.type === 'host')
      .flatMap((candidate) => candidate.interfaces.filter((item) => item.adminUp && item.linkUp && item.ipv4).map((item) => `ping ${item.ipv4}`)) ?? [])
      .slice(0, 3)
    : [];
  if (device.mode === 'user-exec') return ['enable', ...pingSuggestions, 'help'];
  if (device.mode === 'privileged-exec') return device.type === 'switch'
    ? ['configure terminal', 'show running-config', 'show vlan brief', 'show interfaces trunk', 'show mac address-table']
    : ['configure terminal', ...pingSuggestions, 'show running-config', 'show ip interface brief', 'show ip route', 'show arp'];
  if (device.mode === 'global-config') return device.type === 'switch'
    ? ['interface F0/1', 'vlan 10', 'end']
    : ['interface G0/0', 'interface G0/0.10', 'interface G0/0.20', 'ip route ', 'end'];
  if (device.mode === 'interface-config') return device.type === 'switch'
    ? ['switchport mode access', 'switchport access vlan ', 'switchport mode trunk', 'switchport trunk allowed vlan ', 'exit']
    : ['ip address ', 'no shutdown', 'shutdown', 'exit'];
  if (device.mode === 'subinterface-config') return ['encapsulation dot1q ', 'ip address ', 'no shutdown', 'shutdown', 'exit'];
  return ['exit', 'end'];
}

function modeError(expected: string): CliOutputLine[] { return [warning(`NETBITE: This command is available in ${expected}.`)]; }

export function deriveConnectedRoutes(device: CliDeviceState): RouteEntry[] {
  return device.interfaces.flatMap((item) => {
    const parent = item.parentInterface ? device.interfaces.find((candidate) => candidate.name === item.parentInterface) : undefined;
    const operational = item.adminUp && item.linkUp && (!parent || (parent.adminUp && parent.linkUp && item.encapsulationVlan !== undefined));
    if (!item.ipv4 || item.prefix === undefined || !operational) return [];
    const range = calculateSubnetRange(item.ipv4, item.prefix);
    return range ? [{ prefix: range.network, prefixLength: item.prefix, exitInterface: item.name, source: 'connected' as const }] : [];
  });
}

function showRunningConfig(device: CliDeviceState) {
  const lines = [`HOSTNAME ${device.name}`];
  device.interfaces.forEach((item) => {
    lines.push(`INTERFACE ${item.name}`);
    if (item.ipv4 && item.prefix !== undefined) lines.push(`  IP ADDRESS ${item.ipv4}/${item.prefix}`);
    if (item.parentInterface) lines.push(`  PARENT ${item.parentInterface}`);
    if (item.encapsulationVlan !== undefined) lines.push(`  ENCAPSULATION DOT1Q ${item.encapsulationVlan}`);
    lines.push(`  STATE ${item.adminUp ? 'ENABLED' : 'DISABLED'} / LINK ${item.linkUp ? 'UP' : 'DOWN'}`);
    if (item.switchportMode) lines.push(`  SWITCHPORT MODE ${item.switchportMode.toUpperCase()}`);
    if (item.accessVlan) lines.push(`  ACCESS VLAN ${item.accessVlan}`);
    if (item.allowedVlans) lines.push(`  ALLOWED VLANS ${item.allowedVlans.join(',')}`);
  });
  device.routes.forEach((route) => lines.push(`IP ROUTE ${route.prefix}/${route.prefixLength} VIA ${route.nextHop}`));
  return lines.map(normal);
}

function showIpRoute(device: CliDeviceState) {
  const routes = [...deriveConnectedRoutes(device), ...device.routes];
  return routes.length ? routes.map((route) => normal(`${route.source === 'connected' ? 'C' : route.source === 'default' ? 'D' : 'S'} ${route.prefix}/${route.prefixLength} ${route.nextHop ? `VIA ${route.nextHop}` : `DIRECT ${route.exitInterface}`}`)) : [muted('NO USABLE ROUTES')];
}

function findDevice(state: CliNetworkState, id: string) { return state.devices.find((device) => device.id === id); }
function findInterface(device: CliDeviceState, name?: string) { return device.interfaces.find((item) => item.name === name); }
function cliInterfaceOperational(device: CliDeviceState, item: CliInterfaceState) {
  if (!item.adminUp || !item.linkUp) return false;
  if (!item.parentInterface) return true;
  const parent = findInterface(device, item.parentInterface);
  return Boolean(parent?.adminUp && parent.linkUp && item.encapsulationVlan !== undefined);
}
function cliPhysicalInterface(device: CliDeviceState, item: CliInterfaceState) {
  return item.parentInterface ? findInterface(device, item.parentInterface) : item;
}
function cliInterfaceCarriesVlan(device: CliDeviceState, item: CliInterfaceState, vlan: number) {
  if (!item.adminUp || !item.linkUp) return false;
  if (device.type !== 'switch') return true;
  return item.switchportMode === 'trunk' ? Boolean(item.allowedVlans?.includes(vlan)) : (item.accessVlan ?? 1) === vlan;
}
function cliVlanForInterface(state: CliNetworkState, device: CliDeviceState, item: CliInterfaceState) {
  if (item.parentInterface && item.encapsulationVlan !== undefined) return item.encapsulationVlan;
  const physical = cliPhysicalInterface(device, item);
  const link = state.links.find((candidate) =>
    (candidate.aDeviceId === device.id && candidate.aInterface === physical?.name)
    || (candidate.bDeviceId === device.id && candidate.bInterface === physical?.name),
  );
  if (!link) return 1;
  const otherDeviceId = link.aDeviceId === device.id ? link.bDeviceId : link.aDeviceId;
  const otherInterfaceName = link.aDeviceId === device.id ? link.bInterface : link.aInterface;
  const otherDevice = findDevice(state, otherDeviceId);
  const otherInterface = otherDevice ? findInterface(otherDevice, otherInterfaceName) : undefined;
  return otherDevice?.type === 'switch' && otherInterface && otherInterface.switchportMode !== 'trunk' ? otherInterface.accessVlan ?? 1 : 1;
}
function cliLayer2Path(state: CliNetworkState, sourceDevice: CliDeviceState, sourceInterface: CliInterfaceState, targetDevice: CliDeviceState, targetInterface: CliInterfaceState, vlan: number) {
  const sourcePhysical = cliPhysicalInterface(sourceDevice, sourceInterface);
  const targetPhysical = cliPhysicalInterface(targetDevice, targetInterface);
  if (!sourcePhysical || !targetPhysical) return false;
  const queue = [{ deviceId: sourceDevice.id, interfaceName: sourcePhysical.name }];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = `${current.deviceId}:${current.interfaceName}`;
    if (key === `${targetDevice.id}:${targetPhysical.name}`) return true;
    if (visited.has(key)) continue;
    visited.add(key);
    const device = findDevice(state, current.deviceId);
    const item = device ? findInterface(device, current.interfaceName) : undefined;
    if (!device || !item || !cliInterfaceCarriesVlan(device, item, vlan)) continue;
    if (device.type === 'switch') {
      device.interfaces.filter((candidate) => candidate.name !== item.name && cliInterfaceCarriesVlan(device, candidate, vlan))
        .forEach((candidate) => queue.push({ deviceId: device.id, interfaceName: candidate.name }));
    }
    state.links.filter((link) =>
      (link.aDeviceId === device.id && link.aInterface === item.name)
      || (link.bDeviceId === device.id && link.bInterface === item.name),
    ).forEach((link) => queue.push(link.aDeviceId === device.id
      ? { deviceId: link.bDeviceId, interfaceName: link.bInterface }
      : { deviceId: link.aDeviceId, interfaceName: link.aInterface }));
  }
  return false;
}

export function traceIPv4Path(state: CliNetworkState, sourceDeviceId: string, destination: string): PathTraceResult {
  if (!parseIPv4Address(destination)) return { success: false, reason: 'invalid-destination', hops: [] };
  let current = findDevice(state, sourceDeviceId);
  if (!current) return { success: false, reason: 'next-hop-unreachable', hops: [] };
  const visited = new Set<string>();
  const hops: string[] = [];
  for (let count = 0; count <= state.devices.length + 1; count += 1) {
    if (visited.has(current.id)) return { success: false, reason: 'loop', hops };
    visited.add(current.id); hops.push(current.name);
    if (current.interfaces.some((item) => item.ipv4 === destination && cliInterfaceOperational(current!, item))) return { success: true, reason: 'delivered', hops };
    if (current.interfaces.some((item) => item.ipv4) && !current.interfaces.some((item) => item.ipv4 && item.adminUp && item.linkUp)) {
      return { success: false, reason: 'interface-down', hops };
    }
    const route = selectBestRoute(destination, [...deriveConnectedRoutes(current), ...current.routes]);
    if (!route) return { success: false, reason: 'no-route', hops };
    if (!route.nextHop) {
      const target = state.devices.find((device) => device.interfaces.some((item) => item.ipv4 === destination && cliInterfaceOperational(device, item)));
      if (!target) return { success: false, reason: 'next-hop-unreachable', hops };
      const outgoing = findInterface(current, route.exitInterface) ?? current.interfaces.find((item) => item.ipv4);
      const targetInterface = target.interfaces.find((item) => item.ipv4 === destination)!;
      if (!outgoing || !cliLayer2Path(state, current, outgoing, target, targetInterface, cliVlanForInterface(state, current, outgoing))) return { success: false, reason: 'next-hop-unreachable', hops };
      current = target; continue;
    }
    const next = state.devices.find((device) => device.interfaces.some((item) => item.ipv4 === route.nextHop && cliInterfaceOperational(device, item)));
    if (!next) return { success: false, reason: 'next-hop-unreachable', hops };
    const outgoing = findInterface(current, route.exitInterface) ?? current.interfaces.find((item) => item.ipv4 && calculateSubnetRange(item.ipv4, item.prefix ?? -1)?.network === calculateSubnetRange(route.nextHop!, item.prefix ?? -1)?.network);
    const nextInterface = next.interfaces.find((item) => item.ipv4 === route.nextHop)!;
    if (!outgoing || !cliLayer2Path(state, current, outgoing, next, nextInterface, cliVlanForInterface(state, current, outgoing))) return { success: false, reason: 'next-hop-unreachable', hops };
    current = next;
  }
  return { success: false, reason: 'loop', hops };
}

export function simulatePing(state: CliNetworkState, sourceDeviceId: string, destination: string): PingSimulation {
  const forward = traceIPv4Path(state, sourceDeviceId, destination);
  if (!forward.success) return { success: false, forward, output: [normal(`PING TARGET ${destination}`), warning(`NO ECHO REPLY / ${forward.reason.replaceAll('-', ' ').toUpperCase()}`), muted(`CHECKED PATH ${forward.hops.join(' → ') || 'NONE'}`)] };
  const destinationDevice = state.devices.find((device) => device.interfaces.some((item) => item.ipv4 === destination));
  const sourceDevice = findDevice(state, sourceDeviceId);
  const sourceRoute = sourceDevice ? selectBestRoute(destination, [...deriveConnectedRoutes(sourceDevice), ...sourceDevice.routes]) : undefined;
  const sourceAddress = sourceDevice
    ? findInterface(sourceDevice, sourceRoute?.exitInterface)?.ipv4
      ?? sourceDevice.interfaces.find((item) => item.ipv4 && cliInterfaceOperational(sourceDevice, item))?.ipv4
    : undefined;
  const reverse = destinationDevice && sourceAddress ? traceIPv4Path(state, destinationDevice.id, sourceAddress) : undefined;
  if (!reverse?.success) return { success: false, forward, reverse, output: [normal(`PING TARGET ${destination}`), warning('FORWARD PATH REACHED TARGET / NO RETURN ECHO REPLY'), muted(`FORWARD ${forward.hops.join(' → ')}`)] };
  return { success: true, forward, reverse, output: [normal(`PING TARGET ${destination}`), success('ECHO REPLY RECEIVED / THIS ROUND TRIP SUCCEEDED'), muted(`PATH ${forward.hops.join(' → ')}`)] };
}

export function deriveVlanReachability(state: CliNetworkState, sourceId: string, destinationId: string) {
  const source = findDevice(state, sourceId); const destination = findDevice(state, destinationId);
  const sourceLink = state.links.find((link) => link.aDeviceId === sourceId || link.bDeviceId === sourceId);
  const destinationLink = state.links.find((link) => link.aDeviceId === destinationId || link.bDeviceId === destinationId);
  if (!source || !destination || !sourceLink || !destinationLink) return { reachable: false, reason: 'An endpoint is not attached.' };
  const sourceSwitchId = sourceLink.aDeviceId === sourceId ? sourceLink.bDeviceId : sourceLink.aDeviceId;
  const destinationSwitchId = destinationLink.aDeviceId === destinationId ? destinationLink.bDeviceId : destinationLink.aDeviceId;
  const sourcePortName = sourceLink.aDeviceId === sourceSwitchId ? sourceLink.aInterface : sourceLink.bInterface;
  const destinationPortName = destinationLink.aDeviceId === destinationSwitchId ? destinationLink.aInterface : destinationLink.bInterface;
  const sourcePort = findInterface(findDevice(state, sourceSwitchId)!, sourcePortName);
  const destinationPort = findInterface(findDevice(state, destinationSwitchId)!, destinationPortName);
  const sourceVlan = sourcePort?.switchportMode === 'access' ? sourcePort.accessVlan : undefined;
  const destinationVlan = destinationPort?.switchportMode === 'access' ? destinationPort.accessVlan : undefined;
  if (!sourceVlan || !destinationVlan) return { reachable: false, reason: 'Both endpoint ports need access VLAN membership.' };
  if (sourceVlan !== destinationVlan) return { reachable: false, reason: 'Different VLANs require Layer 3 routing.' };
  if (sourceSwitchId === destinationSwitchId) return { reachable: true, reason: `Both access ports belong to VLAN ${sourceVlan}.` };
  const trunkLink = state.links.find((link) => [link.aDeviceId, link.bDeviceId].includes(sourceSwitchId) && [link.aDeviceId, link.bDeviceId].includes(destinationSwitchId));
  if (!trunkLink) return { reachable: false, reason: 'The switches have no shared trunk link.' };
  const aPort = findInterface(findDevice(state, trunkLink.aDeviceId)!, trunkLink.aInterface);
  const bPort = findInterface(findDevice(state, trunkLink.bDeviceId)!, trunkLink.bInterface);
  const carries = [aPort, bPort].every((item) => item?.switchportMode === 'trunk' && item.allowedVlans?.includes(sourceVlan));
  return carries ? { reachable: true, reason: `Both trunk endpoints carry VLAN ${sourceVlan}.` } : { reachable: false, reason: `VLAN ${sourceVlan} is not allowed on both trunk endpoints.` };
}

export function executeCliCommand(state: CliNetworkState, deviceId: string, command: CliCommand): CliCommandResult {
  const next = cloneCliNetwork(state); const device = findDevice(next, deviceId);
  if (!device) return { accepted: false, mutated: false, state, output: [warning('NETBITE: Device not found.')], events: [] };
  const finish = (output: CliOutputLine[], mutated = false, events: string[] = []): CliCommandResult => ({ accepted: true, mutated, state: next, output, events });
  const reject = (output: CliOutputLine[]) => ({ accepted: false, mutated: false, state, output, events: [] });
  if (command.kind === 'help') return finish(getCliSuggestions(device).map((item) => normal(item.toUpperCase())));
  if (command.kind === 'enable') { if (device.mode !== 'user-exec') return reject(modeError('user EXEC mode')); device.mode = 'privileged-exec'; return finish([success('PRIVILEGED EXEC MODE')], true, ['mode-change']); }
  if (command.kind === 'disable') { if (device.mode !== 'privileged-exec') return reject(modeError('privileged EXEC mode')); device.mode = 'user-exec'; return finish([muted('USER EXEC MODE')], true, ['mode-change']); }
  if (command.kind === 'configure-terminal') { if (device.mode !== 'privileged-exec') return reject(modeError('privileged EXEC mode')); device.mode = 'global-config'; return finish([success('GLOBAL CONFIGURATION MODE')], true, ['mode-change']); }
  if (command.kind === 'end') { device.mode = 'privileged-exec'; device.selectedInterface = undefined; device.selectedVlan = undefined; return finish([muted('PRIVILEGED EXEC MODE')], true, ['mode-change']); }
  if (command.kind === 'exit') {
    if (device.mode === 'interface-config' || device.mode === 'subinterface-config' || device.mode === 'vlan-config') device.mode = 'global-config';
    else if (device.mode === 'global-config') device.mode = 'privileged-exec';
    else if (device.mode === 'privileged-exec') device.mode = 'user-exec';
    device.selectedInterface = undefined; device.selectedVlan = undefined;
    return finish([muted(`MODE ${device.mode.replaceAll('-', ' ').toUpperCase()}`)], true, ['mode-change']);
  }
  const execMode = device.mode === 'user-exec' || device.mode === 'privileged-exec';
  if (command.kind === 'show-running-config') return execMode ? finish(showRunningConfig(device), false, ['show-running-config']) : reject(modeError('EXEC mode'));
  if (command.kind === 'show-ip-interface-brief') return execMode ? finish(device.interfaces.map((item) => normal(`${item.name.padEnd(8)} ${item.ipv4 ?? 'UNASSIGNED'}  ${item.adminUp ? 'UP' : 'ADMIN DOWN'} / ${item.linkUp ? 'LINK UP' : 'LINK DOWN'}`)), false, ['show-ip-interface-brief']) : reject(modeError('EXEC mode'));
  if (command.kind === 'show-ip-route') return execMode ? finish(showIpRoute(device), false, ['show-ip-route']) : reject(modeError('EXEC mode'));
  if (command.kind === 'show-vlan-brief') {
    if (!execMode || device.type !== 'switch') return reject(modeError('switch EXEC mode'));
    const lines = device.vlans.sort((a, b) => a - b).map((vlan) => normal(`VLAN ${vlan} / ${device.interfaces.filter((item) => item.switchportMode === 'access' && item.accessVlan === vlan).map((item) => item.name).join(', ') || 'NO ACCESS PORTS'}`));
    return finish(lines.length ? lines : [muted('NO USER VLANS CONFIGURED')], false, ['show-vlan-brief']);
  }
  if (command.kind === 'show-interfaces-trunk') {
    if (!execMode || device.type !== 'switch') return reject(modeError('switch EXEC mode'));
    const trunks = device.interfaces.filter((item) => item.switchportMode === 'trunk');
    return finish(trunks.length ? trunks.map((item) => normal(`${item.name} / TRUNK / ALLOWED ${item.allowedVlans?.join(',') || 'NONE'}`)) : [muted('NO TRUNK PORTS CONFIGURED')], false, ['show-interfaces-trunk']);
  }
  if (command.kind === 'show-mac-address-table') {
    if (!execMode || device.type !== 'switch') return reject(modeError('switch EXEC mode'));
    return finish(device.macEntries?.length ? device.macEntries.map((entry) => normal(`VLAN ${entry.vlan} / ${entry.macAddress} / ${entry.interfaceName}`)) : [muted('MAC ADDRESS TABLE EMPTY')], false, ['show-mac-address-table']);
  }
  if (command.kind === 'show-arp') return execMode ? finish(device.arpEntries?.length ? device.arpEntries.map((entry) => normal(`${entry.ip} / ${entry.macAddress} / ${entry.interfaceName}`)) : [muted('ARP TABLE EMPTY')], false, ['show-arp']) : reject(modeError('EXEC mode'));
  if (command.kind === 'clear-mac-address-table') {
    if (!execMode || device.type !== 'switch') return reject(modeError('switch EXEC mode'));
    device.macEntries = []; return finish([success('MAC ADDRESS TABLE CLEARED')], true, ['clear-mac']);
  }
  if (command.kind === 'clear-arp') {
    if (!execMode) return reject(modeError('EXEC mode'));
    device.arpEntries = []; return finish([success('ARP TABLE CLEARED')], true, ['clear-arp']);
  }
  if (command.kind === 'ping') {
    if (!execMode) return reject(modeError('EXEC mode'));
    const ping = simulatePing(next, deviceId, command.destination);
    return finish(ping.output, false, [ping.success ? `ping-success:${command.destination}` : `ping-failure:${command.destination}`]);
  }
  if (command.kind === 'interface') {
    if (device.mode !== 'global-config') return reject(modeError('global configuration mode'));
    let item = findInterface(device, command.name);
    const subinterfaceMatch = command.name.match(/^(.+)\.(\d+)$/);
    if (!item && device.type === 'router' && subinterfaceMatch) {
      const parent = findInterface(device, subinterfaceMatch[1]);
      if (!parent || parent.parentInterface) return reject([warning(`NETBITE: Physical parent ${subinterfaceMatch[1]} is not present on ${device.name}.`)]);
      item = {
        name: command.name,
        parentInterface: parent.name,
        adminUp: true,
        linkUp: parent.linkUp,
      };
      device.interfaces.push(item);
    }
    if (!item) return reject([warning(`NETBITE: Interface ${command.name} is not present on ${device.name}.`)]);
    device.mode = item.parentInterface ? 'subinterface-config' : 'interface-config'; device.selectedInterface = item.name;
    return finish([success(`INTERFACE ${item.name} SELECTED`)], true, ['mode-change']);
  }
  if (command.kind === 'no-interface') {
    if (device.mode !== 'global-config' || device.type !== 'router') return reject(modeError('router global configuration mode'));
    const item = findInterface(device, command.name);
    if (!item?.parentInterface) return reject([warning(`NETBITE: Logical subinterface ${command.name} is not present.`)]);
    device.interfaces = device.interfaces.filter((candidate) => candidate.name !== command.name);
    return finish([success(`INTERFACE ${command.name} REMOVED`)], true, ['config-change']);
  }
  if (command.kind === 'vlan') {
    if (device.mode !== 'global-config' || device.type !== 'switch') return reject(modeError('switch global configuration mode'));
    if (!device.vlans.includes(command.vlan)) device.vlans.push(command.vlan);
    device.mode = 'vlan-config'; device.selectedVlan = command.vlan;
    return finish([success(`VLAN ${command.vlan} AVAILABLE`)], true, ['config-change']);
  }
  if (command.kind === 'ip-route') {
    if (device.mode !== 'global-config' || device.type !== 'router') return reject(modeError('router global configuration mode'));
    const matches = (route: RouteEntry) => route.prefix === command.network && route.prefixLength === command.prefixLength && route.nextHop === command.nextHop;
    if (command.remove) device.routes = device.routes.filter((route) => !matches(route));
    else if (!device.routes.some(matches)) device.routes.push({ prefix: command.network, prefixLength: command.prefixLength, nextHop: command.nextHop, exitInterface: 'NEXT-HOP', source: command.prefixLength === 0 ? 'default' : 'static' });
    return finish([success(`${command.remove ? 'REMOVED' : 'ADDED'} ${command.network}/${command.prefixLength} VIA ${command.nextHop}`)], true, ['config-change']);
  }
  const selected = findInterface(device, device.selectedInterface);
  if (selected && (device.mode === 'interface-config' || device.mode === 'subinterface-config') && device.type === 'router' && command.kind === 'ip-address') {
    if (!command.remove && !selected.parentInterface && device.interfaces.some((item) => item.parentInterface === selected.name)) {
      return reject([warning('NETBITE: Remove logical subinterfaces before assigning an address to their physical parent interface.')]);
    }
    const parent = selected.parentInterface ? findInterface(device, selected.parentInterface) : undefined;
    if (!command.remove && parent?.ipv4) {
      return reject([warning(`NETBITE: Remove the IPv4 address from ${parent.name} before addressing its logical subinterfaces.`)]);
    }
    selected.ipv4 = command.remove ? undefined : command.address;
    selected.prefix = command.remove ? undefined : command.prefixLength;
    return finish([success(command.remove ? `${selected.name} IP ADDRESS REMOVED` : `${selected.name} IP ${selected.ipv4}/${selected.prefix}`)], true, ['config-change']);
  }
  if (selected && (device.mode === 'interface-config' || device.mode === 'subinterface-config') && device.type !== 'host' && command.kind === 'shutdown') {
    selected.adminUp = !command.shutdown;
    return finish([success(`${selected.name} ADMIN ${selected.adminUp ? 'UP' : 'DOWN'}`)], true, ['config-change']);
  }
  if (selected && device.mode === 'subinterface-config' && device.type === 'router' && command.kind === 'encapsulation-dot1q') {
    if (!command.remove && device.interfaces.some((item) => item.name !== selected.name && item.parentInterface === selected.parentInterface && item.encapsulationVlan === command.vlan)) {
      return reject([warning(`NETBITE: VLAN ${command.vlan} is already assigned to another subinterface on ${selected.parentInterface}.`)]);
    }
    selected.encapsulationVlan = command.remove ? undefined : command.vlan;
    return finish([success(command.remove ? `${selected.name} 802.1Q ENCAPSULATION REMOVED` : `${selected.name} ENCAPSULATION DOT1Q ${command.vlan}`)], true, ['config-change']);
  }
  if (!selected || device.mode !== 'interface-config' || device.type !== 'switch') return reject(modeError('switch interface configuration mode'));
  if (command.kind === 'switchport-mode') { selected.switchportMode = command.mode; return finish([success(`${selected.name} MODE ${command.mode.toUpperCase()}`)], true, ['config-change']); }
  if (command.kind === 'switchport-access-vlan') { selected.accessVlan = command.remove ? 1 : command.vlan; return finish([success(`${selected.name} ACCESS VLAN ${selected.accessVlan}`)], true, ['config-change']); }
  if (command.kind === 'switchport-trunk-allowed') { selected.allowedVlans = command.remove ? [] : command.vlans; return finish([success(`${selected.name} ALLOWED VLANS ${selected.allowedVlans.join(',') || 'NONE'}`)], true, ['config-change']); }
  return reject([warning('NETBITE: Command is not available in this context.')]);
}
