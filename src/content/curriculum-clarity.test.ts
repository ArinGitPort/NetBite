import { chapters } from '@/content/chapters';
import { operationsLabDefinitions } from '@/features/operations/operations-lab-definitions';
import { operationsSimulationDefinitions } from '@/features/operations/operations-simulator';

describe('curriculum-wide clarity standard', () => {
  const lessons = chapters.flatMap((chapter) => chapter.lessons);

  test('preserves all 166 stable lesson IDs across both courses', () => {
    expect(lessons).toHaveLength(166);
    expect(new Set(lessons.map(({ id }) => id)).size).toBe(166);
    expect(chapters.filter(({ courseId }) => courseId === 'network-foundations').flatMap(({ lessons: items }) => items)).toHaveLength(84);
    expect(chapters.filter(({ courseId }) => courseId === 'network-operations').flatMap(({ lessons: items }) => items)).toHaveLength(82);
  });

  test('keeps examples complete and removes learner-facing generator language', () => {
    const banned = /bounded model|bounded state|deterministic state|deterministic model|what happens in this example|check something unrelated first|change every setting at once/i;
    lessons.forEach((lesson) => {
      const copy = JSON.stringify(lesson);
      expect(copy).not.toMatch(banned);
      expect(lesson.example?.setup.length).toBeGreaterThan(10);
      expect(lesson.example?.result.length).toBeGreaterThan(10);
      expect(lesson.takeaway.length).toBeGreaterThan(10);
    });
  });

  test('gives every Operations input visible task facts and field guidance', () => {
    Object.values(operationsLabDefinitions).forEach((lab) => {
      const simulator = operationsSimulationDefinitions[lab.id];
      expect(simulator).toBeDefined();
      simulator!.stages.forEach((stage) => {
        expect(stage.providedFacts?.length).toBeGreaterThan(0);
        stage.fields.forEach((field) => {
          expect(field.label.length).toBeGreaterThanOrEqual(2);
          expect(field.incorrectFeedback.length).toBeGreaterThan(15);
          expect(field.expected).not.toBeUndefined();
        });
      });
    });
  });

  test('uses an authored setup and worked example for every Operations practical', () => {
    const labs = Object.values(operationsLabDefinitions);
    expect(labs).toHaveLength(12);
    labs.forEach((lab) => {
      expect(lab.briefing.startingState.length).toBeGreaterThanOrEqual(3);
      expect(lab.briefing.workedExample.steps.length).toBeGreaterThanOrEqual(4);
      expect(lab.briefing.workedExample.title).not.toBe('HOW TO APPROACH THIS LAB');
      expect(lab.briefing.taskChecklist).toHaveLength(lab.stages.length);
    });
  });

  test('keeps relayed DHCP pool values on the client subnet', () => {
    const simulator = operationsSimulationDefinitions['dhcp-lease-desk'];
    const pool = simulator.stages.find(({ id }) => id === 'pool')!;
    const relay = simulator.stages.find(({ id }) => id === 'relay')!;
    expect(pool.fields.find(({ id }) => id === 'dhcp.network')?.expected).toBe('192.168.20.0');
    expect(relay.fields.find(({ id }) => id === 'dhcp.relay')?.expected).toBe('192.168.20.1');
    expect(JSON.stringify(pool)).not.toContain('192.168.10.0');
  });
});
