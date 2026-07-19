import { calculateSubnetRange, parseIPv4Address, selectBestRoute, type RouteEntry } from '@/core/network/advanced-networking';

export type CliMode = 'user-exec' | 'privileged-exec' | 'global-config' | 'interface-config' | 'vlan-config';
export type CliDeviceType = 'host' | 'router' | 'switch';
export type CliOutputTone = 'normal' | 'muted' | 'success' | 'warning';

export interface CliOutputLine { text: string; tone: CliOutputTone }
export interface CliInterfaceState {
  name: string;
  adminUp: boolean;
  linkUp: boolean;
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
export interface CliLabDefinition {
  id: string;
  chapterId: string;
  title: string;
  createState: () => CliNetworkState;
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
  const match = compact.match(/^(?:gigabitethernet|gi|g|fastethernet|fa|f|ethernet|e)(\d+(?:\/\d+)+)$/);
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
  const vlanMatch = lower.match(/^vlan (\d+)$/);
  if (vlanMatch) {
    const vlan = Number(vlanMatch[1]);
    return vlan >= 1 && vlan <= 4094 ? { ok: true, command: { kind: 'vlan', vlan } } : { ok: false, error: 'VLAN ID must be from 1 through 4094.' };
  }
  if (lower === 'no ip address') return { ok: true, command: { kind: 'ip-address', remove: true } };
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
  return `${device.name}(config-vlan)#`;
}

export function getCliSuggestions(device: CliDeviceState) {
  if (device.mode === 'user-exec') return ['enable', 'help'];
  if (device.mode === 'privileged-exec') return device.type === 'switch'
    ? ['configure terminal', 'show running-config', 'show vlan brief', 'show interfaces trunk', 'show mac address-table']
    : ['configure terminal', 'show running-config', 'show ip interface brief', 'show ip route', 'show arp'];
  if (device.mode === 'global-config') return device.type === 'switch' ? ['interface F0/1', 'vlan 10', 'end'] : ['ip route ', 'end'];
  if (device.mode === 'interface-config') return device.type === 'switch'
    ? ['switchport mode access', 'switchport access vlan ', 'switchport mode trunk', 'switchport trunk allowed vlan ', 'exit']
    : ['ip address ', 'no shutdown', 'shutdown', 'exit'];
  return ['exit', 'end'];
}

function modeError(expected: string): CliOutputLine[] { return [warning(`NETBITE: This command is available in ${expected}.`)]; }

export function deriveConnectedRoutes(device: CliDeviceState): RouteEntry[] {
  return device.interfaces.flatMap((item) => {
    if (!item.ipv4 || item.prefix === undefined || !item.adminUp || !item.linkUp) return [];
    const range = calculateSubnetRange(item.ipv4, item.prefix);
    return range ? [{ prefix: range.network, prefixLength: item.prefix, exitInterface: item.name, source: 'connected' as const }] : [];
  });
}

function showRunningConfig(device: CliDeviceState) {
  const lines = [`HOSTNAME ${device.name}`];
  device.interfaces.forEach((item) => {
    lines.push(`INTERFACE ${item.name}`);
    if (item.ipv4 && item.prefix !== undefined) lines.push(`  IP ADDRESS ${item.ipv4}/${item.prefix}`);
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

export function traceIPv4Path(state: CliNetworkState, sourceDeviceId: string, destination: string): PathTraceResult {
  if (!parseIPv4Address(destination)) return { success: false, reason: 'invalid-destination', hops: [] };
  let current = findDevice(state, sourceDeviceId);
  if (!current) return { success: false, reason: 'next-hop-unreachable', hops: [] };
  const visited = new Set<string>();
  const hops: string[] = [];
  for (let count = 0; count <= state.devices.length + 1; count += 1) {
    if (visited.has(current.id)) return { success: false, reason: 'loop', hops };
    visited.add(current.id); hops.push(current.name);
    if (current.interfaces.some((item) => item.ipv4 === destination && item.adminUp && item.linkUp)) return { success: true, reason: 'delivered', hops };
    if (current.interfaces.some((item) => item.ipv4) && !current.interfaces.some((item) => item.ipv4 && item.adminUp && item.linkUp)) {
      return { success: false, reason: 'interface-down', hops };
    }
    const route = selectBestRoute(destination, [...deriveConnectedRoutes(current), ...current.routes]);
    if (!route) return { success: false, reason: 'no-route', hops };
    if (!route.nextHop) {
      const target = state.devices.find((device) => device.interfaces.some((item) => item.ipv4 === destination && item.adminUp && item.linkUp));
      if (!target) return { success: false, reason: 'next-hop-unreachable', hops };
      const linked = state.links.some((link) => (link.aDeviceId === current!.id && link.bDeviceId === target.id) || (link.bDeviceId === current!.id && link.aDeviceId === target.id));
      if (!linked) return { success: false, reason: 'next-hop-unreachable', hops };
      current = target; continue;
    }
    const next = state.devices.find((device) => device.interfaces.some((item) => item.ipv4 === route.nextHop && item.adminUp && item.linkUp));
    if (!next) return { success: false, reason: 'next-hop-unreachable', hops };
    const linked = state.links.some((link) => (link.aDeviceId === current!.id && link.bDeviceId === next.id) || (link.bDeviceId === current!.id && link.aDeviceId === next.id));
    if (!linked) return { success: false, reason: 'next-hop-unreachable', hops };
    current = next;
  }
  return { success: false, reason: 'loop', hops };
}

export function simulatePing(state: CliNetworkState, sourceDeviceId: string, destination: string): PingSimulation {
  const forward = traceIPv4Path(state, sourceDeviceId, destination);
  if (!forward.success) return { success: false, forward, output: [normal(`PING TARGET ${destination}`), warning(`NO ECHO REPLY / ${forward.reason.replaceAll('-', ' ').toUpperCase()}`), muted(`CHECKED PATH ${forward.hops.join(' → ') || 'NONE'}`)] };
  const destinationDevice = state.devices.find((device) => device.interfaces.some((item) => item.ipv4 === destination));
  const sourceAddress = findDevice(state, sourceDeviceId)?.interfaces.find((item) => item.ipv4)?.ipv4;
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
    if (device.mode === 'interface-config' || device.mode === 'vlan-config') device.mode = 'global-config';
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
    const item = findInterface(device, command.name);
    if (!item) return reject([warning(`NETBITE: Interface ${command.name} is not present on ${device.name}.`)]);
    device.mode = 'interface-config'; device.selectedInterface = item.name;
    return finish([success(`INTERFACE ${item.name} SELECTED`)], true, ['mode-change']);
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
  if (selected && device.mode === 'interface-config' && device.type === 'router' && command.kind === 'ip-address') {
    selected.ipv4 = command.remove ? undefined : command.address;
    selected.prefix = command.remove ? undefined : command.prefixLength;
    return finish([success(command.remove ? `${selected.name} IP ADDRESS REMOVED` : `${selected.name} IP ${selected.ipv4}/${selected.prefix}`)], true, ['config-change']);
  }
  if (selected && device.mode === 'interface-config' && device.type !== 'host' && command.kind === 'shutdown') {
    selected.adminUp = !command.shutdown;
    return finish([success(`${selected.name} ADMIN ${selected.adminUp ? 'UP' : 'DOWN'}`)], true, ['config-change']);
  }
  if (!selected || device.mode !== 'interface-config' || device.type !== 'switch') return reject(modeError('switch interface configuration mode'));
  if (command.kind === 'switchport-mode') { selected.switchportMode = command.mode; return finish([success(`${selected.name} MODE ${command.mode.toUpperCase()}`)], true, ['config-change']); }
  if (command.kind === 'switchport-access-vlan') { selected.accessVlan = command.remove ? 1 : command.vlan; return finish([success(`${selected.name} ACCESS VLAN ${selected.accessVlan}`)], true, ['config-change']); }
  if (command.kind === 'switchport-trunk-allowed') { selected.allowedVlans = command.remove ? [] : command.vlans; return finish([success(`${selected.name} ALLOWED VLANS ${selected.allowedVlans.join(',') || 'NONE'}`)], true, ['config-change']); }
  return reject([warning('NETBITE: Command is not available in this context.')]);
}
