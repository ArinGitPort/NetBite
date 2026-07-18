import {
  calculateSubnetRange, classifyLayerConcept, decideNextHop, diagnosePingPath, evaluateVlanReachability,
  parseIPv4Address, resolveArpAction, selectBestRoute, validateHostConfiguration, validateStaticRoutes,
} from '@/core/network/advanced-networking';

describe('advanced networking domain', () => {
  test('parses valid IPv4 and rejects malformed or out-of-range octets', () => {
    expect(parseIPv4Address('192.168.10.25')).toEqual([192, 168, 10, 25]);
    ['192.168.10', '192.168.10.300', '192.168.010.1', 'a.b.c.d'].forEach((value) => expect(parseIPv4Address(value)).toBeNull());
  });

  test.each([
    ['192.168.10.42', 24, '192.168.10.0', '192.168.10.255', '192.168.10.1', '192.168.10.254'],
    ['192.168.10.130', 25, '192.168.10.128', '192.168.10.255', '192.168.10.129', '192.168.10.254'],
    ['192.168.10.70', 26, '192.168.10.64', '192.168.10.127', '192.168.10.65', '192.168.10.126'],
    ['192.168.10.190', 27, '192.168.10.160', '192.168.10.191', '192.168.10.161', '192.168.10.190'],
  ])('calculates %s/%i', (address, prefix, network, broadcast, firstUsable, lastUsable) => {
    expect(calculateSubnetRange(address, prefix)).toMatchObject({ network, broadcast, firstUsable, lastUsable });
  });

  test('validates host, duplicate, reserved, and gateway rules', () => {
    expect(validateHostConfiguration({ address: '192.168.10.25', prefix: 24, gateway: '192.168.10.1' }).valid).toBe(true);
    expect(validateHostConfiguration({ address: '192.168.10.25', prefix: 24, existingAddresses: ['192.168.10.25'] }).valid).toBe(false);
    expect(validateHostConfiguration({ address: '192.168.10.255', prefix: 24 }).valid).toBe(false);
    expect(validateHostConfiguration({ address: '192.168.10.25', prefix: 24, gateway: '192.168.20.1' }).valid).toBe(false);
  });

  test('chooses direct and gateway next hops and rejects off-subnet gateways', () => {
    expect(decideNextHop('192.168.10.10', '192.168.10.20', 24, '192.168.10.1')).toEqual({ action: 'direct', nextHop: '192.168.10.20' });
    expect(decideNextHop('192.168.10.10', '192.168.20.20', 24, '192.168.10.1')).toEqual({ action: 'gateway', nextHop: '192.168.10.1' });
    expect(decideNextHop('192.168.10.10', '192.168.20.20', 24, '192.168.20.1').action).toBe('invalid');
  });

  test('resolves local or gateway ARP and uses cache hits', () => {
    expect(resolveArpAction({ source: '192.168.10.10', destination: '192.168.10.20', prefix: 24, cache: [] })).toEqual({ action: 'broadcast-request', nextHop: '192.168.10.20' });
    expect(resolveArpAction({ source: '192.168.10.10', destination: '192.168.20.20', prefix: 24, gateway: '192.168.10.1', cache: [{ ip: '192.168.10.1', mac: '02:00:00:00:00:01' }] })).toEqual({ action: 'cache-hit', nextHop: '192.168.10.1', mac: '02:00:00:00:00:01' });
  });

  test('diagnoses checkpoints in dependency order', () => {
    expect(diagnosePingPath({ linkUp: false, addressValid: false, destinationLocal: false, gatewayValid: false, replyReceived: false }).checkpoint).toBe('link');
    expect(diagnosePingPath({ linkUp: true, addressValid: true, destinationLocal: false, gatewayValid: false, replyReceived: false }).checkpoint).toBe('gateway');
    expect(diagnosePingPath({ linkUp: true, addressValid: true, destinationLocal: false, gatewayValid: true, replyReceived: true }).checkpoint).toBe('success');
  });

  test('selects the longest matching route and validates static entries', () => {
    const routes = [
      { prefix: '0.0.0.0', prefixLength: 0, nextHop: '10.0.0.1', exitInterface: 'P1', source: 'default' as const },
      { prefix: '192.168.0.0', prefixLength: 16, nextHop: '10.0.0.2', exitInterface: 'P2', source: 'static' as const },
      { prefix: '192.168.10.0', prefixLength: 24, exitInterface: 'LAN', source: 'connected' as const },
    ];
    expect(selectBestRoute('192.168.10.25', routes)?.prefixLength).toBe(24);
    expect(selectBestRoute('192.168.20.25', routes)?.prefixLength).toBe(16);
    expect(selectBestRoute('8.8.8.8', routes)?.prefixLength).toBe(0);
    expect(validateStaticRoutes(routes).valid).toBe(true);
    expect(validateStaticRoutes([{ prefix: '192.168.10.5', prefixLength: 24, exitInterface: 'P1', source: 'static' }]).valid).toBe(false);
    expect(validateStaticRoutes(routes, ['192.168.30.0/24']).errors).toContain('A route to 192.168.30.0/24 is missing.');
  });

  test('evaluates access VLAN and trunk reachability', () => {
    const a = { id: 'A', vlan: 10, switchId: 'S1' };
    const b = { id: 'B', vlan: 10, switchId: 'S2' };
    const c = { id: 'C', vlan: 20, switchId: 'S1' };
    expect(evaluateVlanReachability(a, b, [{ switches: ['S1', 'S2'], allowedVlans: [10] }]).reachable).toBe(true);
    expect(evaluateVlanReachability(a, c, []).reachable).toBe(false);
    expect(evaluateVlanReachability(a, b, [{ switches: ['S1', 'S2'], allowedVlans: [20] }]).reachable).toBe(false);
  });

  test('classifies concepts in both models', () => {
    expect(classifyLayerConcept('cable')).toEqual({ osi: 'physical', tcpIp: 'network-access' });
    expect(classifyLayerConcept('Ethernet')).toEqual({ osi: 'data-link', tcpIp: 'network-access' });
    expect(classifyLayerConcept('IPv4')).toEqual({ osi: 'network', tcpIp: 'internet' });
    expect(classifyLayerConcept('TCP')).toEqual({ osi: 'transport', tcpIp: 'transport' });
    expect(classifyLayerConcept('unknown')).toBeNull();
  });
});
