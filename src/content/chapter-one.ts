import type { NetworkTopology } from '@/core/network/models';

export interface Lesson {
  id: string;
  chapterId: string;
  order: number;
  title: string;
  eyebrow: string;
  body: string;
  takeaway: string;
  illustration: 'network' | 'purpose' | 'devices' | 'connection';
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  answers: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  example: string;
}

export interface LabDefinition {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  objective: string;
  hints: string[];
  createStartingTopology: () => NetworkTopology;
}

export const chapterOneLessons: Lesson[] = [
  {
    id: 'what-is-a-network',
    chapterId: '1',
    order: 1,
    eyebrow: 'Lesson 1 of 4',
    title: 'What is a computer network?',
    body: 'A computer network is a group of devices connected so they can communicate and share things.',
    takeaway: 'A network begins when devices connect and communicate.',
    illustration: 'network',
  },
  {
    id: 'why-networks-exist',
    chapterId: '1',
    order: 2,
    eyebrow: 'Lesson 2 of 4',
    title: 'Why networks exist',
    body: 'Networks let people share information, printers, files, games, and internet access between devices.',
    takeaway: 'Connections make sharing and communication possible.',
    illustration: 'purpose',
  },
  {
    id: 'meet-the-devices',
    chapterId: '1',
    order: 3,
    eyebrow: 'Lesson 3 of 4',
    title: 'Meet the devices',
    body: 'A PC uses the network. A switch connects nearby devices. A router connects one network to another.',
    takeaway: 'PCs, switches, and routers each have a different job.',
    illustration: 'devices',
  },
  {
    id: 'connecting-devices',
    chapterId: '1',
    order: 4,
    eyebrow: 'Lesson 4 of 4',
    title: 'Connecting devices',
    body: 'Devices need a path between them. In a simple local network, cables connect PCs to a central switch.',
    takeaway: 'A cable creates a physical link between two devices.',
    illustration: 'connection',
  },
];

export const chapterOneQuiz: QuizQuestion[] = [
  {
    id: 'network-definition',
    prompt: 'What is a computer network?',
    answers: ['Connected devices that communicate', 'A single computer', 'Only the internet'],
    correctAnswerIndex: 0,
    explanation: 'A network is two or more connected devices that can communicate or share resources.',
  },
  {
    id: 'network-purpose',
    prompt: 'Why do people build networks?',
    answers: ['To make screens brighter', 'To share and communicate', 'To charge batteries'],
    correctAnswerIndex: 1,
    explanation: 'Networks make it possible to communicate and share files, printers, and internet access.',
  },
  {
    id: 'switch-role',
    prompt: 'Which device connects nearby computers together?',
    answers: ['PC', 'Switch', 'Keyboard'],
    correctAnswerIndex: 1,
    explanation: 'A switch provides a central connection point for devices in a local network.',
  },
  {
    id: 'router-role',
    prompt: 'What is the basic purpose of a router?',
    answers: ['Connect different networks', 'Display websites', 'Store documents'],
    correctAnswerIndex: 0,
    explanation: 'A router connects one network to another, such as a home network to the internet.',
  },
  {
    id: 'physical-link',
    prompt: 'What creates a physical link between two wired devices?',
    answers: ['A password', 'A folder', 'A cable'],
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
