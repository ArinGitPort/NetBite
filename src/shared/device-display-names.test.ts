import { getDeviceDisplayName, normalizeDeviceReference, normalizeVisibleDeviceName } from '@/shared/device-display-names';

describe('device display names', () => {
  test.each([
    ['pc-a', 'PC1'],
    ['PC-A', 'PC1'],
    ['PC 2', 'PC2'],
    ['nb-r1', 'R1'],
    ['R-2', 'R2'],
    ['NB-SW-A', 'SW1'],
    ['SW-3', 'SW3'],
    ['DHCP-1', 'DHCP1'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(getDeviceDisplayName(input)).toBe(expected);
  });

  test('normalizes legacy references without changing stable IDs', () => {
    expect(normalizeDeviceReference('NB-SW-B')).toBe('sw-b');
    expect(normalizeDeviceReference('pc-a')).toBe('pc-a');
    expect(normalizeDeviceReference('DHCP1')).toBe('dhcp-1');
  });

  test('rewrites visible legacy names inside learner-facing copy', () => {
    expect(normalizeVisibleDeviceName('PC-A reaches NB-R1 through NB-SW-A.')).toBe('PC1 reaches R1 through SW1.');
  });
});
