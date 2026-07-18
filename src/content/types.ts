export type LessonIllustration =
  | 'network'
  | 'device-types'
  | 'purpose'
  | 'devices'
  | 'connection'
  | 'frame'
  | 'nic'
  | 'cables'
  | 'ports'
  | 'ethernet-link' | 'cabling-rule'
  | 'mac-address'
  | 'mac-learning'
  | 'switch-forwarding'
  | 'broadcast'
  | 'mac-fields' | 'unknown-unicast'
  | 'ipv4-address' | 'ipv4-octets' | 'ipv4-prefix' | 'private-ipv4'
  | 'octet-bits' | 'network-host' | 'private-ranges'
  | 'subnet-purpose' | 'subnet-mask' | 'subnet-boundaries' | 'subnet-range'
  | 'host-bits' | 'block-size' | 'subnet-method' | 'subnet-borrowed-bits' | 'subnet-map'
  | 'router-interfaces' | 'local-remote' | 'default-gateway' | 'routed-frame'
  | 'same-subnet' | 'gateway-requirements'
  | 'arp-mapping' | 'arp-request' | 'arp-reply' | 'arp-next-hop'
  | 'arp-cache' | 'arp-local-sequence'
  | 'icmp-role' | 'echo-exchange' | 'ping-boundary' | 'diagnostic-path'
  | 'ping-outcomes' | 'ping-failure'
  | 'connected-routes' | 'route-entry' | 'static-route' | 'longest-prefix'
  | 'route-purpose' | 'route-next-hop' | 'default-route' | 'route-match-test'
  | 'vlan-segments' | 'access-port' | 'vlan-reachability' | 'vlan-trunk'
  | 'vlan-purpose' | 'same-vlan' | 'dot1q-tag'
  | 'model-purpose' | 'osi-stack' | 'tcp-ip-stack' | 'concept-layer-map'
  | 'osi-physical' | 'osi-data-link' | 'osi-network' | 'osi-transport'
  | 'osi-session' | 'osi-presentation' | 'osi-application';

export type LessonSection = {
  heading: string;
  body: string;
};

export type LessonExample = {
  label: string;
  setup: string;
  steps?: LessonExampleStep[];
  result: string;
};

export interface LessonExampleStep {
  id: string;
  label: string;
  explanation: string;
  value?: string;
}

export interface LessonCheckpointChoice {
  id: string;
  label: string;
  feedback: string;
}

export interface LessonCheckpoint {
  prompt: string;
  choices: LessonCheckpointChoice[];
  correctChoiceId: string;
  hints?: string[];
}

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
  sections?: LessonSection[];
  example?: LessonExample;
  checkpoint?: LessonCheckpoint;
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
  contentVersion: number;
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
