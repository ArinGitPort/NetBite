import { operationsLabDefinitions } from '@/features/operations/operations-lab-definitions';
import {
  applySimulationConfiguration,
  emptyOperationsSimulationSession,
  evaluateSimulationObjective,
  executeOperationsCliCommand,
  operationsModuleReleaseStates,
  operationsSimulationDefinitions,
  validateSimulationField,
} from '@/features/operations/operations-simulator';
import { operationsChapters } from '@/content/operations-chapters';
import { migrateOperationsLabState } from '@/store/use-operations-lab-store';
import { canOpenChapter, getChapterLockReason } from '@/core/learning/course-access';

describe('Course 2 guided simulation framework', () => {
  test('registers a released, state-driven simulator for every module and capstone', () => {
    for (const chapter of operationsChapters) {
      const simulator = operationsSimulationDefinitions[chapter.lab.id];
      const authored = operationsLabDefinitions[chapter.lab.id];
      expect(simulator.releaseState).toBe('released');
      expect(chapter.simulationReleaseState).toBe('released');
      expect(simulator.stages.map(({ id }) => id)).toEqual(authored.stages.map(({ id }) => id));
      expect(simulator.stages.length).toBeGreaterThanOrEqual(4);
      expect(simulator.stages.flatMap(({ fields }) => fields).length).toBeGreaterThanOrEqual(4);
      simulator.stages.forEach(({ fields, hints }) => {
        expect(fields.length).toBeGreaterThan(0);
        expect(hints).toHaveLength(2);
        fields.forEach(({ incorrectFeedback }) => expect(incorrectFeedback.length).toBeGreaterThan(20));
      });
      expect(operationsModuleReleaseStates[chapter.id]).toBe('released');
    }
    expect(operationsSimulationDefinitions['network-operations-capstone'].stages).toHaveLength(8);
  });

  test('rejects malformed values without mutation and retains valid mistakes', () => {
    const simulator = operationsSimulationDefinitions['transport-service-desk'];
    const current = simulator.stages[0];
    const empty = emptyOperationsSimulationSession();
    const malformed = applySimulationConfiguration(empty, current, { 'transport.protocol': 'tcp', 'transport.sourcePort': 70000, 'transport.destinationPort': 443, 'transport.listeningPort': 443 });
    expect(malformed.accepted).toBe(false);
    expect(malformed.session).toBe(empty);

    const wrong = applySimulationConfiguration(empty, current, { 'transport.protocol': 'udp', 'transport.sourcePort': 49152, 'transport.destinationPort': 443, 'transport.listeningPort': 443 });
    expect(wrong.accepted).toBe(true);
    const result = evaluateSimulationObjective('transport-service-desk', current, wrong.session, operationsLabDefinitions['transport-service-desk'].stages[0].explanation);
    expect(result).toMatchObject({ accepted: true, passed: false });
    expect(wrong.session.configuration['transport.protocol']).toBe('udp');
  });

  test('derives transport evidence from saved correct configuration', () => {
    const simulator = operationsSimulationDefinitions['transport-service-desk'];
    const current = simulator.stages[0];
    const applied = applySimulationConfiguration(emptyOperationsSimulationSession(), current, { 'transport.protocol': 'tcp', 'transport.sourcePort': 49152, 'transport.destinationPort': 443, 'transport.listeningPort': 443 });
    const result = evaluateSimulationObjective('transport-service-desk', current, applied.session, operationsLabDefinitions['transport-service-desk'].stages[0].explanation);
    expect(result.passed).toBe(true);
    expect(result.evidence.map(({ text }) => text)).toEqual(expect.arrayContaining(['SYN', 'SYN-ACK', 'ACK']));
  });

  test('CLI and inspector write the same configuration keys', () => {
    const simulator = operationsSimulationDefinitions['acl-policy-desk'];
    const session = { ...emptyOperationsSimulationSession(), stageIndex: 2 };
    const cli = executeOperationsCliCommand(simulator, session, '  PERMIT   tcp 192.168.10.0 0.0.0.255 host 192.168.20.20 eq 443 ');
    expect(cli).toMatchObject({ accepted: true, configuration: { 'acl.action': 'permit' } });
    const inspector = applySimulationConfiguration(session, simulator.stages[2], { 'acl.action': 'permit', 'acl.sequence': 10 });
    expect(inspector.session.configuration['acl.action']).toBe(cli.configuration['acl.action']);

    const lacp = operationsSimulationDefinitions['etherchannel-desk'];
    const first = executeOperationsCliCommand(lacp, emptyOperationsSimulationSession(), 'sw-a channel-group 1 mode active');
    const second = executeOperationsCliCommand(lacp, { ...emptyOperationsSimulationSession(), configuration: first.configuration }, 'sw-b channel-group 1 mode passive');
    expect(second.configuration).toMatchObject({ 'lacp.modeA': 'active', 'lacp.modeB': 'passive' });

    const ipv6 = executeOperationsCliCommand(operationsSimulationDefinitions['ipv6-neighbor-desk'], emptyOperationsSimulationSession(), 'ipv6 route 2001:db8:20::/64 fe80::2');
    expect(ipv6.configuration).toMatchObject({ 'nd.routePrefix': '2001:db8:20::', 'nd.routeLength': 64, 'nd.nextHop': 'fe80::2' });
  });

  test('validates IPv4, IPv6, ports, prefixes, and VLAN lists', () => {
    const fields = Object.values(operationsSimulationDefinitions).flatMap(({ stages }) => stages.flatMap(({ fields }) => fields));
    expect(validateSimulationField(fields.find(({ format }) => format === 'ipv4')!, '999.1.1.1')).toMatch(/octet/i);
    expect(validateSimulationField(fields.find(({ format }) => format === 'ipv6')!, '2001:::1')).toMatch(/not a valid/i);
    expect(validateSimulationField(fields.find(({ format }) => format === 'port')!, 0)).toMatch(/1 to 65535/i);
    expect(validateSimulationField(fields.find(({ format }) => format === 'prefix6')!, 129)).toMatch(/0 to 128/i);
    expect(validateSimulationField(fields.find(({ format }) => format === 'csv-vlan')!, '10,4095')).toMatch(/1 to 4094/i);
  });

  test('archives version-1 unfinished sessions during migration', () => {
    const legacy = { sessions: { 'transport-service-desk': { version: 1, stageIndex: 2, hints: ['old'], evidence: [] } }, history: {} };
    const migrated = migrateOperationsLabState(legacy);
    expect(migrated.sessions).toEqual({});
    expect(migrated.recoveryCopies['transport-service-desk']).toEqual(legacy.sessions['transport-service-desk']);
  });

  test('blocks validation modules consistently while allowing presentation bypass', () => {
    const chapter = { ...operationsChapters[0], simulationReleaseState: 'validation' as const };
    const progress = { completedLessonIds: [], completedLabIds: [], quizScores: {}, quizContentVersions: {}, reviewedFlashcardChapterIds: [], flashcardContentVersions: {}, readinessScores: { 'network-operations': 10 } };
    expect(canOpenChapter(chapter, progress)).toBe(false);
    expect(getChapterLockReason(chapter, progress)).toBe('SIMULATOR IN VALIDATION');
    expect(canOpenChapter(chapter, progress, true)).toBe(true);
  });
});
