import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import WorkshopAssessmentScreen from '@/app/workshops/assessment/[classId]/[assessmentId]';
import { useWorkshopStore } from '@/store/use-workshop-store';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ classId: 'class-1', assessmentId: 'assessment-1' }),
}));
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock('@/features/account/auth-context', () => ({
  useAuth: () => ({ status: 'guest', user: undefined }),
}));

const entry = {
  classId: 'class-1', joinedAt: '2026-09-02T00:00:00.000Z', savedLessonIds: [],
  manifest: {
    workshopId: 'workshop-1', versionId: 'version-1', version: 1, title: 'Practice workshop',
    description: '', instructorName: 'Instructor', publishedAt: '2026-09-02T00:00:00.000Z', archived: false,
    lessons: [], topologies: [], flashcards: [],
    assessments: [{
      id: 'assessment-1', title: 'Practice check', mode: 'practice', instructions: 'Choose one.',
      questions: [{
        id: 'question-1', prompt: 'Which option is correct?',
        choices: [{ id: 'a', label: 'Option A' }, { id: 'b', label: 'Option B' }],
        correctChoiceId: 'a', explanation: 'Option A is correct.',
      }],
    }],
  },
};

describe('Workshop assessment action bar', () => {
  beforeEach(() => useWorkshopStore.setState({ library: [entry] as never, drafts: {} }));
  afterEach(() => {
    cleanup();
    useWorkshopStore.setState({ library: [], drafts: {} });
  });

  test('stays docked, enables after answering, and disappears after checking', async () => {
    await render(<WorkshopAssessmentScreen />);
    const action = screen.getByRole('button', { name: 'Check practice answers' });
    expect(screen.getByTestId('screen-footer')).toBeTruthy();
    expect(action.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByRole('radio', { name: 'Option A' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Check practice answers' }).props.accessibilityState.disabled).toBe(false));
    fireEvent.press(screen.getByRole('button', { name: 'Check practice answers' }));

    await waitFor(() => expect(screen.queryByTestId('screen-footer')).toBeNull());
    expect(screen.getByText('PRACTICE RESULT')).toBeTruthy();
  });
});
