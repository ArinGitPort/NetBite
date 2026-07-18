import {
  ethernetCableTasks,
  validateEthernetCableChoices,
  type EthernetCableType,
} from '@/core/network/ethernet-cabling';

describe('Ethernet cable lab rules', () => {
  test('accepts the legacy/manual cable for every link', () => {
    const selections = Object.fromEntries(
      ethernetCableTasks.map((task) => [task.id, task.correctCable]),
    ) as Record<string, EthernetCableType>;

    expect(validateEthernetCableChoices(selections)).toMatchObject({
      success: true,
      correctCount: ethernetCableTasks.length,
    });
  });

  test('identifies the first link that needs attention', () => {
    expect(validateEthernetCableChoices({
      'pc-to-switch': 'crossover',
      'router-to-switch': 'straight-through',
    })).toMatchObject({
      success: false,
      correctCount: 1,
      firstIncorrectTask: { id: 'pc-to-switch' },
    });
  });
});
