import { chapters } from '@/content/chapters';

describe('active-recall flashcard quality', () => {
  test('maps every card to a lesson and covers every lesson', () => {
    for (const chapter of chapters) {
      const lessonIds = new Set(chapter.lessons.map(({ id }) => id));
      const coveredLessonIds = new Set(chapter.flashcards.map(({ lessonId }) => lessonId));

      for (const card of chapter.flashcards) {
        expect(lessonIds.has(card.lessonId)).toBe(true);
      }
      for (const lessonId of lessonIds) {
        expect(coveredLessonIds.has(lessonId)).toBe(true);
      }
    }
  });

  test('uses concise recall prompts with answers and corrective explanations', () => {
    const prompts = new Set<string>();
    const ids = new Set<string>();

    for (const chapter of chapters) {
      expect(chapter.flashcards.length).toBeGreaterThanOrEqual(8);
      expect(chapter.flashcards.length).toBeLessThanOrEqual(12);
      expect(chapter.flashcardVersion).toBeGreaterThan(0);

      for (const card of chapter.flashcards) {
        expect(card.prompt.endsWith('?')).toBe(true);
        expect(card.prompt.length).toBeGreaterThanOrEqual(15);
        expect(card.prompt.length).toBeLessThanOrEqual(180);
        expect(card.answer.trim().length).toBeGreaterThanOrEqual(2);
        expect(card.answer.length).toBeLessThanOrEqual(260);
        expect(card.explanation.trim().length).toBeGreaterThanOrEqual(15);
        expect(card.explanation.length).toBeLessThanOrEqual(260);
        expect(card.prompt).not.toMatch(/\b(which of these|choose one|true or false)\b/i);
        expect(prompts.has(card.prompt)).toBe(false);
        expect(ids.has(card.id)).toBe(false);
        prompts.add(card.prompt);
        ids.add(card.id);
      }
    }
  });
});
