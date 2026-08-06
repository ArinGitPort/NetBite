import { foundationChapters, operationsChapters } from '@/content/chapters';
import { canEnterOperations, courses, getCourseChapters, isCourseComplete } from '@/content/courses';
import { getQuizMasteryScore } from '@/content/progress';
import { operationsLabDefinitions } from '@/features/operations/operations-lab-definitions';

const emptyProgress = { completedLessonIds: [], completedLabIds: [], quizScores: {}, quizContentVersions: {}, reviewedFlashcardChapterIds: [], flashcardContentVersions: {}, completedCapstoneIds: [], readinessScores: {} };

describe('Network Operations course', () => {
  test('registers two courses without changing Foundation chapter IDs', () => {
    expect(courses.map(({ id }) => id)).toEqual(['network-foundations', 'network-operations']);
    expect(courses[1].prerequisitePolicy).toEqual({ diagnosticId: 'network-operations-readiness', questionCount: 12, masteryScore: 10 });
    expect(foundationChapters.map(({ id }) => id)).toEqual(['1','2','3','4','5','6','7','8','9','10','11','12']);
    expect(operationsChapters.map(({ id }) => id)).toEqual(['ops-01','ops-02','ops-03','ops-04','ops-05','ops-06','ops-07','ops-08','ops-09','ops-10','ops-11']);
  });

  test('contains the exact 82-lesson dependency-ordered curriculum', () => {
    expect(operationsChapters.map(({ lessons }) => lessons.length)).toEqual([8,7,7,8,8,8,8,8,6,6,8]);
    expect(operationsChapters.flatMap(({ lessons }) => lessons)).toHaveLength(82);
    expect(new Set(operationsChapters.flatMap(({ lessons }) => lessons.map(({ id }) => id))).size).toBe(82);
    operationsChapters.forEach((chapter, index) => expect(chapter.prerequisiteChapterIds).toEqual(index ? [operationsChapters[index - 1].id] : []));
  });

  test('uses the planned scenario assessment sizes and mastery', () => {
    expect(operationsChapters.map(({ quiz }) => quiz.length)).toEqual([8,8,8,8,8,8,8,8,7,7,8]);
    expect(operationsChapters.map(getQuizMasteryScore)).toEqual([7,7,7,7,7,7,7,7,6,6,7]);
    operationsChapters.forEach((chapter) => {
      const lessonIds = new Set(chapter.lessons.map(({ id }) => id));
      chapter.quiz.forEach(({ lessonId }) => expect(lessonIds.has(lessonId)).toBe(true));
      expect(chapter.flashcards.length).toBeGreaterThanOrEqual(8);
      expect(chapter.flashcards.length).toBeLessThanOrEqual(11);
    });
  });

  test('registers a protocol-backed guided lab for every module', () => {
    operationsChapters.forEach((chapter) => {
      const lab = operationsLabDefinitions[chapter.lab.id];
      expect(lab).toBeDefined();
      expect(lab.stages).toHaveLength(4);
      expect(lab.limitations.length).toBeGreaterThan(20);
      lab.stages.forEach((stage) => {
        expect(stage.evidence.length).toBeGreaterThan(0);
        expect(stage.hint.length).toBeGreaterThan(20);
        expect(stage.choices.some(({ id }) => id === stage.correctChoiceId)).toBe(true);
        expect(stage.explanation.rule.length).toBeGreaterThan(20);
      });
    });
    expect(operationsLabDefinitions['network-operations-capstone'].stages).toHaveLength(8);
  });

  test('allows readiness by Foundation completion or 10/12 diagnostic only', () => {
    expect(canEnterOperations(emptyProgress)).toBe(false);
    expect(canEnterOperations({ ...emptyProgress, readinessScores: { 'network-operations': 9 } })).toBe(false);
    expect(canEnterOperations({ ...emptyProgress, readinessScores: { 'network-operations': 10 } })).toBe(true);
    expect(getCourseChapters('network-operations')).toBe(operationsChapters);
    expect(isCourseComplete('network-operations', emptyProgress)).toBe(false);
  });
});
