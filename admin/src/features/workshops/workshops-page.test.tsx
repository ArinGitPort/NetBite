import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { InstructorApprovals, WorkshopStudio } from './workshops-page';
import * as api from '../../lib/content-api';

vi.mock('../../lib/content-api', () => ({
  createWorkshop: vi.fn(), createWorkshopAssessment: vi.fn(), createWorkshopClass: vi.fn(), createWorkshopLesson: vi.fn(), deleteWorkshop: vi.fn(),
  getInstructorRequests: vi.fn(), getWorkshopClasses: vi.fn(), getWorkshopContent: vi.fn(), getWorkshopGradebook: vi.fn(), getWorkshops: vi.fn(), getWorkshopVersions: vi.fn(),
  publishWorkshop: vi.fn(), reviewInstructorRequest: vi.fn(), saveWorkshop: vi.fn(), saveWorkshopAssessment: vi.fn(), saveWorkshopLesson: vi.fn(), saveWorkshopTopology: vi.fn(), setWorkshopClassEnrollment: vi.fn(),
}));

const workshop = { id: 'workshop-1', title: 'Routing review', description: 'Review routes.', archived: false, current_version_id: 'version-1', updated_at: '2026-08-27T00:00:00.000Z' };
const lesson = { id: 'lesson-row-1', workshop_id: 'workshop-1', stable_id: 'lesson-1', position: 1, draft: { title: 'Static routes', summary: 'Route review', blocks: [] }, archived: false };
const assessment = { id: 'assessment-row-1', workshop_id: 'workshop-1', stable_id: 'assessment-1', title: 'Route check', mode: 'graded' as const, draft: { instructions: 'Choose the best answer.', questions: [] }, settings: { maximumAttempts: 2, gradePolicy: 'highest', passingPercentage: 80, feedbackRelease: 'final-attempt', shuffleQuestions: true, shuffleAnswers: true }, archived: false };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getWorkshops).mockResolvedValue([workshop]);
  vi.mocked(api.getWorkshopClasses).mockResolvedValue([]);
  vi.mocked(api.getWorkshopContent).mockResolvedValue({ lessons: [lesson], topologies: [], assessments: [assessment], flashcards: [] });
  vi.mocked(api.getWorkshopVersions).mockResolvedValue([{ id: 'version-1', workshop_id: 'workshop-1', version: 1, checksum: 'a'.repeat(64), published_at: '2026-08-27T00:00:00.000Z' }]);
});
afterEach(cleanup);

describe('instructor workshop portal', () => {
  test('provides lesson and topology authoring from the selected workshop', async () => {
    render(<WorkshopStudio area="workshops" />);
    expect(await screen.findByText('Static routes')).toBeTruthy();
    expect(screen.getByText('1 published version')).toBeTruthy();
    fireEvent.click(screen.getByText('NEW TOPOLOGY'));
    fireEvent.click(await screen.findByText('pc'));
    expect(screen.getByDisplayValue('PC1')).toBeTruthy();
    expect(screen.getByText('SAVE TOPOLOGY')).toBeTruthy();
  });

  test('shows complete graded assessment settings', async () => {
    render(<WorkshopStudio area="workshop-assessments" />);
    expect(await screen.findByDisplayValue('Route check')).toBeTruthy();
    expect(screen.getByText('Opening date (optional)')).toBeTruthy();
    expect(screen.getByText('Due date (optional)')).toBeTruthy();
    expect(screen.getByText(/Shuffle question order/)).toBeTruthy();
    expect(screen.getByText(/Shuffle answer order/)).toBeTruthy();
  });

  test('renames a workshop through the details dialog', async () => {
    vi.mocked(api.saveWorkshop).mockResolvedValue({ ...workshop, title: 'Updated routing review' });
    render(<WorkshopStudio area="workshops" />);
    fireEvent.click(await screen.findByText('EDIT DETAILS'));
    const name = screen.getByLabelText('Workshop name');
    fireEvent.change(name, { target: { value: 'Updated routing review' } });
    fireEvent.click(screen.getByText('SAVE CHANGES'));
    await waitFor(() => expect(api.saveWorkshop).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated routing review' })));
  });

  test('requires confirmation before deleting an unpublished draft', async () => {
    const draft = { ...workshop, current_version_id: undefined };
    vi.mocked(api.getWorkshops).mockResolvedValueOnce([draft]).mockResolvedValue([]);
    vi.mocked(api.getWorkshopVersions).mockResolvedValue([]);
    vi.mocked(api.deleteWorkshop).mockResolvedValue(draft.id);
    render(<WorkshopStudio area="workshops" />);
    fireEvent.click(await screen.findByText('EDIT DETAILS'));
    fireEvent.click(screen.getByText('DELETE DRAFT'));
    expect(api.deleteWorkshop).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('DELETE PERMANENTLY'));
    await waitFor(() => expect(api.deleteWorkshop).toHaveBeenCalledWith(draft.id));
  });

  test('lets an administrator approve a pending instructor request', async () => {
    vi.mocked(api.getInstructorRequests).mockResolvedValue([{ user_id: 'user-1', display_name: 'Instructor One', institution: 'NetBite College', reason: 'Teach networking.', status: 'pending', requested_at: '2026-08-27T00:00:00.000Z' }]);
    vi.mocked(api.reviewInstructorRequest).mockResolvedValue(undefined);
    render(<InstructorApprovals />);
    fireEvent.click(await screen.findByText('APPROVE INSTRUCTOR'));
    await waitFor(() => expect(api.reviewInstructorRequest).toHaveBeenCalledWith('user-1', 'approved'));
  });
});
