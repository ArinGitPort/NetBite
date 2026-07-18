import {
  createChapterOneTopology,
  validateTwoPCsToSameSwitch,
  type LabValidationResult,
  type NetworkTopology,
} from '@/core/network/models';
import { buildLessons } from '@/content/lesson-builder';
import type { Flashcard, QuizQuestion } from '@/content/types';

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

export const chapterOneLessons = buildLessons('1', [
  {
    id: 'what-is-a-network', title: 'What is a computer network?', illustration: 'network',
    body: 'A computer network is two or more devices connected so they can exchange data. A network needs both devices and a usable path between them; simply placing two computers in the same room does not connect them.',
    sections: [
      { heading: 'Connection creates a path', body: 'The path may use copper cable, fiber, or wireless signals. NetBite begins with wired links because their endpoints are easy to see and arrange.' },
      { heading: 'Communication uses the path', body: 'Once networking rules and settings are in place, applications can use that path to exchange messages, files, requests, and responses.' },
    ],
    example: { label: 'CLASSROOM EXAMPLE', setup: 'Two classroom PCs sit beside each other but have no cable or wireless connection.', result: 'They are nearby devices, not a working network. Connecting both through network equipment creates a path they can use.' },
    takeaway: 'A network consists of connected devices with a path for exchanging data.',
  },
  {
    id: 'why-networks-exist', title: 'Why networks exist', illustration: 'purpose',
    body: 'Networks let many devices use shared information and services instead of keeping everything isolated on one machine. The value comes from what the connection makes possible, not from the cable by itself.',
    sections: [
      { heading: 'Share and communicate', body: 'People use networks to exchange messages and files, collaborate on the same service, and reach information stored on another device.' },
      { heading: 'Share resources', body: 'A classroom can share printers, storage, and one route to the internet rather than attaching a separate copy of every resource to every PC.' },
    ],
    example: { label: 'ONE RESOURCE / MANY USERS', setup: 'Five PCs need to print assignments.', result: 'A network lets all five reach one shared printer while each PC remains an independent end device.' },
    takeaway: 'Networks make communication and shared resources available to multiple devices.',
  },
  {
    id: 'end-and-intermediary-devices', title: 'End and intermediary devices', illustration: 'device-types',
    body: 'Devices play different roles in a network. End devices are where data starts or finishes for a user or service. Intermediary devices connect paths and help move that data toward the correct destination.',
    sections: [
      { heading: 'End devices', body: 'PCs, phones, printers, and servers create, request, receive, or store information. They are the endpoints of communication.' },
      { heading: 'Intermediary devices', body: 'Switches and routers sit between endpoints. They connect network segments and make forwarding decisions, which later chapters explain in detail.' },
    ],
    example: { label: 'FOLLOW THE ROLES', setup: 'A PC requests a page from a server through a switch and router.', steps: [
      { id: 'source', label: 'START AT THE REQUESTER', explanation: 'The PC creates and receives user data, so it is an end device.' },
      { id: 'path', label: 'FOLLOW THE PATH', explanation: 'The switch and router move traffic between attachments and networks, so they are intermediary devices.' },
      { id: 'destination', label: 'END AT THE SERVICE', explanation: 'The server provides the requested page, making it another end device.' },
    ], result: 'PC and server are endpoints; switch and router provide the path between them.' },
    takeaway: 'End devices use network services; intermediary devices connect and guide their paths.',
    checkpoint: {
      prompt: 'Which pair contains only end devices?', correctChoiceId: 'ends', choices: [
        { id: 'ends', label: 'PC AND PRINTER', feedback: 'Correct. Both devices create or receive information at the edge of the network.' },
        { id: 'mixed', label: 'PC AND SWITCH', feedback: 'A PC is an end device, but a switch is an intermediary device that connects endpoints.' },
        { id: 'intermediary', label: 'SWITCH AND ROUTER', feedback: 'Both are intermediary devices, not endpoints for the user’s data.' },
      ],
    },
  },
  {
    id: 'meet-the-devices', title: 'PC, switch, and router roles', illustration: 'devices',
    body: 'NetBite begins with three device types. A PC represents an endpoint, a switch connects nearby devices inside one local network, and a router connects different IP networks. These roles work together but are not interchangeable.',
    sections: [
      { heading: 'Inside and outside the LAN', body: 'A switch normally provides local connections for PCs. A router provides a path from that LAN to another network, such as a second LAN or the internet.' },
      { heading: 'A role, not a shape', body: 'Real devices vary in size and may combine several functions. The game uses separate device icons so each networking responsibility stays clear.' },
    ],
    example: { label: 'HOME NETWORK', setup: 'A desktop and game console connect to a home switch. The switch connects to a router.', result: 'The switch joins the local devices. The router provides the path to networks beyond the home LAN.' },
    takeaway: 'PCs are endpoints, switches connect a LAN, and routers connect different networks.',
  },
  {
    id: 'connecting-devices', title: 'Physical links and local networks', illustration: 'connection',
    body: 'A wired physical link connects two compatible network interfaces with a cable. Several local links can form a local area network, or LAN, covering a limited place such as a home, classroom, or office.',
    sections: [
      { heading: 'One cable / one link', body: 'A PC-to-switch cable creates one link. A second PC needs its own link to the switch; one connected PC does not automatically connect every nearby device.' },
      { heading: 'A LAN has a boundary', body: 'LAN describes a local network, not the entire internet. Routers are used when communication must cross from one network to another.' },
    ],
    example: { label: 'FIRST TOPOLOGY', setup: 'PC A and PC B each have one cable to the same switch.', result: 'The two separate links place both PCs in one simple physical LAN topology.' },
    takeaway: 'A LAN joins nearby devices, and each cable creates one physical link between two interfaces.',
    checkpoint: {
      prompt: 'What is still missing if PC A is cabled to the switch but PC B is not?', correctChoiceId: 'link', choices: [
        { id: 'link', label: 'A LINK FOR PC B', feedback: 'Correct. PC B needs its own connection to a compatible switch port.' },
        { id: 'router', label: 'A SECOND ROUTER', feedback: 'A router is not required to connect two PCs inside this simple LAN.' },
        { id: 'name', label: 'A NEW PC NAME', feedback: 'Changing a name does not create a physical network path.' },
      ],
    },
  },
]);

export const chapterOneQuiz: QuizQuestion[] = [
  { id: 'network-definition', lessonId: 'what-is-a-network', prompt: 'Which situation describes a computer network?', answers: ['Connected devices with a path to exchange data', 'Two disconnected PCs in one room', 'One PC running two applications'], correctAnswerIndex: 0, explanation: 'A network requires connected devices and a communication path.' },
  { id: 'network-purpose', lessonId: 'why-networks-exist', prompt: 'Why might a classroom build a network?', answers: ['To share files, printers, and services', 'To prevent every device from communicating', 'To make physical distance disappear'], correctAnswerIndex: 0, explanation: 'Networks let multiple devices communicate and use shared resources.' },
  { id: 'endpoint-role', lessonId: 'end-and-intermediary-devices', prompt: 'Which device is an endpoint in a student’s file request?', answers: ['The student PC', 'The switch carrying the request', 'The router between networks'], correctAnswerIndex: 0, explanation: 'The PC creates the request, so it is an end device.' },
  { id: 'switch-role', lessonId: 'meet-the-devices', prompt: 'Which device normally connects nearby PCs inside one LAN?', answers: ['Switch', 'PC', 'Printer'], correctAnswerIndex: 0, explanation: 'A switch provides local network connections for endpoints.' },
  { id: 'router-role', lessonId: 'meet-the-devices', prompt: 'What is the basic purpose of a router?', answers: ['Connect different networks', 'Act as every user’s end device', 'Replace every local cable'], correctAnswerIndex: 0, explanation: 'A router provides forwarding between different IP networks.' },
  { id: 'physical-link', lessonId: 'connecting-devices', prompt: 'PC B has no cable to the switch. What does it lack?', answers: ['A physical network link', 'A second computer name', 'A shared printer'], correctAnswerIndex: 0, explanation: 'A compatible cable between interfaces creates the wired physical link.' },
];

export const chapterOneFlashcards: Flashcard[] = [
  { id: 'network', term: 'Computer Network', definition: 'Connected devices with a path for exchanging data.', example: 'Two PCs connected through a switch.' },
  { id: 'end-device', term: 'End Device', definition: 'A device where network communication starts or finishes.', example: 'A PC requesting a file.' },
  { id: 'intermediary', term: 'Intermediary Device', definition: 'A device that connects paths or forwards data between endpoints.', example: 'A switch between two PCs.' },
  { id: 'pc', term: 'PC', definition: 'An end device that uses network services.', example: 'A laptop opening a shared file.' },
  { id: 'switch', term: 'Switch', definition: 'A device that connects endpoints within a local network.', example: 'The central connection point for classroom PCs.' },
  { id: 'router', term: 'Router', definition: 'A device that connects different IP networks.', example: 'Connecting a home LAN toward the internet.' },
  { id: 'lan', term: 'LAN', definition: 'A local area network covering a limited place.', example: 'A network inside a home, classroom, or office.' },
];

export const chapterOneLab: LabDefinition = {
  id: 'first-network', chapterId: '1', title: 'Build your first network', description: 'Arrange a small local network and connect its devices.', objective: 'Connect both PCs to the same switch.',
  hints: ['Use Connect, then choose one PC and the switch.', 'Repeat the connection steps for the other PC and the same switch.', 'A successful layout has one cable from each PC to the switch.'],
  createStartingTopology: createChapterOneTopology, validate: validateTwoPCsToSameSwitch,
};
