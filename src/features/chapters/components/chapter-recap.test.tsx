import { render } from '@testing-library/react-native';

import { chapterThree } from '@/content/chapter-three';
import { ChapterRecap } from '@/features/chapters/components/chapter-recap';

describe('ChapterRecap', () => {
  test('renders the completed work, learned concepts, and next signal', async () => {
    const screen = await render(
      <ChapterRecap recap={{
        built: 'A small LAN',
        learned: 'Devices and links',
        next: 'Ethernet frames',
      }} />,
    );

    expect(screen.getByText('A small LAN')).toBeTruthy();
    expect(screen.getByText('Devices and links')).toBeTruthy();
    expect(screen.getByText('Ethernet frames')).toBeTruthy();
  });

  test('renders the Chapter 3 completion recap', async () => {
    const screen = await render(<ChapterRecap recap={chapterThree.recap} />);

    expect(screen.getByText('A learned MAC address table')).toBeTruthy();
    expect(screen.getByText('MAC roles, source learning, known forwarding, unknown flooding, and broadcasts')).toBeTruthy();
    expect(screen.getByText('How IPv4 gives interfaces logical network identities')).toBeTruthy();
  });
});
