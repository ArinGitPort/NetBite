import { fireEvent, render } from '@testing-library/react-native';

import { SubnettingCheatSheet } from '@/features/chapters/components/subnetting-cheat-sheet';

describe('SubnettingCheatSheet', () => {
  test('shows the complete bit-value table and the Chapter 5 prefix focus', async () => {
    const screen = await render(<SubnettingCheatSheet />);

    expect(screen.getByText('SUBNETTING CHEAT SHEET')).toBeTruthy();
    expect(screen.queryByText('MASK OCTET')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: /subnetting cheat sheet/i }));

    expect(screen.getByText('MASK OCTET')).toBeTruthy();
    expect(screen.getAllByText('/26').length).toBeGreaterThan(0);
    expect(screen.getAllByText('192').length).toBeGreaterThan(0);
    expect(screen.getAllByText('64').length).toBeGreaterThan(0);
    expect(screen.getByText('255.255.255.0')).toBeTruthy();
    expect(screen.getByText('255.255.255.192')).toBeTruthy();
    expect(screen.getByText(/255\.255\.255\.255.*\/32/)).toBeTruthy();
    expect(screen.getByText('FIND A SUBNET RANGE')).toBeTruthy();
    expect(screen.getByText('BLOCK START')).toBeTruthy();
    expect(screen.getByText('TARGET IP / INSIDE THIS BLOCK')).toBeTruthy();
    expect(screen.getByText('NEXT NETWORK')).toBeTruthy();
    expect(screen.getByText('RESULT / CONTAINING SUBNET')).toBeTruthy();
    expect(screen.getByText(/192\.168\.10\.70 belongs to subnet 192\.168\.10\.64\/26/)).toBeTruthy();
    expect(screen.getByText('USABLE  64 − 2 = 62')).toBeTruthy();
    expect(screen.getAllByText('NETWORK  192.168.10.64/26').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SUBNET MASK  255.255.255.192').length).toBeGreaterThan(0);
    expect(screen.getByText('BROADCAST  192.168.10.127')).toBeTruthy();
    expect(screen.getByText(/subtract two.*\/24–\/30/i)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /more worked examples/i }));
    expect(screen.getByText('EXAMPLE 1 / FIND A /25 RANGE')).toBeTruthy();
    expect(screen.getByText('NETWORK  192.168.10.128/25')).toBeTruthy();
    expect(screen.getByText('NETWORK  10.20.30.128/27')).toBeTruthy();
    expect(screen.getByText('GIVEN  172.16.8.77 with mask 255.255.255.192')).toBeTruthy();
  });
});
