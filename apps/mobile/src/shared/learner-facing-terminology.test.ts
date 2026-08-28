// @ts-expect-error Jest runs in Node, while the learner app intentionally excludes Node types.
import { readFileSync } from 'node:fs';
// @ts-expect-error Jest runs in Node, while the learner app intentionally excludes Node types.
import { resolve } from 'node:path';

const learnerSurfaces = [
  'src/app/_layout.tsx',
  'src/app/account.tsx',
  'src/app/diagnostics.tsx',
  'src/app/index.tsx',
  'src/app/pro.tsx',
  'src/app/research.tsx',
  'src/app/settings.tsx',
  'src/features/account/components/premium-locked-screen.tsx',
  'src/features/account/components/pro-checkout.native.tsx',
  'src/features/account/components/pro-checkout.web.tsx',
  'src/features/account/components/progress-merge-modal.tsx',
  'src/features/cli/components/cli-lab.tsx',
  'src/features/operations/components/operations-guided-lab.tsx',
  'src/features/operations/components/operations-lab-topology.tsx',
  'src/features/sandbox/components/sandbox-cli.tsx',
  'src/features/sandbox/components/sandbox-screen.tsx',
  'src/features/switching/components/switch-decision-lab.tsx',
  'src/features/transport/components/transport-guided-lab.tsx',
];

const prohibitedVisiblePhrases = [
  'bounded educational',
  'cloud progress',
  'current evidence',
  'deterministic state',
  'educational state simulator',
  'local schema',
  'modeled action',
  'modeled state',
  'next modeled',
  'recovery copy',
  'storage hydration',
  'validation model',
];

describe('learner-facing terminology', () => {
  test.each(learnerSurfaces)('%s avoids implementation language', (path) => {
    const source = readFileSync(resolve(process.cwd(), path), 'utf8').toLowerCase();
    for (const phrase of prohibitedVisiblePhrases) expect(source).not.toContain(phrase);
  });
});
