import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/workshop-service', () => ({
  getAssessmentAnalytics: vi.fn().mockResolvedValue({
    assessmentId: 'assessment-1', assessmentTitle: 'Routing quiz', recordedAttempts: 1, allAttempts: 2,
    questions: [{ questionId: 'question-1', prompt: 'Which route?', recorded: { correct: 1, incorrect: 0 }, all: { correct: 1, incorrect: 1 } }],
  }),
  getAttemptDetail: vi.fn().mockResolvedValue({
    assessmentTitle: 'Routing quiz', attempts: [{ attemptId: 'attempt-1', attemptNumber: 1, submittedAt: '2026-10-11T00:00:00Z', score: 1, total: 1, percentage: 100, late: false, recorded: true,
      answers: [{ questionId: 'question-1', prompt: 'Which route?', selectedChoice: 'Route A', correctChoice: 'Route A', correct: true }] }],
  }),
}));

import { AssessmentInsights, AttemptDetailDialog } from '@/features/classes/assessment-insights';
import { getAssessmentAnalytics, getAttemptDetail } from '@/lib/api/workshop-service';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('read-only assessment insight', () => {
  it('defaults to recorded attempts and can include all attempts', async () => {
    render(<AssessmentInsights classId="class-1" rows={[{ assessmentId: 'assessment-1', assessmentTitle: 'Routing quiz' }]} />);
    expect(await screen.findByText('1 attempts included')).toBeInTheDocument();
    expect(screen.getByText(/1 correct.*0 incorrect/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All attempts' }));
    expect(screen.getByText('2 attempts included')).toBeInTheDocument();
    expect(screen.getByText(/1 correct.*1 incorrect/)).toBeInTheDocument();
    expect(getAssessmentAnalytics).toHaveBeenCalledWith('class-1', 'assessment-1');
  });

  it('identifies the recorded attempt and shows answer correctness without edit controls', async () => {
    render(<AttemptDetailDialog classId="class-1" onClose={vi.fn()} row={{ studentId: 'student-1', studentName: 'Alice', assessmentId: 'assessment-1', assessmentTitle: 'Routing quiz' }} />);
    expect(await screen.findByText(/Attempt 1.*RECORDED/)).toBeInTheDocument();
    expect(screen.getByText(/Selected: Route A.*Correct/)).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(getAttemptDetail).toHaveBeenCalledWith('class-1', 'assessment-1', 'student-1');
  });
});
