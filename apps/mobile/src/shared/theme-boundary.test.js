/* global __dirname, describe, expect, test */
const { readFileSync, readdirSync } = require('node:fs');
const { extname, join, relative } = require('node:path');

const approvedLegacyPaletteFiles = new Set([
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

  test('keeps workshop topology labels on the shared readable technical type role', () => {
    const sourceRoot = __dirname.replace(/[\\/]shared$/, '');
    const source = readFileSync(join(sourceRoot, 'features', 'workshops', 'workshop-topology.tsx'), 'utf8');
    expect(source).not.toMatch(/fontSize:\s*(?:[0-9]|10)\b/);
    expect(source.match(/Typography\.technical/g)).toHaveLength(2);
  });
});
