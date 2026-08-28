export type IPv4Address = `${number}.${number}.${number}.${number}`;

export interface SubnetRange {
  network: string;
  broadcast: string;
  firstUsable: string | null;
  lastUsable: string | null;
  totalAddresses: number;
  usableHosts: number;
}

export interface HostConfiguration {
  address: string;
  prefix: number;
  gateway?: string;
  existingAddresses?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function parseIPv4Address(value: string): number[] | null {
  const parts = value.trim().split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => (/^(0|[1-9]\d{0,2})$/.test(part) ? Number(part) : NaN));
  return octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
    ? octets
    : null;
}

function ipv4ToInteger(value: string): number | null {
  const octets = parseIPv4Address(value);
  if (!octets) return null;
  return octets.reduce((result, octet) => result * 256 + octet, 0) >>> 0;
}

function integerToIPv4(value: number): string {
  const normalized = value >>> 0;
  return [24, 16, 8, 0].map((shift) => (normalized >>> shift) & 255).join('.');
}

function prefixMask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

export function calculateSubnetRange(address: string, prefix: number): SubnetRange | null {
  const addressValue = ipv4ToInteger(address);
  if (addressValue === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  const mask = prefixMask(prefix);
  const network = (addressValue & mask) >>> 0;
  const size = 2 ** (32 - prefix);
  const broadcast = (network + size - 1) >>> 0;
  const hasUsableRange = prefix <= 30;
  return {
    network: integerToIPv4(network),
    broadcast: integerToIPv4(broadcast),
    firstUsable: hasUsableRange ? integerToIPv4(network + 1) : null,
    lastUsable: hasUsableRange ? integerToIPv4(broadcast - 1) : null,
    totalAddresses: size,
    usableHosts: hasUsableRange ? Math.max(0, size - 2) : 0,
  };
}

export function validateHostConfiguration(configuration: HostConfiguration): ValidationResult {
  const errors: string[] = [];
  const range = calculateSubnetRange(configuration.address, configuration.prefix);
  if (!parseIPv4Address(configuration.address)) errors.push('Enter four octets from 0 to 255.');
  if (!Number.isInteger(configuration.prefix) || configuration.prefix < 1 || configuration.prefix > 30) {
    errors.push('Use a host prefix from /1 to /30.');
  }
  if (range && (configuration.address === range.network || configuration.address === range.broadcast)) {
    errors.push('A host cannot use the network or broadcast address.');
  }
  if (configuration.existingAddresses?.includes(configuration.address)) {
    errors.push('That address is already assigned on this network.');
  }
  if (configuration.gateway) {
    const gatewayRange = calculateSubnetRange(configuration.gateway, configuration.prefix);
    if (!gatewayRange) errors.push('The default gateway is not a valid IPv4 address.');
    else if (range?.network !== gatewayRange.network) errors.push('The default gateway must be on the host\'s local subnet.');
    else if (configuration.gateway === range.network || configuration.gateway === range.broadcast) {
      errors.push('The default gateway must be a usable host address.');
    }
  }
  return { valid: errors.length === 0, errors };
}

export type NextHopDecision =
  | { action: 'direct'; nextHop: string }
  | { action: 'gateway'; nextHop: string }
  | { action: 'invalid'; reason: string };

export function decideNextHop(source: string, destination: string, prefix: number, gateway?: string): NextHopDecision {
  const sourceRange = calculateSubnetRange(source, prefix);
  const destinationRange = calculateSubnetRange(destination, prefix);
  if (!sourceRange || !destinationRange) return { action: 'invalid', reason: 'The source or destination address is invalid.' };
  if (sourceRange.network === destinationRange.network) return { action: 'direct', nextHop: destination };
  if (!gateway) return { action: 'invalid', reason: 'A remote destination needs a default gateway.' };
  const gatewayRange = calculateSubnetRange(gateway, prefix);
  if (!gatewayRange || gatewayRange.network !== sourceRange.network) {
    return { action: 'invalid', reason: 'The default gateway must be on the source host\'s local subnet.' };
  }
  return { action: 'gateway', nextHop: gateway };
}

export interface ArpCacheEntry { ip: string; mac: string }
export type ArpAction =
  | { action: 'cache-hit'; nextHop: string; mac: string }
  | { action: 'broadcast-request'; nextHop: string }
  | { action: 'invalid'; reason: string };

export function resolveArpAction(input: {
  source: string; destination: string; prefix: number; gateway?: string; cache: ArpCacheEntry[];
}): ArpAction {
  const decision = decideNextHop(input.source, input.destination, input.prefix, input.gateway);
  if (decision.action === 'invalid') return decision;
  const entry = input.cache.find(({ ip }) => ip === decision.nextHop);
  return entry
    ? { action: 'cache-hit', nextHop: decision.nextHop, mac: entry.mac }
    : { action: 'broadcast-request', nextHop: decision.nextHop };
}

export type PingCheckpoint = 'link' | 'address' | 'gateway' | 'remote-path' | 'success';
export function diagnosePingPath(input: {
  linkUp: boolean; addressValid: boolean; destinationLocal: boolean; gatewayValid: boolean; replyReceived: boolean;
}): { checkpoint: PingCheckpoint; explanation: string } {
  if (!input.linkUp) return { checkpoint: 'link', explanation: 'Restore the local link before testing IP delivery.' };
  if (!input.addressValid) return { checkpoint: 'address', explanation: 'Correct the host IPv4 address and prefix.' };
  if (!input.destinationLocal && !input.gatewayValid) return { checkpoint: 'gateway', explanation: 'A remote destination needs a valid local default gateway.' };
  if (!input.replyReceived) return { checkpoint: 'remote-path', explanation: 'The local checks pass; inspect the path, destination, or filtering next.' };
  return { checkpoint: 'success', explanation: 'An Echo Reply confirms round-trip IP reachability for this test.' };
}

export type RouteSource = 'connected' | 'static' | 'default';
export interface RouteEntry { prefix: string; prefixLength: number; nextHop?: string; exitInterface: string; source: RouteSource }
export function selectBestRoute(destination: string, routes: RouteEntry[]): RouteEntry | null {
  const destinationValue = ipv4ToInteger(destination);
  if (destinationValue === null) return null;
  return routes
    .filter((route) => {
      const routeValue = ipv4ToInteger(route.prefix);
      if (routeValue === null || route.prefixLength < 0 || route.prefixLength > 32) return false;
      const mask = prefixMask(route.prefixLength);
      return ((destinationValue & mask) >>> 0) === ((routeValue & mask) >>> 0);
    })
    .sort((a, b) => b.prefixLength - a.prefixLength)[0] ?? null;
}

export function validateStaticRoutes(routes: RouteEntry[], requiredPrefixes: string[] = []): ValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();
  routes.forEach((route) => {
    const range = calculateSubnetRange(route.prefix, route.prefixLength);
    if (!range || range.network !== route.prefix) errors.push(`${route.prefix}/${route.prefixLength} is not a valid network prefix.`);
    if (route.source !== 'connected' && !route.nextHop) errors.push(`${route.prefix}/${route.prefixLength} needs a next hop.`);
    const key = `${route.prefix}/${route.prefixLength}`;
    if (seen.has(key)) errors.push(`${key} is duplicated.`);
    seen.add(key);
  });
  requiredPrefixes.forEach((required) => {
    if (!seen.has(required)) errors.push(`A route to ${required} is missing.`);
  });
  return { valid: errors.length === 0, errors };
}

export interface VlanEndpoint { id: string; vlan: number; switchId: string }
export interface VlanTrunk { switches: [string, string]; allowedVlans: number[] }
export function evaluateVlanReachability(source: VlanEndpoint, destination: VlanEndpoint, trunks: VlanTrunk[]): {
  reachable: boolean; reason: string;
} {
  if (source.vlan !== destination.vlan) return { reachable: false, reason: 'Different VLANs require Layer 3 routing.' };
  if (source.switchId === destination.switchId) return { reachable: true, reason: 'Both access ports belong to the same VLAN.' };
  const trunk = trunks.find(({ switches }) => switches.includes(source.switchId) && switches.includes(destination.switchId));
  if (!trunk) return { reachable: false, reason: 'The switches have no trunk path.' };
  return trunk.allowedVlans.includes(source.vlan)
    ? { reachable: true, reason: `The trunk carries VLAN ${source.vlan}.` }
    : { reachable: false, reason: `The trunk does not allow VLAN ${source.vlan}.` };
}

export type OsiLayer = 'physical' | 'data-link' | 'network' | 'transport' | 'session' | 'presentation' | 'application';
export type TcpIpLayer = 'network-access' | 'internet' | 'transport' | 'application';
const layerMap: Record<string, { osi: OsiLayer; tcpIp: TcpIpLayer }> = {
  cable: { osi: 'physical', tcpIp: 'network-access' },
  ethernet: { osi: 'data-link', tcpIp: 'network-access' },
  mac: { osi: 'data-link', tcpIp: 'network-access' },
  ipv4: { osi: 'network', tcpIp: 'internet' },
  icmp: { osi: 'network', tcpIp: 'internet' },
  routing: { osi: 'network', tcpIp: 'internet' },
  tcp: { osi: 'transport', tcpIp: 'transport' },
  udp: { osi: 'transport', tcpIp: 'transport' },
  application: { osi: 'application', tcpIp: 'application' },
};
export function classifyLayerConcept(concept: string) {
  return layerMap[concept.trim().toLowerCase()] ?? null;
}
