import { operationsLabDefinitions } from '@/features/operations/operations-lab-definitions';
import {
  evaluateOperationsAdapterObjective,
  getOperationsDeviceRecord,
  operationsSimulationAdapters,
} from '@/features/operations/operations-adapters';
import {
  applySimulationConfiguration,
  emptyOperationsSimulationSession,
  executeOperationsCliCommand,
  operationsSimulationDefinitions,
  type OperationsSimulationSession,
} from '@/features/operations/operations-simulator';

function configuredSession(labId: string, stageIndex: number) {
  const definition = operationsSimulationDefinitions[labId];
  let session = emptyOperationsSimulationSession();
  for (let index = 0; index <= stageIndex; index += 1) {
    const stage = definition.stages[index];
    const values = Object.fromEntries(stage.fields.map((field) => [field.id, field.expected]));
    session = applySimulationConfiguration(session, stage, values).session;
  }
  return session;
}

describe('specialized Network Operations adapters', () => {
  const specializedIds = [
    'dhcp-lease-desk', 'dns-resolution-desk', 'acl-policy-desk', 'nat-translation-desk',
    'ipv6-address-desk', 'ipv6-neighbor-desk', 'spanning-tree-desk', 'etherchannel-desk',
    'route-source-desk', 'ospf-area-desk', 'network-operations-capstone',
  ];

  test('registers a typed adapter for every non-Transport simulator', () => {
    expect(Object.keys(operationsSimulationAdapters).sort()).toEqual(['transport-service-desk', ...specializedIds].sort());
    specializedIds.forEach((id) => expect(operationsSimulationAdapters[id].id).toBe(id));
  });

  test('derives device records instead of generic current-task text', () => {
    const cases = [
      ['dns-resolution-desk', 'dns-node-1', 'DNS1', 'CACHE'],
      ['dns-resolution-desk', 'dns-node-2', 'DNS2', 'REFERRAL'],
      ['dns-resolution-desk', 'dns-node-3', 'DNS3', 'AUTHORITATIVE'],
      ['acl-policy-desk', 'acl-node-1', 'R1', 'ACL NETBITE-IN'],
      ['nat-translation-desk', 'nat-node-1', 'R1', 'GLOBAL'],
      ['ipv6-address-desk', 'ipv6-address-node-0', 'PC1', 'EXPANDED'],
      ['spanning-tree-desk', 'stp-node-1', 'SW2', 'ROOT'],
      ['etherchannel-desk', 'etherchannel-node-0', 'SW1', 'PORT-CHANNEL'],
      ['route-source-desk', 'route-source-node-1', 'R1', 'INSTALLED'],
      ['ospf-area-desk', 'ospf-node-0', 'R1', 'ROUTER ID'],
    ] as const;
    cases.forEach(([labId, deviceId, device, expected]) => {
      const session = configuredSession(labId, 0);
      expect(getOperationsDeviceRecord(labId, deviceId, device, session).lines.join(' ')).toContain(expected);
    });
  });

  test.each(specializedIds)('%s exposes repairable objective failures before its solved state', (labId) => {
    const definition = operationsSimulationDefinitions[labId];
    const empty = emptyOperationsSimulationSession();
    const emptyFailures = definition.stages.filter((stage) => !evaluateOperationsAdapterObjective(labId, stage.id, empty).passed);
    expect(emptyFailures.length).toBeGreaterThanOrEqual(4);

    let solved = empty;
    definition.stages.forEach((stage) => {
      solved = applySimulationConfiguration(solved, stage, Object.fromEntries(stage.fields.map((field) => [field.id, field.expected]))).session;
      const outcome = evaluateOperationsAdapterObjective(labId, stage.id, solved);
      expect(outcome.passed).toBe(true);
      solved = { ...solved, protocolState: outcome.protocolState ?? solved.protocolState };
    });
  });

  test('fails logical mistakes from engine state rather than field equality', () => {
    const labId = 'etherchannel-desk';
    const definition = operationsSimulationDefinitions[labId];
    const wrong = applySimulationConfiguration(emptyOperationsSimulationSession(), definition.stages[0], { 'lacp.modeA': 'passive', 'lacp.modeB': 'passive' }).session;
    const outcome = evaluateOperationsAdapterObjective(labId, 'mode', wrong);
    expect(outcome.passed).toBe(false);
    expect(outcome.tables[0].rows.join(' ')).toMatch(/PORT-CHANNEL DOWN/i);
  });

  test('derives capstone verification from shared prior state', () => {
    let session = emptyOperationsSimulationSession();
    const definition = operationsSimulationDefinitions['network-operations-capstone'];
    for (let index = 0; index < 4; index += 1) {
      const stage = definition.stages[index];
      session = applySimulationConfiguration(session, stage, Object.fromEntries(stage.fields.map((field) => [field.id, field.expected]))).session;
    }
    expect(definition.stages[4].fields).toHaveLength(0);
    expect(evaluateOperationsAdapterObjective('network-operations-capstone', 'office-verify', session)).toMatchObject({ passed: true });
    const broken = { ...session, configuration: { ...session.configuration, 'cap.lacp': 'passive-passive' } } as OperationsSimulationSession;
    expect(evaluateOperationsAdapterObjective('network-operations-capstone', 'office-verify', broken)).toMatchObject({ passed: false });
  });

  test('parses parameterized CLI commands into the same configuration state', () => {
    const acl = executeOperationsCliCommand(operationsSimulationDefinitions['acl-policy-desk'], emptyOperationsSimulationSession(), '20 permit tcp 192.168.10.0 0.0.0.255 host 192.168.20.20 eq 443');
    expect(acl.configuration).toMatchObject({ 'acl.sequence': 20, 'acl.action': 'permit', 'acl.port': 443 });
    const ospf = executeOperationsCliCommand(operationsSimulationDefinitions['ospf-area-desk'], emptyOperationsSimulationSession(), 'r2 router-id 22.22.22.22');
    expect(ospf.configuration).toMatchObject({ 'ospf.r2': '22.22.22.22' });
  });

  test('persists DNS cache and PAT translation state between objectives', () => {
    const dnsDefinition = operationsSimulationDefinitions['dns-resolution-desk'];
    let dns = emptyOperationsSimulationSession();
    dns = applySimulationConfiguration(dns, dnsDefinition.stages[0], Object.fromEntries(dnsDefinition.stages[0].fields.map((field) => [field.id, field.expected]))).session;
    dns = applySimulationConfiguration(dns, dnsDefinition.stages[1], Object.fromEntries(dnsDefinition.stages[1].fields.map((field) => [field.id, field.expected]))).session;
    const resolved = evaluateOperationsAdapterObjective('dns-resolution-desk', 'hierarchy', dns);
    expect((resolved.protocolState?.dns as { cache: unknown[] }).cache).toHaveLength(1);
    dns = { ...dns, protocolState: resolved.protocolState };
    dns = applySimulationConfiguration(dns, dnsDefinition.stages[2], { 'dns.queryMode': 'reuse' }).session;
    expect(evaluateOperationsAdapterObjective('dns-resolution-desk', 'cache', dns)).toMatchObject({ passed: true });

    const natDefinition = operationsSimulationDefinitions['nat-translation-desk'];
    let nat = emptyOperationsSimulationSession();
    for (let index = 0; index <= 2; index += 1) {
      const stage = natDefinition.stages[index];
      nat = applySimulationConfiguration(nat, stage, Object.fromEntries(stage.fields.map((field) => [field.id, field.expected]))).session;
    }
    const translated = evaluateOperationsAdapterObjective('nat-translation-desk', 'pat', nat);
    expect((translated.protocolState?.nat as { entries: unknown[] }).entries).toHaveLength(2);
  });

  test('all specialized lab definitions retain matching objective IDs', () => {
    specializedIds.forEach((id) => {
      expect(operationsSimulationDefinitions[id].stages.map(({ id: stageId }) => stageId)).toEqual(operationsLabDefinitions[id].stages.map(({ id: stageId }) => stageId));
    });
  });
});
