import type { WorkshopLessonBlock } from '@netbite/workshops/contracts';
import type { AssessmentDraft } from '@/features/workshops/assessment-types';

export type LessonStarter = 'concept' | 'guided-configuration';
export type AssessmentStarter = 'knowledge-check' | 'configuration-review';

export function lessonStarterDraft(starter: LessonStarter) {
  const block = (type: WorkshopLessonBlock['type'], patch: Partial<WorkshopLessonBlock>): WorkshopLessonBlock => ({ id: crypto.randomUUID(), type, ...patch });
  return starter === 'concept'
    ? { title: 'Concept lesson', summary: 'Introduce the idea, explain it, then summarize the key point.', blocks: [
      block('heading', { text: 'What learners will understand' }),
      block('paragraph', { text: 'Explain the concept in clear, concrete terms.' }),
      block('callout', { text: 'The key point learners should remember.' }),
    ] }
    : { title: 'Guided configuration', summary: 'Walk through a configuration and its verification.', blocks: [
      block('heading', { text: 'Goal and prerequisites' }),
      block('paragraph', { text: 'Describe the topology and the desired outcome.' }),
      block('commands', { introduction: 'Show the commands to configure and verify the setup.', commandGroups: [] }),
      block('callout', { text: 'Explain what successful verification looks like.' }),
    ] };
}

export function assessmentStarterDraft(starter: AssessmentStarter): { title: string; draft: AssessmentDraft } {
  const correct = crypto.randomUUID();
  const distractor = crypto.randomUUID();
  return starter === 'knowledge-check'
    ? { title: 'Knowledge check', draft: { instructions: 'Choose the best answer for each question.', questions: [{ id: crypto.randomUUID(), prompt: 'Replace this prompt with a concept check.', choices: [{ id: correct, label: 'Correct answer' }, { id: distractor, label: 'Distractor' }], correctChoiceId: correct, explanation: 'Explain why the answer is correct.' }] } }
    : { title: 'Configuration review', draft: { instructions: 'Inspect the configuration and choose the best next step.', questions: [{ id: crypto.randomUUID(), prompt: 'Which command or verification step best meets the goal?', choices: [{ id: correct, label: 'Correct command or step' }, { id: distractor, label: 'Plausible but incorrect step' }], correctChoiceId: correct, explanation: 'Explain the effect of the correct command.' }] } };
}
