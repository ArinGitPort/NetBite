import { chapters } from '@/content/chapters';
import { courses } from '@/content/courses';
import { canonicalize } from '@/core/content-delivery/canonical-json';
import type { RemoteCurriculumPackage } from '@/core/content-delivery/types';
import { isRemoteCurriculumPackage, validateRemoteCurriculumPayload } from '@/core/content-delivery/validation';

const packageFixture = (): RemoteCurriculumPackage => ({
  manifest: { releaseId: 'release-1', releaseVersion: 1, schemaVersion: 1, minimumAppVersion: '1.0.0', checksum: 'a'.repeat(64), publishedAt: '2026-08-24T00:00:00.000Z', changelog: 'Initial remote release' },
  courses: JSON.parse(JSON.stringify(courses)), chapters: JSON.parse(JSON.stringify(chapters)), assets: [], sources: [],
  supportedIllustrations: [...new Set(chapters.flatMap((chapter) => chapter.lessons.map(({ illustration }) => illustration)))],
});

describe('remote curriculum validation', () => {
  test('accepts the complete bundled curriculum contract', () => {
    const value = packageFixture();
    expect(validateRemoteCurriculumPayload(value).issues).toEqual([]);
    expect(isRemoteCurriculumPackage(value)).toBe(true);
  });

  test('rejects a new unsupported chapter and duplicate lesson ID', () => {
    const value = packageFixture();
    value.chapters.push({ ...value.chapters[0], id: 'remote-chapter' });
    value.chapters[1].lessons[0].id = value.chapters[0].lessons[0].id;
    const messages = validateRemoteCurriculumPayload(value).issues.map(({ message }) => message);
    expect(messages).toContain('Remote releases cannot create chapters.');
    expect(messages).toContain('Lesson IDs must be globally unique.');
  });

  test('requires accessible metadata for supporting images', () => {
    const value = packageFixture();
    value.assets.push({ id: 'asset-1', url: 'https://example.com/image.png', mimeType: 'image/png', width: 640, height: 480, altText: '' });
    expect(validateRemoteCurriculumPayload(value).issues.some(({ path }) => path === 'assets[0]')).toBe(true);
  });

  test('canonical JSON is stable across object key order', () => {
    expect(canonicalize({ b: 2, a: { d: 4, c: 3 } })).toBe(canonicalize({ a: { c: 3, d: 4 }, b: 2 }));
  });
});
