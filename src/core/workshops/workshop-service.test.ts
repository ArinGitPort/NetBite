import { parseWorkshopLibrary, WorkshopServiceError } from '@/core/workshops/workshop-service';

function libraryEntry() {
  return [{
    classId: 'class-1',
    joinedAt: '2026-08-27T00:00:00.000Z',
    savedLessonIds: ['lesson-1'],
    manifest: {
      workshopId: 'workshop-1', versionId: 'version-1', version: 1,
      title: 'Routing review', description: 'Private class material.', instructorName: 'Instructor',
      publishedAt: '2026-08-27T00:00:00.000Z', archived: false,
      lessons: [{ id: 'lesson-1', title: 'Routes', summary: '', order: 1, blocks: [{ id: 'block-1', type: 'paragraph', text: 'Review the route.' }] }],
      topologies: [], flashcards: [],
      assessments: [{
        id: 'assessment-1', title: 'Route check', mode: 'graded', instructions: 'Choose the best answer.',
        questions: [{ id: 'question-1', prompt: 'Which route is used?', choices: [{ id: 'a', label: 'Route A' }, { id: 'b', label: 'Route B' }] }],
        settings: { maximumAttempts: 2, gradePolicy: 'highest', passingPercentage: 80, feedbackRelease: 'final-attempt', shuffleQuestions: true, shuffleAnswers: true },
      }],
    },
  }];
}

describe('workshop library parsing', () => {
  test('accepts a compatible learner package', () => {
    expect(parseWorkshopLibrary(libraryEntry())).toHaveLength(1);
  });

  test('rejects protected answers in graded learner packages', () => {
    const value = libraryEntry();
    Object.assign(value[0].manifest.assessments[0].questions[0], { correctChoiceId: 'a' });
    expect(() => parseWorkshopLibrary(value)).toThrow(WorkshopServiceError);
  });

  test('rejects malformed topologies before replacing the offline copy', () => {
    const value = libraryEntry();
    value[0].manifest.topologies.push({
      id: 'topology-1', title: 'Broken link', accessibilityDescription: 'A broken topology.',
      devices: [], links: [{ id: 'link-1', fromDeviceId: 'pc1', fromInterfaceId: 'e0', toDeviceId: 'sw1', toInterfaceId: 'f0' }],
    } as never);
    expect(() => parseWorkshopLibrary(value)).toThrow('topology could not be verified');
  });
});
