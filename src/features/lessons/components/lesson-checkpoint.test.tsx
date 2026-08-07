import { fireEvent, render } from '@testing-library/react-native';

import type { Lesson } from '@/content/types';
import { LessonCheckpoint } from '@/features/lessons/components/lesson-checkpoint';
import { isLessonCheckpointBlocking } from '@/features/lessons/checkpoint-rules';

const checkpoint = {
  prompt: 'PC-A sends an Ethernet frame to PC-B. Which field identifies PC-B as the intended local receiver?',
  correctChoiceId: 'data-link',
  choices: [
    { id: 'physical', label: 'SOURCE MAC', feedback: 'The source MAC identifies the sender, not the intended receiver.' },
    { id: 'data-link', label: 'DESTINATION MAC', feedback: 'Correct. The destination MAC identifies the intended local receiver.' },
  ],
  hints: ['Look for the field that names the receiver.', 'The destination field answers where the frame should go.'],
};

const renderCheckpoint = async (onCorrect = jest.fn(), onIncorrect = jest.fn()) => ({
  onCorrect,
  onIncorrect,
  screen: await render(<LessonCheckpoint checkpoint={checkpoint} reviewLabel="DESTINATION MAC" reviewText="A switch checks the destination MAC to decide where to send a frame." onCorrect={onCorrect} onIncorrect={onIncorrect} />),
});

describe('LessonCheckpoint', () => {
  test('requires a learner to form an answer before choices appear', async () => {
    const { screen } = await renderCheckpoint();
    expect(screen.queryByText('DESTINATION MAC')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /I have an answer/i }));
    expect(screen.getByText('DESTINATION MAC')).toBeTruthy();
  });

  test('records only the first miss, reveals the exact rule, and permits a retry', async () => {
    const { screen, onCorrect, onIncorrect } = await renderCheckpoint();
    await fireEvent.press(screen.getByRole('button', { name: /I have an answer/i }));
    await fireEvent.press(screen.getByRole('radio', { name: 'SOURCE MAC' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'SOURCE MAC' }));
    expect(onIncorrect).toHaveBeenCalledTimes(1);
    expect(screen.getByText('NOT YET / TRY AGAIN')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'REVIEW THE RULE' }));
    expect(screen.getByText(/switch checks the destination MAC/i)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'DESTINATION MAC' }));
    expect(onCorrect).toHaveBeenCalledWith({ hadIncorrectAttempt: true });
  });

  test('reveals progressive hints only after an incorrect attempt', async () => {
    const { screen } = await renderCheckpoint();
    await fireEvent.press(screen.getByRole('button', { name: /I have an answer/i }));
    expect(screen.queryByText('SHOW A HINT')).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'SOURCE MAC' }));
    await fireEvent.press(screen.getByText('SHOW A HINT'));
    expect(screen.getByText(checkpoint.hints[0])).toBeTruthy();
    expect(screen.queryByText(checkpoint.hints[1])).toBeNull();
    await fireEvent.press(screen.getByText('SHOW NEXT HINT'));
    expect(screen.getByText(checkpoint.hints[1])).toBeTruthy();
  });

  test('reports a correct first attempt separately so an older due signal can resolve', async () => {
    const { screen, onCorrect, onIncorrect } = await renderCheckpoint();
    await fireEvent.press(screen.getByRole('button', { name: /I have an answer/i }));
    await fireEvent.press(screen.getByRole('radio', { name: 'DESTINATION MAC' }));
    expect(onIncorrect).not.toHaveBeenCalled();
    expect(onCorrect).toHaveBeenCalledWith({ hadIncorrectAttempt: false });
  });

  test('blocks only a new unchecked lesson', () => {
    const lesson = { id: 'layer', checkpoint } as Lesson;
    expect(isLessonCheckpointBlocking(lesson, [], false)).toBe(true);
    expect(isLessonCheckpointBlocking(lesson, [], true)).toBe(false);
    expect(isLessonCheckpointBlocking(lesson, ['layer'], false)).toBe(false);
  });
});
