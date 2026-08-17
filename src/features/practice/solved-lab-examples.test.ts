import { buildSolvedLabExample, solvedLabExampleDefinitions, validateSolvedLabExample } from '@/features/practice/solved-lab-examples';

const expectedIds = [
  'first-network', 'ethernet-cables', 'switch-decision-desk', 'ipv4-configurator', 'subnet-range-desk', 'gateway-forwarding-desk', 'arp-resolution-desk', 'ping-diagnostic-desk', 'static-route-board', 'vlan-port-desk', 'layer-sorting-desk', 'inter-vlan-routing-desk',
  'transport-service-desk', 'dhcp-lease-desk', 'dns-resolution-desk', 'acl-policy-desk', 'nat-translation-desk', 'ipv6-address-desk', 'ipv6-neighbor-desk', 'spanning-tree-desk', 'etherchannel-desk', 'route-source-desk', 'ospf-area-desk', 'network-operations-capstone',
].sort();

describe('solved mini-lab examples', () => {
  it('registers exactly one versioned definition for every practical activity', () => {
    expect(Object.keys(solvedLabExampleDefinitions).sort()).toEqual(expectedIds);
    expect(new Set(Object.values(solvedLabExampleDefinitions).map(({ labId }) => labId)).size).toBe(24);
    Object.values(solvedLabExampleDefinitions).forEach(({ version }) => expect(version).toBeGreaterThan(0));
  });

  it.each(expectedIds)('builds and validates %s through its authored engine or definition', (labId) => {
    const snapshot = buildSolvedLabExample(labId);
    expect(snapshot).toBeDefined();
    expect(validateSolvedLabExample(labId, snapshot)).toBe(true);
    expect(snapshot?.sections.length).toBeGreaterThan(0);
    expect(snapshot?.sections.every(({ rows }) => rows.length > 0)).toBe(true);
  });

  it('returns no example for an unknown activity', () => {
    expect(buildSolvedLabExample('not-a-lab')).toBeUndefined();
    expect(validateSolvedLabExample('not-a-lab', {})).toBe(false);
  });
});
