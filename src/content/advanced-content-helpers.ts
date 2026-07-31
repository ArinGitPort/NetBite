import { buildLessons, type LessonSeed } from '@/content/lesson-builder';
import type { ChapterDefinition, Flashcard, QuizQuestion } from '@/content/types';

export type QuestionSeed = Omit<QuizQuestion, 'id'>;

export function createAdvancedChapter(input: {
  id: number;
  contentVersion?: number;
  title: string;
  summary: string;
  lessons: LessonSeed[];
  questions: QuestionSeed[];
  cards: [lessonId: string, prompt: string, answer: string, explanation: string][];
  flashcardVersion?: number;
  lab: [id: string, title: string, detail: string];
  recap: [built: string, learned: string, next: string];
}): ChapterDefinition {
  const chapterId = String(input.id);
  const lessons = buildLessons(chapterId, input.lessons);
  const quiz: QuizQuestion[] = input.questions.map((question, index) => ({
    ...question,
    id: `ch${input.id}-q${index + 1}`,
  }));
  const flashcards: Flashcard[] = input.cards.map(([lessonId, prompt, answer, explanation], index) => ({
    id: `ch${input.id}-card-${index + 1}`,
    lessonId,
    prompt,
    answer,
    explanation,
  }));

  return {
    id: chapterId,
    contentVersion: input.contentVersion ?? 2,
    flashcardVersion: input.flashcardVersion ?? 2,
    numberLabel: chapterId.padStart(2, '0'),
    title: input.title,
    summary: input.summary,
    lessons,
    quiz,
    flashcards,
    lab: { id: input.lab[0], title: input.lab[1], detail: input.lab[2] },
    recap: { built: input.recap[0], learned: input.recap[1], next: input.recap[2] },
  };
}
