import { render } from '@testing-library/react-native';

import { LinkConnectionRecord } from '@/shared/components/link-connection-record';

describe('LinkConnectionRecord', () => {
  test('separates endpoints, network context, and operational state', async () => {
    const screen = await render(<LinkConnectionRecord index={1} a={{ deviceName: 'PC1', interfaceName: 'E0' }} b={{ deviceName: 'R1', interfaceName: 'G0/0' }} context="192.168.10.0/24" state="UP" />);
    expect(screen.getByText('CONNECTION 1')).toBeTruthy();
    expect(screen.getByText('PC1')).toBeTruthy();
    expect(screen.getByText('R1')).toBeTruthy();
    expect(screen.getByText('PORT E0')).toBeTruthy();
    expect(screen.getByText('PORT G0/0')).toBeTruthy();
    expect(screen.getByText('192.168.10.0/24')).toBeTruthy();
    expect(screen.getByText('UP')).toBeTruthy();
  });
});
