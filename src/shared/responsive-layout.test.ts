import { getEffectiveWidth, getResponsiveMode } from '@/shared/responsive-layout';

describe('responsive layout standard', () => {
  test.each([
    [320, 1, 'compact'],
    [360, 1, 'compact'],
    [390, 1, 'compact'],
    [430, 1, 'compact'],
    [500, 1, 'regular'],
    [639, 1, 'regular'],
    [640, 1, 'wide'],
    [720, 1, 'wide'],
    [844, 1, 'wide'],
  ] as const)('maps width %i at font scale %s to %s', (width, fontScale, expected) => {
    expect(getResponsiveMode(getEffectiveWidth(width, fontScale))).toBe(expected);
  });

  test.each([
    [720, 1.3, 'regular'],
    [720, 1.5, 'regular'],
    [720, 2, 'compact'],
    [500, 1.3, 'compact'],
    [640, 1.5, 'compact'],
  ] as const)('reflows width %i earlier at font scale %s', (width, fontScale, expected) => {
    expect(getResponsiveMode(getEffectiveWidth(width, fontScale))).toBe(expected);
  });

  test('never expands effective width when the system scale is below one', () => {
    expect(getEffectiveWidth(430, 0.8)).toBe(430);
  });
});
