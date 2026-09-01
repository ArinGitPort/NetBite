/* global __dirname, describe, expect, test */
const { readFileSync, readdirSync } = require('node:fs');
const { extname, join, relative } = require('node:path');

const approvedLegacyPaletteFiles = new Set([
  'features/cli/components/cli-lab.tsx',
  'features/cli/components/cli-topology-view.tsx',
  'features/cli/components/guided-cli-objective-panel.tsx',
  'shared/components/cli-console-shell.tsx',
]);

function productionSources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionSources(path);
    if (!['.ts', '.tsx'].includes(extname(entry.name))) return [];
    return [path];
  });
}

describe('mobile theme migration boundary', () => {
  test('allows the legacy static palette only inside the intentional CLI workspace', () => {
    const sourceRoot = __dirname.replace(/[\\/]shared$/, '');
    const offenders = productionSources(sourceRoot).flatMap((path) => {
      if (!/\bPalette\./.test(readFileSync(path, 'utf8'))) return [];
      const sourcePath = relative(sourceRoot, path).replaceAll('\\', '/');
      return approvedLegacyPaletteFiles.has(sourcePath) ? [] : [sourcePath];
    });

    expect(offenders).toEqual([]);
  });
});
