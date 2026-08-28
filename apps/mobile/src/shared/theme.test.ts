import { Typography, type TypographyRole } from '@/shared/theme';

describe('mobile typography scale', () => {
  const expected: Record<TypographyRole, { fontSize: number; lineHeight: number }> = {
    screenTitle: { fontSize: 18, lineHeight: 26 },
    sectionHeading: { fontSize: 15, lineHeight: 22 },
    body: { fontSize: 14, lineHeight: 22 },
    bodySmall: { fontSize: 13, lineHeight: 20 },
    label: { fontSize: 12, lineHeight: 18 },
    technical: { fontSize: 11, lineHeight: 17 },
  };

  test('defines every approved role at the balanced-readable size', () => {
    for (const role of Object.keys(expected) as TypographyRole[]) {
      expect(Typography[role]).toMatchObject(expected[role]);
    }
  });

  test('never drops below the 11 px technical minimum', () => {
    expect(Math.min(...Object.values(Typography).map((role) => role.fontSize))).toBe(11);
  });
});
