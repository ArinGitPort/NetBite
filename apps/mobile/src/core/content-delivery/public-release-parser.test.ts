import { parsePublicContentRelease } from '@/core/content-delivery/public-release-parser';

const release = () => ({
  manifest: {
    releaseId: 'release-1',
    releaseVersion: 1,
    schemaVersion: 1,
    minimumAppVersion: '1.0.0',
    checksum: 'a'.repeat(64),
    publishedAt: '2026-08-26T00:00:00.000Z',
    changelog: 'Updated subnetting guidance.',
  },
  package: { courses: [], chapters: [], assets: [], sources: [], supportedIllustrations: [] },
});

describe('public curriculum release parser', () => {
  test('accepts the safe public release contract', () => {
    expect(parsePublicContentRelease(release())?.manifest.releaseVersion).toBe(1);
  });

  test.each([
    ['missing release ID', { releaseId: undefined }],
    ['invalid version', { releaseVersion: '1' }],
    ['invalid app version', { minimumAppVersion: 'latest' }],
    ['invalid checksum', { checksum: 'secret' }],
    ['invalid publication date', { publishedAt: 'not-a-date' }],
  ])('rejects %s', (_label, change) => {
    const value = release();
    Object.assign(value.manifest, change);
    expect(parsePublicContentRelease(value)).toBeUndefined();
  });
});
