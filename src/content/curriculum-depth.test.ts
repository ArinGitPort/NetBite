import { chapters } from '@/content/chapters';
import { getQuizMasteryScore } from '@/content/progress';
import { calculateSubnetRange } from '@/core/network/advanced-networking';
import { educationalIllustrations } from '@/features/lessons/educational-illustration-registry';
import { practiceConfigs } from '@/features/practice/practice-configs';

describe('expanded curriculum depth', () => {
  const lessonCounts = [5, 6, 6, 7, 9, 6, 6, 6, 8, 7, 11];
  const quizCounts = [6, 7, 7, 8, 8, 7, 7, 7, 8, 8, 8];

  test('contains the planned 77 focused lessons', () => {
    expect(chapters.map(({ lessons }) => lessons.length)).toEqual(lessonCounts);
    expect(chapters.flatMap(({ lessons }) => lessons)).toHaveLength(77);
  });

  test('uses dynamic numbering and stable unique IDs', () => {
    const ids = chapters.flatMap(({ lessons }) => lessons.map(({ id }) => id));
    expect(new Set(ids).size).toBe(ids.length);
    chapters.forEach((chapter) => chapter.lessons.forEach((lesson, index) => {
      expect(lesson.order).toBe(index + 1);
      expect(lesson.eyebrow).toBe(`Lesson ${index + 1} of ${chapter.lessons.length}`);
    }));
  });

  test('gives every lesson structured explanation and a concrete example', () => {
    chapters.flatMap(({ lessons }) => lessons).forEach((lesson) => {
      expect(lesson.sections?.length).toBeGreaterThanOrEqual(1);
      expect(lesson.example?.setup.length).toBeGreaterThan(10);
      expect(lesson.example?.result.length).toBeGreaterThan(10);
      const copy = [lesson.body, ...(lesson.sections?.map(({ body }) => body) ?? []), lesson.example?.setup, ...(lesson.example?.steps?.flatMap(({ label, explanation, value }) => [label, explanation, value]) ?? []), lesson.example?.result].join(' ');
      expect(copy.trim().split(/\s+/).length).toBeGreaterThanOrEqual(70);
      expect(copy.trim().split(/\s+/).length).toBeLessThanOrEqual(260);
    });
  });

  test('keeps worked examples short, ordered, and stable', () => {
    const workedExamples = chapters.flatMap(({ lessons }) => lessons.flatMap(({ example }) => example?.steps ? [example] : []));
    expect(workedExamples.length).toBeGreaterThanOrEqual(15);
    workedExamples.forEach(({ steps }) => {
      expect(steps!.length).toBeGreaterThanOrEqual(3);
      expect(steps!.length).toBeLessThanOrEqual(5);
      expect(new Set(steps!.map(({ id }) => id)).size).toBe(steps!.length);
    });
  });

  test('uses complete addresses in subnet teaching and practice', () => {
    const chapterFive = chapters.find(({ id }) => id === '5')!;
    const subnetText = JSON.stringify({ chapterFive, practice: practiceConfigs['subnet-range-desk'], illustrations: [educationalIllustrations['subnet-boundaries'], educationalIllustrations['subnet-range'], educationalIllustrations['subnet-map']] });
    expect(subnetText).not.toMatch(/(^|[\s/,(])\.\d+/);
  });

  test('matches the subnet engine for every guided range', () => {
    expect(calculateSubnetRange('192.168.10.42', 24)).toMatchObject({ network: '192.168.10.0', broadcast: '192.168.10.255' });
    expect(calculateSubnetRange('192.168.10.130', 25)).toMatchObject({ network: '192.168.10.128', broadcast: '192.168.10.255' });
    expect(calculateSubnetRange('192.168.10.70', 26)).toMatchObject({ network: '192.168.10.64', broadcast: '192.168.10.127' });
    expect(calculateSubnetRange('192.168.10.190', 27)).toMatchObject({ network: '192.168.10.160', broadcast: '192.168.10.191' });
  });

  test('uses planned quiz sizes and 80 percent mastery', () => {
    expect(chapters.map(({ quiz }) => quiz.length)).toEqual(quizCounts);
    expect(chapters.map(getQuizMasteryScore)).toEqual([5, 6, 6, 7, 7, 6, 6, 6, 7, 7, 7]);
  });

  test('keeps every checkpoint deterministic and retryable', () => {
    const checkpoints = chapters.flatMap(({ lessons }) => lessons.flatMap(({ checkpoint }) => checkpoint ? [checkpoint] : []));
    expect(checkpoints.length).toBeGreaterThanOrEqual(20);
    checkpoints.forEach((checkpoint) => {
      expect(new Set(checkpoint.choices.map(({ id }) => id)).size).toBe(checkpoint.choices.length);
      expect(checkpoint.choices.some(({ id }) => id === checkpoint.correctChoiceId)).toBe(true);
      checkpoint.choices.forEach(({ feedback }) => expect(feedback.length).toBeGreaterThan(20));
    });
  });
});
