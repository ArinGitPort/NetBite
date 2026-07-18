import {
  createChapterOneTopology,
  validateTwoPCsToSameSwitch,
  type LabValidationResult,
  type NetworkTopology,
} from '@/core/network/models';
import type { Flashcard, Lesson, QuizQuestion } from '@/content/types';

export interface LabDefinition {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  objective: string;
  hints: string[];
  createStartingTopology: () => NetworkTopology;
  validate: (topology: NetworkTopology) => LabValidationResult;
}

export const chapterOneLessons: Lesson[] = [
  {
    id: 'what-is-a-network',
    chapterId: '1',
    order: 1,
    eyebrow: 'Lesson 1 of 4',
    title: 'What is a computer network?',
    body: 'A computer network is two or more devices connected so they can exchange data. The connection matters because nearby devices are not automatically able to communicate.',
    takeaway: 'A network connects devices and gives them a path for exchanging data.',
    illustration: 'network',
  },
  {
    id: 'why-networks-exist',
    chapterId: '1',
    order: 2,
    eyebrow: 'Lesson 2 of 4',
    title: 'Why networks exist',
    body: 'Networks let devices share useful resources and services. In a classroom, several PCs might use the same printer, exchange files, and reach the internet through one local network.',
    takeaway: 'Networks make communication and shared resources available to multiple devices.',
    illustration: 'purpose',
  },
  {
    id: 'meet-the-devices',
    chapterId: '1',
    order: 3,
    eyebrow: 'Lesson 3 of 4',
    title: 'Meet the devices',
    body: 'A PC sends and receives data for its user. A switch connects nearby devices inside one local network. A router connects that local network to other networks, such as the internet.',
    takeaway: 'End devices use the network, switches connect a LAN, and routers connect different networks.',
    illustration: 'devices',
  },
  {
    id: 'connecting-devices',
    chapterId: '1',
    order: 4,
    eyebrow: 'Lesson 4 of 4',
    title: 'Connecting devices',
    body: 'Devices need a physical path between them. In a simple local area network, or LAN, cables connect PCs to a central switch within a limited place such as a home, classroom, or office.',
    takeaway: 'A LAN connects nearby devices, and each cable creates one physical link in that network.',
    illustration: 'connection',
  },
];

export const chapterOneQuiz: QuizQuestion[] = [
  {
    id: 'network-definition',
    lessonId: 'what-is-a-network',
    prompt: 'What is a computer network?',
    answers: ['Devices connected so they can exchange data', 'Devices placed in the same room', 'One device running several apps'],
    correctAnswerIndex: 0,
    explanation: 'A network is two or more connected devices that can communicate or share resources.',
  },
  {
    id: 'network-purpose',
    lessonId: 'why-networks-exist',
    prompt: 'Why do people build networks?',
    answers: ['To share resources and communicate', 'To make each PC work without connections', 'To replace storage inside every device'],
    correctAnswerIndex: 1,
    explanation: 'Networks make it possible to communicate and share files, printers, and internet access.',
  },
  {
    id: 'switch-role',
    lessonId: 'meet-the-devices',
    prompt: 'Which device connects nearby computers together?',
    answers: ['PC', 'Switch', 'Router'],
    correctAnswerIndex: 1,
    explanation: 'A switch provides a central connection point for devices in a local network.',
  },
  {
    id: 'router-role',
    lessonId: 'meet-the-devices',
    prompt: 'What is the basic purpose of a router?',
    answers: ['Connect different networks', 'Connect devices only within one LAN', 'Act as the user’s end device'],
    correctAnswerIndex: 0,
    explanation: 'A router connects one network to another, such as a home network to the internet.',
  },
  {
    id: 'physical-link',
    lessonId: 'connecting-devices',
    prompt: 'What creates a physical link between two wired devices?',
    answers: ['Using the same application', 'Placing the devices nearby', 'Connecting a compatible cable'],
    correctAnswerIndex: 2,
    explanation: 'A cable creates the physical connection that gives devices a path to communicate.',
  },
];

export const chapterOneFlashcards: Flashcard[] = [
  { id: 'network', term: 'Computer Network', definition: 'A group of connected devices that can communicate.', example: 'Two PCs connected through a switch.' },
  { id: 'pc', term: 'PC', definition: 'A personal computer that uses network services.', example: 'A laptop opening a shared file.' },
  { id: 'switch', term: 'Switch', definition: 'A device that connects devices within a local network.', example: 'The central connection point for office PCs.' },
  { id: 'router', term: 'Router', definition: 'A device that connects different networks.', example: 'Connecting a home network to the internet.' },
  { id: 'lan', term: 'LAN', definition: 'A local area network covering a small area.', example: 'A network inside a home, classroom, or office.' },
];

export const chapterOneLab: LabDefinition = {
  id: 'first-network',
  chapterId: '1',
  title: 'Build your first network',
  description: 'Arrange a small local network and connect its devices.',
  objective: 'Connect both PCs to the same switch.',
  hints: [
    'Use Connect, then choose one PC and the switch.',
    'Repeat the connection steps for the other PC and the same switch.',
    'A successful layout has two separate cables, with one cable from each PC to the switch.',
  ],
  createStartingTopology: createChapterOneTopology,
  validate: validateTwoPCsToSameSwitch,
};
