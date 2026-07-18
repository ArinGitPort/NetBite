export type LessonIllustration =
  | 'network'
  | 'purpose'
  | 'devices'
  | 'connection'
  | 'frame'
  | 'nic'
  | 'cables'
  | 'ports'
  | 'mac-address'
  | 'mac-learning'
  | 'switch-forwarding'
  | 'broadcast'
  | 'ipv4-address' | 'ipv4-octets' | 'ipv4-prefix' | 'private-ipv4'
  | 'subnet-purpose' | 'subnet-mask' | 'subnet-boundaries' | 'subnet-range'
  | 'router-interfaces' | 'local-remote' | 'default-gateway' | 'routed-frame'
  | 'arp-mapping' | 'arp-request' | 'arp-reply' | 'arp-next-hop'
  | 'icmp-role' | 'echo-exchange' | 'ping-boundary' | 'diagnostic-path'
  | 'connected-routes' | 'route-entry' | 'static-route' | 'longest-prefix'
  | 'vlan-segments' | 'access-port' | 'vlan-reachability' | 'vlan-trunk'
  | 'model-purpose' | 'osi-stack' | 'tcp-ip-stack' | 'concept-layer-map';

export interface LessonCallout {
  label: string;
  text: string;
  visual?: 'manual-cabling';
}

export interface Lesson {
  id: string;
  chapterId: string;
  order: number;
  title: string;
  eyebrow: string;
  body: string;
  takeaway: string;
  illustration: LessonIllustration;
  fieldNote?: LessonCallout;
  termNote?: {
    term: string;
    definition: string;
  };
}

export interface QuizQuestion {
  id: string;
  lessonId: string;
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

export interface ChapterLabSummary {
  id: string;
  title: string;
  detail: string;
}

export interface ChapterDefinition {
  id: string;
  numberLabel: string;
  title: string;
  summary: string;
  lessons: Lesson[];
  quiz: QuizQuestion[];
  flashcards: Flashcard[];
  lab: ChapterLabSummary;
  recap: {
    built: string;
    learned: string;
    next: string;
  };
}
