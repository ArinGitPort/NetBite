import { buildLessons } from '@/content/lesson-builder';
import type { ChapterDefinition, LessonIllustration } from '@/content/types';

export type OperationsConcept = {
  id: string;
  title: string;
  idea: string;
  mechanism: string;
  example: string;
  result: string;
  misconception: string;
};

export function createOperationsChapter(input: {
  id: string;
  order: number;
  title: string;
  summary: string;
  illustration: LessonIllustration;
  concepts: OperationsConcept[];
  lab: [id: string, title: string, detail: string];
  recap: [built: string, learned: string, next: string];
}): ChapterDefinition {
  const lessons = buildLessons(input.id, input.concepts.map((concept) => ({
    id: concept.id,
    title: concept.title,
    illustration: input.illustration,
    body: `${concept.idea} This lesson follows the information a device actually has, the decision it makes, and the state that changes. The model is deliberately bounded so the visible result is evidence rather than a decorative animation.`,
    sections: [
      { heading: 'HOW THE DECISION HAPPENS', body: concept.mechanism },
      { heading: 'WHAT TO CHECK', body: `Inspect the relevant configuration and state before changing unrelated settings. ${concept.misconception}` },
    ],
    example: {
      label: 'WORKED NETWORK STATE',
      setup: concept.example,
      result: concept.result,
    },
    takeaway: concept.result,
    checkpoint: {
      prompt: `Which conclusion correctly applies to ${concept.title.toLowerCase()}?`,
      correctChoiceId: 'correct',
      hints: [`Start with the trigger and inspect only the state described in the example.`, concept.mechanism],
      choices: [
        { id: 'correct', label: concept.result, feedback: `Correct. ${concept.mechanism}` },
        { id: 'misconception', label: concept.misconception, feedback: `That conclusion does not follow from the modeled state. ${concept.idea}` },
        { id: 'unrelated', label: 'CHANGE AN UNRELATED LAYER FIRST', feedback: `Changing another layer hides the first known decision. ${concept.mechanism}` },
      ],
    },
  })));

  const quizCount = input.concepts.length >= 7 ? 8 : 7;
  const quiz = Array.from({ length: quizCount }, (_, index) => {
    const concept = input.concepts[index % input.concepts.length];
    return {
      id: `${input.id}-q${index + 1}`,
      lessonId: concept.id,
      prompt: index < input.concepts.length
        ? `A learner observes this state: ${concept.example} What conclusion is supported?`
        : `Which check best protects against the main misconception in ${concept.title.toLowerCase()}?`,
      answers: index < input.concepts.length
        ? [concept.result, concept.misconception, 'The result proves every network layer is healthy']
        : [concept.mechanism, concept.misconception, 'Replace every address and cable'],
      correctAnswerIndex: 0,
      explanation: `${concept.result} ${concept.mechanism}`,
    };
  });

  const cardCount = Math.max(8, input.concepts.length);
  const flashcards = Array.from({ length: cardCount }, (_, index) => {
    const concept = input.concepts[index % input.concepts.length];
    return {
      id: `${input.id}-card-${index + 1}`,
      lessonId: concept.id,
      prompt: index < input.concepts.length
        ? `How does ${concept.title.toLowerCase()} work in the modeled network?`
        : `What should be checked first when reasoning about ${concept.title.toLowerCase()}?`,
      answer: index < input.concepts.length ? concept.mechanism : concept.result,
      explanation: `${concept.idea} ${concept.misconception}`,
    };
  });

  return {
    id: input.id,
    courseId: 'network-operations',
    courseOrder: input.order,
    accessTier: 'pro',
    prerequisiteChapterIds: input.order === 1 ? [] : [`ops-${String(input.order - 1).padStart(2, '0')}`],
    simulationReleaseState: 'released',
    contentVersion: 1,
    flashcardVersion: 1,
    numberLabel: String(input.order).padStart(2, '0'),
    title: input.title,
    summary: input.summary,
    lessons,
    quiz,
    flashcards,
    lab: { id: input.lab[0], title: input.lab[1], detail: input.lab[2] },
    recap: { built: input.recap[0], learned: input.recap[1], next: input.recap[2] },
  };
}
