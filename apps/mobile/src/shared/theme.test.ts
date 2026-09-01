import { DarkPalette, LightPalette, Typography, type ThemeColors, type TypographyRole } from '@/shared/theme';

function luminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)!.map((value) => Number.parseInt(value, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

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

describe.each([['light', LightPalette], ['dark', DarkPalette]] as const)('%s theme contrast', (_theme, colors: ThemeColors) => {
  test.each([
    ['primary copy on canvas', colors.text, colors.background],
    ['primary copy on surface', colors.text, colors.surface],
    ['primary copy on raised surface', colors.text, colors.surfaceRaised],
    ['muted copy on canvas', colors.textMuted, colors.background],
    ['muted copy on surface', colors.textMuted, colors.surface],
    ['accent headings', colors.accentBright, colors.background],
    ['orange highlights', colors.orange, colors.orangeSoft],
    ['green highlights', colors.green, colors.greenSoft],
    ['danger messages', colors.danger, colors.dangerSoft],
  ])('%s remains readable', (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
