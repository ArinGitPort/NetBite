import { calculateGradebookSummary, validateGradedAssessmentSettings, validateWorkshopTopology } from './workshop-contract';

describe('workshop contract', () => {
  test('rejects reused cable endpoints and malformed addresses', () => {
    const issues = validateWorkshopTopology({
      id: 'topology-1', title: 'LAN', accessibilityDescription: 'Two links.',
      devices: [
        { id: 'pc1', type: 'pc', name: 'PC1', x: .1, y: .5, interfaces: [{ id: 'e0', name: 'E0', ipv4Address: '999.1.1.1', state: 'up' }] },
        { id: 'sw1', type: 'switch', name: 'SW1', x: .5, y: .5, interfaces: [{ id: 'f1', name: 'F0/1', state: 'up' }, { id: 'f2', name: 'F0/2', state: 'up' }] },
      ],
      links: [
        { id: 'a', fromDeviceId: 'pc1', fromInterfaceId: 'e0', toDeviceId: 'sw1', toInterfaceId: 'f1' },
        { id: 'b', fromDeviceId: 'pc1', fromInterfaceId: 'e0', toDeviceId: 'sw1', toInterfaceId: 'f2' },
      ],
    });
    expect(issues.map(({ message }) => message)).toEqual(expect.arrayContaining([expect.stringMatching(/valid IPv4/), expect.stringMatching(/only one cable/)]));
  });

  test('validates graded assessment policies', () => {
    expect(validateGradedAssessmentSettings({ maximumAttempts: 0, gradePolicy: 'highest', passingPercentage: 101, feedbackRelease: 'due-date', shuffleQuestions: false, shuffleAnswers: false })).toHaveLength(2);
  });

  test('keeps an intentional down connection as a warning', () => {
    const issues = validateWorkshopTopology({
      id: 'topology-1', title: 'Repair task', accessibilityDescription: 'A disconnected cable.',
      devices: [
        { id: 'pc1', type: 'pc', name: 'PC1', x: .1, y: .5, interfaces: [{ id: 'e0', name: 'E0', state: 'up' }] },
        { id: 'sw1', type: 'switch', name: 'SW1', x: .5, y: .5, interfaces: [{ id: 'f1', name: 'F0/1', state: 'up' }] },
      ],
      links: [{ id: 'link-1', fromDeviceId: 'pc1', fromInterfaceId: 'e0', toDeviceId: 'sw1', toInterfaceId: 'f1', state: 'down' }],
    });
    expect(issues).toEqual([{ severity: 'warning', path: 'links.link-1.state', message: expect.stringMatching(/connection is down/i) }]);
  });

  test('derives a useful gradebook summary', () => {
    const summary = calculateGradebookSummary([
      { studentId: '1', studentName: 'A', assessmentId: 'a', recordedScore: 8, total: 10, percentage: 80, attempts: 1, status: 'passed' },
      { studentId: '2', studentName: 'B', assessmentId: 'a', recordedScore: 6, total: 10, percentage: 60, attempts: 2, status: 'needs-review' },
      { studentId: '3', studentName: 'C', assessmentId: 'a', total: 10, attempts: 0, status: 'missing' },
    ]);
    expect(summary).toMatchObject({ enrolled: 3, submitted: 2, missing: 1, average: 70, median: 70, highest: 80, lowest: 60, passRate: 50 });
  });
});
