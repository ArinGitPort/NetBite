import { router } from 'expo-router';
import { fireEvent, render } from '@testing-library/react-native';

import { foundationChapters } from '@/content/chapters';
import { FoundationLabSupport } from '@/features/practice/components/foundation-lab-support';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('FoundationLabSupport', () => {
  test('shows supplied facts and opens prerequisite lessons with lab return context', async () => {
    const view = await render(<FoundationLabSupport chapter={foundationChapters[0]} labId="first-network" />);
    await fireEvent.press(view.getByText(/learn the setup/i));

    expect(view.getByText(/starting facts/i)).toBeTruthy();
    expect(view.getByText(/Two PCs need separate links/)).toBeTruthy();

    await fireEvent.press(view.getByText(/open what is a network/i));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/lesson/[lessonId]',
      params: { lessonId: 'what-is-a-network', fromLabId: 'first-network' },
    });
  });
});
