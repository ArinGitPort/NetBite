import { router } from 'expo-router';
import { fireEvent, render } from '@testing-library/react-native';

import { LabSetupSupport, labSetupSupportIds } from '@/features/practice/components/foundation-lab-support';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('LabSetupSupport', () => {
  test('covers exactly the labs that need the shared inline setup disclosure', () => {
    expect(labSetupSupportIds).toHaveLength(13);
    expect(new Set(labSetupSupportIds).size).toBe(13);
    expect(labSetupSupportIds).toContain('transport-service-desk');
    expect(labSetupSupportIds).not.toContain('dhcp-lease-desk');
  });

  test('starts collapsed, expands inline, and opens prerequisite lessons with lab return context', async () => {
    const view = await render(<LabSetupSupport labId="first-network" />);
    expect(view.queryByText(/starting facts/i)).toBeNull();
    expect(view.getByRole('button', { name: /view completed lab/i })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: /learn the setup/i }));

    expect(view.getByText(/starting facts/i)).toBeTruthy();
    expect(view.getByText(/Two PCs need separate links/)).toBeTruthy();

    await fireEvent.press(view.getByText(/open what is a network/i));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/lesson/[lessonId]',
      params: { lessonId: 'what-is-a-network', fromLabId: 'first-network' },
    });
  });

  test('opens the completed example separately and returns without changing setup state', async () => {
    const view = await render(<LabSetupSupport labId="first-network" />);
    await fireEvent.press(view.getByRole('button', { name: /view completed lab/i }));
    expect(view.getByText('HOW TO STUDY THIS EXAMPLE')).toBeTruthy();
    expect(view.getByText('PC1')).toBeTruthy();
    expect(view.getByText('PC2')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Return to my lab'));
    expect(view.queryByText('HOW TO STUDY THIS EXAMPLE')).toBeNull();
    expect(view.getByRole('button', { name: /view completed lab/i })).toBeTruthy();
  });

  test('does not duplicate setup guidance for an Operations lab with an embedded briefing', async () => {
    const view = await render(<LabSetupSupport labId="dhcp-lease-desk" />);
    expect(view.toJSON()).toBeNull();
  });
});
