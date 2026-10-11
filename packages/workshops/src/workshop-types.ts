export type MobileAccountRole = "student" | "instructor";
export type WorkshopAssessmentMode = "practice" | "graded";
export type GradePolicy = "highest" | "latest" | "first";
export type FeedbackRelease = "immediate" | "final-attempt" | "due-date";
export type WorkshopBlockType =
  | "heading"
  | "paragraph"
  | "callout"
  | "example"
  | "image"
  | "topology"
  | "commands";
export type WorkshopDeviceType = "pc" | "switch" | "router" | "server";
export type WorkshopInterfaceKind =
  | "physical"
  | "subinterface"
  | "svi"
  | "port-channel";

export interface WorkshopIPv6Assignment {
  id: string;
  address: string;
  prefix: number;
  scope?: "global" | "link-local" | "multicast" | "anycast";
}

export interface WorkshopSwitchportConfiguration {
  mode: "access" | "trunk";
  accessVlan?: number;
  allowedVlans?: number[];
  nativeVlan?: number;
}

export interface WorkshopInterfaceProtocolSettings {
  dhcpRelayAddress?: string;
  natRole?: "inside" | "outside";
  ospfArea?: number;
  ospfCost?: number;
  routerAdvertisement?: boolean;
}

export interface WorkshopDeviceInterface {
  id: string;
  name: string;
  kind?: WorkshopInterfaceKind;
  parentInterfaceId?: string;
  encapsulationVlan?: number;
  ipv4Address?: string;
  prefix?: number;
  gateway?: string;
  vlan?: number;
  ipv6Addresses?: WorkshopIPv6Assignment[];
  switchport?: WorkshopSwitchportConfiguration;
  protocolSettings?: WorkshopInterfaceProtocolSettings;
  state: "up" | "down";
}

export interface WorkshopStaticRoute {
  destination: string;
  prefix: number;
  nextHop: string;
  addressFamily?: "ipv4" | "ipv6";
}

export interface WorkshopVlan {
  id: number;
  name?: string;
}

export interface WorkshopTransportListener {
  id: string;
  protocol: "tcp" | "udp";
  port: number;
  service: string;
}

export interface WorkshopDhcpPool {
  id: string;
  name: string;
  network: string;
  prefix: number;
  firstAddress?: string;
  lastAddress?: string;
  exclusions?: string[];
  gateway?: string;
  dnsServer?: string;
  leaseMinutes?: number;
}

export interface WorkshopDnsRecord {
  id: string;
  name: string;
  type: "A" | "AAAA";
  value: string;
  ttl?: number;
}

export interface WorkshopAclRule {
  id: string;
  sequence: number;
  action: "permit" | "deny";
  protocol: "ip" | "tcp" | "udp" | "icmp";
  source: string;
  destination: string;
  destinationPort?: number;
}

export interface WorkshopAclConfiguration {
  name: string;
  rules: WorkshopAclRule[];
  applications?: Array<{
    interfaceId: string;
    direction: "in" | "out";
  }>;
}

export interface WorkshopNatConfiguration {
  eligibleNetworks?: string[];
  overloadInterfaceId?: string;
  pool?: { name: string; firstAddress: string; lastAddress: string };
  staticMappings?: Array<{
    id: string;
    insideLocal: string;
    insideGlobal: string;
  }>;
}

export interface WorkshopStpConfiguration {
  bridgePriority?: number;
  rootRole?: "root" | "non-root";
  portStates?: Array<{
    interfaceId: string;
    role: "root" | "designated" | "alternate";
    state: "forwarding" | "discarding";
    cost?: number;
  }>;
}

export interface WorkshopEtherChannelConfiguration {
  groups: Array<{
    id: string;
    number: number;
    portChannelInterfaceId: string;
    memberInterfaceIds: string[];
    lacpMode: "active" | "passive";
    state?: "formed" | "suspended" | "down";
  }>;
}

export interface WorkshopOspfConfiguration {
  processId: number;
  routerId: string;
  networks: Array<{ id: string; network: string; area: number }>;
  neighbors?: Array<{ id: string; routerId: string; state: string }>;
}

export interface WorkshopServiceConfiguration {
  addressMode?: "static" | "dhcp";
  resolver?: string;
  transportListeners?: WorkshopTransportListener[];
  dhcpPools?: WorkshopDhcpPool[];
  dnsRecords?: WorkshopDnsRecord[];
}

export interface WorkshopExpectedState {
  macTable?: Array<{ interfaceId: string; macAddress: string; vlan?: number }>;
  neighborEntries?: Array<
    { interfaceId: string; address: string; neighbor: string }
  >;
  routeEntries?: Array<
    { destination: string; source: string; nextHop?: string; metric?: number }
  >;
  natTranslations?: Array<
    { insideLocal: string; insideGlobal: string; outside?: string }
  >;
  aclResult?: { aclName: string; ruleId?: string; result: "permit" | "deny" };
  notes?: string[];
}

export interface WorkshopDeviceConfiguration {
  vlans?: WorkshopVlan[];
  services?: WorkshopServiceConfiguration;
  acl?: WorkshopAclConfiguration;
  nat?: WorkshopNatConfiguration;
  stp?: WorkshopStpConfiguration;
  etherChannel?: WorkshopEtherChannelConfiguration;
  ospf?: WorkshopOspfConfiguration;
  expectedState?: WorkshopExpectedState;
}

export interface WorkshopTopologyDevice {
  id: string;
  type: WorkshopDeviceType;
  name: string;
  x: number;
  y: number;
  interfaces: WorkshopDeviceInterface[];
  routes?: WorkshopStaticRoute[];
  configuration?: WorkshopDeviceConfiguration;
  notes?: string;
}

export type WorkshopLinkPurpose = "basic" | "routed" | "access" | "trunk";

export interface WorkshopTopologyLink {
  id: string;
  fromDeviceId: string;
  fromInterfaceId: string;
  toDeviceId: string;
  toInterfaceId: string;
  purpose?: WorkshopLinkPurpose;
  label?: string;
  network?: string;
  accessVlan?: number;
  trunkVlans?: number[];
  state?: "up" | "down";
}

export interface WorkshopTopology {
  schemaVersion?: 1 | 2;
  id: string;
  title: string;
  devices: WorkshopTopologyDevice[];
  links: WorkshopTopologyLink[];
  accessibilityDescription: string;
  starterId?: WorkshopTopologyStarterId;
  checklist?: string[];
  warningsAcknowledged?: boolean;
}

export type WorkshopTopologyStarterId =
  | "first-network"
  | "static-routing"
  | "vlan-trunk"
  | "router-on-a-stick"
  | "dhcp-relay"
  | "dns-service"
  | "acl-placement"
  | "nat-pat"
  | "ipv6-delivery"
  | "stp-redundancy"
  | "lacp-etherchannel"
  | "route-source"
  | "single-area-ospf";

export interface WorkshopLessonBlock {
  id: string;
  type: WorkshopBlockType;
  title?: string;
  text?: string;
  imageUrl?: string;
  altText?: string;
  topologyId?: string;
  introduction?: string;
  commandGroups?: WorkshopCommandGroup[];
  generatedSourceFingerprint?: string;
}

export interface WorkshopCommandGroup {
  id: string;
  title: string;
  deviceId?: string;
  commands: string[];
  explanation?: string;
}

export interface WorkshopLesson {
  id: string;
  title: string;
  summary: string;
  order: number;
  blocks: WorkshopLessonBlock[];
}

export interface WorkshopFlashcard {
  id: string;
  lessonId: string;
  question: string;
  answer: string;
  explanation?: string;
}

export interface WorkshopQuestionChoice {
  id: string;
  label: string;
}

export interface WorkshopAssessmentQuestion {
  id: string;
  lessonId?: string;
  prompt: string;
  choices: WorkshopQuestionChoice[];
  explanation?: string;
}

export interface WorkshopPracticeQuestion extends WorkshopAssessmentQuestion {
  correctChoiceId: string;
}

export interface GradedAssessmentSettings {
  opensAt?: string;
  dueAt?: string;
  maximumAttempts: number;
  gradePolicy: GradePolicy;
  passingPercentage: number;
  feedbackRelease: FeedbackRelease;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
}

export interface WorkshopAssessment {
  id: string;
  title: string;
  mode: WorkshopAssessmentMode;
  instructions: string;
  questions: WorkshopAssessmentQuestion[];
  settings?: GradedAssessmentSettings;
}

export interface WorkshopManifest {
  workshopId: string;
  versionId: string;
  version: number;
  title: string;
  description: string;
  instructorName: string;
  publishedAt: string;
  archived: boolean;
  lessons: WorkshopLesson[];
  topologies: WorkshopTopology[];
  flashcards: WorkshopFlashcard[];
  assessments: WorkshopAssessment[];
}

export interface WorkshopClassSummary {
  id: string;
  workshopId: string;
  versionId: string;
  title: string;
  instructorName: string;
  joinCode?: string;
  archived: boolean;
  enrolledCount?: number;
}

export interface WorkshopLibraryEntry {
  classId: string;
  manifest: WorkshopManifest;
  joinedAt: string;
  savedLessonIds: string[];
}

export interface WorkshopAttemptDraft {
  classId: string;
  versionId: string;
  assessmentId: string;
  requestId: string;
  answers: Record<string, string>;
  updatedAt: string;
}

export interface WorkshopSubmissionResult {
  attemptId: string;
  assessmentId: string;
  attemptNumber: number;
  submittedAt: string;
  late: boolean;
  score?: number;
  total?: number;
  percentage?: number;
  passed?: boolean;
  feedbackReleased: boolean;
  answers?: Array<{
    questionId: string;
    correctChoiceId: string;
    explanation?: string;
  }>;
}

export interface GradebookStudentRow {
  studentId: string;
  studentName: string;
  assessmentId: string;
  assessmentTitle?: string;
  recordedScore?: number;
  total: number;
  percentage?: number;
  attempts: number;
  submittedAt?: string;
  status: "missing" | "submitted" | "late" | "passed" | "needs-review";
}

export interface GradebookSummary {
  enrolled: number;
  submitted: number;
  missing: number;
  late: number;
  average: number;
  median: number;
  highest: number;
  lowest: number;
  passRate: number;
}

export interface WorkshopValidationIssue {
  severity: "error" | "warning";
  path: string;
  message: string;
}
