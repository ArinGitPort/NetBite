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

  it('derives routed topology context and structured addressing from the solved CLI state', () => {
    const snapshot = buildSolvedLabExample('static-route-board')!;
    expect(snapshot.topology?.links.map(({ context }) => context)).toEqual([
      '192.168.10.0/24', '10.0.12.0/30', '10.0.23.0/30', '192.168.30.0/24',
    ]);
    expect(snapshot.topology?.links.every(({ fromInterface, toInterface }) => Boolean(fromInterface && toInterface))).toBe(true);
    const configuration = snapshot.sections.find(({ id }) => id === 'configuration')!;
    expect(configuration.records).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'INTERFACE G0/0', fields: expect.arrayContaining([
        { label: 'Prefix length', value: '/24' },
        { label: 'Subnet mask', value: '255.255.255.0' },
        { label: 'Network', value: '192.168.10.0/24' },
      ]) }),
      expect.objectContaining({ title: 'STATIC ROUTE', fields: expect.arrayContaining([
        { label: 'Destination', value: '192.168.30.0/24' },
        { label: 'Next hop', value: '10.0.12.2' },
      ]) }),
    ]));
  });

  it('keeps raw route commands and adds a readable field breakdown', () => {
    const transcript = buildSolvedLabExample('static-route-board')!.sections.find(({ id }) => id === 'transcript')!;
    expect(transcript.rows).toContain('R1> ip route 192.168.30.0 255.255.255.0 10.0.12.2');
    expect(transcript.commandGroups?.flatMap(({ explanations }) => explanations ?? [])).toEqual(expect.arrayContaining([
      expect.objectContaining({ fields: [
        { label: 'Destination network', value: '192.168.30.0' },
        { label: 'Subnet mask', value: '255.255.255.0' },
        { label: 'Next hop', value: '10.0.12.2' },
      ] }),
    ]));
  });
});
