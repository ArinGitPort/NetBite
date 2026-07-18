import { fireEvent, render } from '@testing-library/react-native';

import type { Lesson } from '@/content/types';
import { LessonCheckpoint } from '@/features/lessons/components/lesson-checkpoint';
import { isLessonCheckpointBlocking } from '@/features/lessons/checkpoint-rules';

const checkpoint = {
  prompt: 'Which layer carries Ethernet frames?',
  correctChoiceId: 'data-link',
  choices: [
    { id: 'physical', label: 'PHYSICAL', feedback: 'Physical carries signals, not frame decisions.' },
    { id: 'data-link', label: 'DATA LINK', feedback: 'Correct. Ethernet frames belong at Data Link.' },
  ],
  hints: ['Think about the unit a switch reads.', 'Frames and MAC addresses belong together.'],
};

describe('LessonCheckpoint', () => {
  test('explains an incorrect choice and permits a retry', async () => {
    const onCorrect = jest.fn();
    const screen = await render(<LessonCheckpoint checkpoint={checkpoint} onCorrect={onCorrect} />);
    await fireEvent.press(screen.getByRole('button', { name: 'PHYSICAL' }));
    expect(screen.getByText('TRY AGAIN')).toBeTruthy();
    expect(screen.getByText(/carries signals/i)).toBeTruthy();
    expect(onCorrect).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'DATA LINK' }));
    expect(screen.getByText('CORRECT')).toBeTruthy();
    expect(onCorrect).toHaveBeenCalledTimes(1);
  });

  test('reveals hints one at a time without answering', async () => {
    const onCorrect = jest.fn();
    const screen = await render(<LessonCheckpoint checkpoint={checkpoint} onCorrect={onCorrect} />);
    await fireEvent.press(screen.getByText('SHOW A HINT'));
    expect(screen.getByText(checkpoint.hints[0])).toBeTruthy();
    expect(screen.queryByText(checkpoint.hints[1])).toBeNull();
    await fireEvent.press(screen.getByText('SHOW NEXT HINT'));
    expect(screen.getByText(checkpoint.hints[1])).toBeTruthy();
    expect(onCorrect).not.toHaveBeenCalled();
  });

  test('blocks only a new unchecked lesson', () => {
    const lesson = { id: 'layer', checkpoint } as Lesson;
    expect(isLessonCheckpointBlocking(lesson, [], false)).toBe(true);
    expect(isLessonCheckpointBlocking(lesson, [], true)).toBe(false);
    expect(isLessonCheckpointBlocking(lesson, ['layer'], false)).toBe(false);
  });
});
