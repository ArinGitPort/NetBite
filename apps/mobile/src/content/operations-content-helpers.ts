import { buildLessons } from '@/content/lesson-builder';
import { operationsCheckpointLessonIds } from '@/content/operations-learning-map';
import type { ChapterDefinition, LessonIllustration } from '@/content/types';

export type OperationsConcept = {
  id: string;
  title: string;
  idea: string;
  mechanism: string;
  example: string;
  result: string;
  misconception: string;
  illustration?: LessonIllustration;
  keyTerm?: string;
};

function sentences(value: string) {
  return value.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [value];
}

function workedSteps(concept: OperationsConcept) {
  const mechanism = sentences(concept.mechanism);
  return [
    { id: 'start', label: 'Read the starting facts', explanation: concept.example },
    ...mechanism.slice(0, 3).map((explanation, index) => ({ id: `decision-${index + 1}`, label: index === 0 ? `Apply ${concept.keyTerm ?? concept.title}` : 'Follow the next device action', explanation })),
    { id: 'result', label: 'State only what this proves', explanation: concept.result },
  ].slice(0, 5);
}

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
  const lessons = buildLessons(input.id, input.concepts.map((concept) => {
    const illustration = concept.illustration ?? `ops-visual-${concept.id}` as LessonIllustration;
    const steps = workedSteps(concept);
    return {
    id: concept.id,
    title: concept.title,
    illustration,
    body: concept.idea,
    sections: [
      { heading: `HOW ${concept.keyTerm ?? concept.title} WORKS`, body: concept.mechanism },
      { heading: 'WHAT NOT TO ASSUME', body: concept.misconception },
    ],
    example: {
      label: `WORKED EXAMPLE / ${concept.title}`,
      setup: concept.example,
      presentation: 'guided' as const,
      steps,
      visual: { illustration, stageIds: steps.map(({ id }) => id) },
      result: concept.result,
    },
    takeaway: concept.result,
    termNote: concept.keyTerm ? { term: concept.keyTerm, definition: concept.idea } : undefined,
    checkpoint: operationsCheckpointLessonIds.has(concept.id) ? {
      prompt: `${concept.example} Based on the process above, what result is supported?`,
      correctChoiceId: 'correct',
      presentation: 'pause-and-apply' as const,
      reviewIdentity: concept.id,
      hints: [`Start with the supplied facts: ${concept.example}`, concept.mechanism],
      choices: [
        { id: 'correct', label: concept.result, feedback: `Correct. ${concept.mechanism}` },
        { id: 'misconception', label: concept.misconception, feedback: `That conclusion conflicts with this rule: ${concept.mechanism}` },
      ],
    } : undefined,
  }; }));

  const quizCount = input.concepts.length >= 7 ? 8 : 7;
  const quiz = Array.from({ length: quizCount }, (_, index) => {
    const concept = input.concepts[index % input.concepts.length];
    return {
      id: `${input.id}-q${index + 1}`,
      lessonId: concept.id,
      prompt: index < input.concepts.length
        ? `${concept.example} What happens next?`
        : `${concept.example} Which evidence should you inspect before changing the configuration?`,
      answers: index < input.concepts.length
        ? [concept.result, concept.misconception, `The starting facts alone prove the process is complete: ${concept.example}`]
        : [concept.mechanism, concept.misconception, `Treat the starting condition as proof: ${concept.example}`],
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
        ? `In simple steps, how does ${concept.title.toLowerCase()} work?`
        : `What should you check first for ${concept.title.toLowerCase()}?`,
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
    contentVersion: 2,
    flashcardVersion: 2,
    checkpointVersion: 1,
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
