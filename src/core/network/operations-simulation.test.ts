import { allocateDhcpLease, buildOspfTopology, calculateOspfRoutes, calculateSpanningTree, evaluateIpv4Acl, inspectDhcpPool, negotiateEtherChannel, parseIPv6Address, releaseDhcpLease, resolveDnsQuery, resolveIPv6Neighbor, selectRouteSource, simulateTransportExchange, traceIPv6Path, translateNatFlow, validateOperationsCapstone } from '@/core/network/operations-simulation';

describe('Network Operations deterministic engines', () => {
  test('models TCP state and rejects a mismatched service port without mutation', () => {
    const good = simulateTransportExchange({ protocol: 'tcp', source: { address: '192.168.1.10', port: 49152 }, destination: { address: '192.168.1.20', port: 443 }, listeningPorts: [443], dropDataUnit: true });
    expect(good.events).toEqual(expect.arrayContaining(['SYN', 'SYN-ACK', 'RETRANSMIT', 'ACKNOWLEDGED']));
    const wrong = simulateTransportExchange({ protocol: 'tcp', source: { address: '192.168.1.10', port: 49152 }, destination: { address: '192.168.1.20', port: 80 }, listeningPorts: [443] });
    expect(wrong.mutated).toBe(false);
    expect(wrong.events).toContain('NO LISTENING SERVICE');
  });

  test('allocates DHCP only inside the pool and reports exhaustion', () => {
    const state = { pool: { network: '192.168.10.0', prefix: 24, start: '192.168.10.100', end: '192.168.10.101', excluded: ['192.168.10.100'] }, leases: [] };
    const first = allocateDhcpLease(state, 'A');
    expect(first.state.leases[0].address).toBe('192.168.10.101');
    const exhausted = allocateDhcpLease(first.state, 'B');
    expect(exhausted.mutated).toBe(false);
    expect(exhausted.explanation.observation).toMatch(/available/i);
  });

  test('renews and releases DHCP bindings without inventing addresses', () => {
    const initial = { pool: { network: '192.168.10.0', prefix: 24, start: '192.168.10.100', end: '192.168.10.102', excluded: ['192.168.10.100'] }, leases: [] };
    const first = allocateDhcpLease(initial, 'PC-A');
    const renewed = allocateDhcpLease(first.state, 'PC-A');
    expect(renewed.state.leases).toHaveLength(1);
    expect(renewed.events).toEqual(['DHCPREQUEST', 'DHCPACK']);
    const released = releaseDhcpLease(renewed.state, 'PC-A');
    expect(released.state.leases).toHaveLength(0);
    expect(inspectDhcpPool(released.state).firstAvailable).toBe('192.168.10.101');
  });

  test('resolves DNS authority once and then uses deterministic cache state', () => {
    const state = { records: [{ name: 'app.test', type: 'A' as const, value: '192.0.2.10', ttl: 60, authoritativeServer: 'ns.test' }], cache: [], resolverReachable: true };
    const first = resolveDnsQuery(state, 'app.test', 'A');
    expect(first.mutated).toBe(true);
    const second = resolveDnsQuery(first.state, 'app.test', 'A');
    expect(second.mutated).toBe(false);
    expect(second.events).toContain('CACHE HIT');
  });

  test('applies ACL first-match and implicit-deny behavior', () => {
    const flow = { protocol: 'tcp' as const, source: '192.168.10.10', destination: '192.168.20.20', destinationPort: 443 };
    const denyFirst = evaluateIpv4Acl(flow, [{ id: 'deny-host', action: 'deny', protocol: 'ip', source: '192.168.10.10', sourceWildcard: '0.0.0.0', destination: '192.168.20.20', destinationWildcard: '0.0.0.0' }, { id: 'permit-web', action: 'permit', protocol: 'tcp', source: '192.168.10.0', sourceWildcard: '0.0.0.255', destination: '192.168.20.20', destinationWildcard: '0.0.0.0', destinationPort: 443 }]);
    expect(denyFirst).toMatchObject({ action: 'deny', matchedRuleId: 'deny-host' });
    expect(evaluateIpv4Acl(flow, [])).toMatchObject({ action: 'deny', matchedRuleId: 'implicit-deny' });
  });

  test('creates and reuses PAT state while refusing a down boundary', () => {
    const state = { insideNetworks: [{ network: '10.0.0.0', prefix: 24 }], globalAddress: '203.0.113.10', nextPort: 40000, entries: [], insideUp: true, outsideUp: true };
    const flow = { protocol: 'tcp' as const, source: '10.0.0.10', sourcePort: 49152, destination: '198.51.100.10', destinationPort: 443 };
    const created = translateNatFlow(state, flow);
    expect(created.state.entries).toHaveLength(1);
    expect(translateNatFlow(created.state, flow).mutated).toBe(false);
    expect(translateNatFlow({ ...state, outsideUp: false }, flow).state.entries).toHaveLength(0);
  });

  test('parses IPv6, resolves neighbors, and chooses longest IPv6 prefix', () => {
    expect(parseIPv6Address('2001:db8::10')?.expanded).toBe('2001:0db8:0000:0000:0000:0000:0000:0010');
    expect(parseIPv6Address('2001::db8::10')).toBeNull();
    expect(resolveIPv6Neighbor([], 'fe80::20', '02:00:00:00:00:20').action).toBe('neighbor-advertisement');
    const traced = traceIPv6Path('2001:db8:20::10', [{ prefix: '::', prefixLength: 0, exitInterface: 'G0/0' }, { prefix: '2001:db8:20::', prefixLength: 64, exitInterface: 'G0/1' }]);
    expect(traced.route?.exitInterface).toBe('G0/1');
  });

  test('calculates STP and rejects incompatible LACP state', () => {
    const tree = calculateSpanningTree([{ id: 'A', priority: 32768, mac: '00:00:00:00:00:0A' }, { id: 'B', priority: 24576, mac: '00:00:00:00:00:0B' }, { id: 'C', priority: 32768, mac: '00:00:00:00:00:0C' }], [{ id: 'AB', a: 'A', b: 'B', cost: 4, up: true }, { id: 'BC', a: 'B', b: 'C', cost: 4, up: true }, { id: 'AC', a: 'A', b: 'C', cost: 8, up: true }]);
    expect(tree.rootId).toBe('B');
    expect(tree.roles.some(({ role }) => role === 'alternate')).toBe(true);
    const passive = negotiateEtherChannel([{ id: 'A1', side: 'a', mode: 'passive', up: true, speed: 1000, switchportMode: 'trunk', allowedVlans: [10] }, { id: 'B1', side: 'b', mode: 'passive', up: true, speed: 1000, switchportMode: 'trunk', allowedVlans: [10] }]);
    expect(passive.formed).toBe(false);
  });

  test('selects dynamic routes and calculates a single-area OSPF path', () => {
    const selection = selectRouteSource('192.168.20.5', [{ prefix: '0.0.0.0', prefixLength: 0, source: 'static', administrativeDistance: 1, metric: 0 }, { prefix: '192.168.20.0', prefixLength: 24, source: 'ospf', administrativeDistance: 110, metric: 20 }]);
    expect(selection.selected.prefixLength).toBe(24);
    const topology = buildOspfTopology([{ id: 'R1', routerId: '1.1.1.1', advertisedPrefixes: [] }, { id: 'R2', routerId: '2.2.2.2', advertisedPrefixes: ['192.168.20.0/24'] }], [{ a: 'R1', b: 'R2', cost: 10, area: 0, up: true, compatible: true }]);
    expect(calculateOspfRoutes(topology, 'R1')[0]).toMatchObject({ prefix: '192.168.20.0/24', cost: 10, nextHopRouterId: 'R2' });
  });

  test('requires every dependency for capstone completion', () => {
    const complete = validateOperationsCapstone({ ipv4: { vlans:true, etherChannel:true, spanningTree:true, dhcp:true, dns:true, ospf:true, pat:true, acl:true, forward:true, returnPath:true }, ipv6: { addressing:true, routerDiscovery:true, neighborDiscovery:true, staticRoutes:true, injectedFaultCorrected:true, forward:true, returnPath:true } });
    expect(complete.complete).toBe(true);
    expect(validateOperationsCapstone({ ipv4: { vlans:false, etherChannel:true, spanningTree:true, dhcp:true, dns:true, ospf:true, pat:true, acl:true, forward:true, returnPath:true }, ipv6: { addressing:true, routerDiscovery:true, neighborDiscovery:true, staticRoutes:true, injectedFaultCorrected:true, forward:true, returnPath:true } }).failures).toContain('IPv4 small office: vlans is incomplete.');
  });
});
