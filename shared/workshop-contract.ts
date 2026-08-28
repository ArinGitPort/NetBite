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

export interface WorkshopDeviceInterface {
  id: string;
  name: string;
  ipv4Address?: string;
  prefix?: number;
  gateway?: string;
  vlan?: number;
  state: "up" | "down";
}

export interface WorkshopStaticRoute {
  destination: string;
  prefix: number;
  nextHop: string;
}

export interface WorkshopTopologyDevice {
  id: string;
  type: WorkshopDeviceType;
  name: string;
  x: number;
  y: number;
  interfaces: WorkshopDeviceInterface[];
  routes?: WorkshopStaticRoute[];
  notes?: string;
}

export interface WorkshopTopologyLink {
  id: string;
  fromDeviceId: string;
  fromInterfaceId: string;
  toDeviceId: string;
  toInterfaceId: string;
  label?: string;
  network?: string;
  accessVlan?: number;
  trunkVlans?: number[];
  state?: "up" | "down";
}

export interface WorkshopTopology {
  id: string;
  title: string;
  devices: WorkshopTopologyDevice[];
  links: WorkshopTopologyLink[];
  accessibilityDescription: string;
}

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

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

export function validateWorkshopTopology(
  topology: WorkshopTopology,
): WorkshopValidationIssue[] {
  const issues: WorkshopValidationIssue[] = [];
  if (!topology.title.trim())
    issues.push({
      severity: "error",
      path: "title",
      message: "Give the topology a title.",
    });
  if (!topology.accessibilityDescription.trim())
    issues.push({
      severity: "error",
      path: "accessibilityDescription",
      message: "Describe the topology for screen-reader users.",
    });
  if (topology.devices.length > 12)
    issues.push({
      severity: "error",
      path: "devices",
      message: "A workshop topology can contain at most 12 devices.",
    });
  const deviceIds = new Set<string>();
  const deviceNames = new Set<string>();
  const interfaces = new Map<string, WorkshopDeviceInterface>();
  for (const device of topology.devices) {
    if (deviceIds.has(device.id))
      issues.push({
        severity: "error",
        path: `devices.${device.id}`,
        message: "Device codes must be unique.",
      });
    deviceIds.add(device.id);
    const normalizedName = device.name.trim().toLowerCase();
    if (!normalizedName || deviceNames.has(normalizedName))
      issues.push({
        severity: "error",
        path: `devices.${device.id}.name`,
        message: "Device names must be present and unique.",
      });
    deviceNames.add(normalizedName);
    if (device.x < 0 || device.x > 1 || device.y < 0 || device.y > 1)
      issues.push({
        severity: "error",
        path: `devices.${device.id}.position`,
        message: "Keep every device inside the topology canvas.",
      });
    const interfaceIds = new Set<string>();
    for (const iface of device.interfaces) {
      const key = `${device.id}:${iface.id}`;
      if (!iface.id || interfaceIds.has(iface.id))
        issues.push({
          severity: "error",
          path: key,
          message: "Interface codes must be unique on each device.",
        });
      interfaceIds.add(iface.id);
      interfaces.set(key, iface);
      if (iface.ipv4Address && !IPV4.test(iface.ipv4Address))
        issues.push({
          severity: "error",
          path: `${key}.ipv4Address`,
          message: `${iface.ipv4Address} is not a valid IPv4 address.`,
        });
      if (iface.gateway && !IPV4.test(iface.gateway))
        issues.push({
          severity: "error",
          path: `${key}.gateway`,
          message: `${iface.gateway} is not a valid gateway address.`,
        });
      if (
        iface.prefix != null &&
        (!Number.isInteger(iface.prefix) ||
          iface.prefix < 0 ||
          iface.prefix > 32)
      )
        issues.push({
          severity: "error",
          path: `${key}.prefix`,
          message: "IPv4 prefixes must be between 0 and 32.",
        });
      if (
        iface.vlan != null &&
        (!Number.isInteger(iface.vlan) || iface.vlan < 1 || iface.vlan > 4094)
      )
        issues.push({
          severity: "error",
          path: `${key}.vlan`,
          message: "VLAN IDs must be between 1 and 4094.",
        });
    }
    for (const [index, route] of (device.routes ?? []).entries()) {
      if (!IPV4.test(route.destination))
        issues.push({
          severity: "error",
          path: `devices.${device.id}.routes.${index}.destination`,
          message: "Enter a valid route destination address.",
        });
      if (
        !Number.isInteger(route.prefix) ||
        route.prefix < 0 ||
        route.prefix > 32
      )
        issues.push({
          severity: "error",
          path: `devices.${device.id}.routes.${index}.prefix`,
          message: "Route prefixes must be between 0 and 32.",
        });
      if (!IPV4.test(route.nextHop))
        issues.push({
          severity: "error",
          path: `devices.${device.id}.routes.${index}.nextHop`,
          message: "Enter a valid next-hop address.",
        });
    }
  }
  const usedEndpoints = new Set<string>();
  for (const link of topology.links) {
    const first = `${link.fromDeviceId}:${link.fromInterfaceId}`;
    const second = `${link.toDeviceId}:${link.toInterfaceId}`;
    if (!interfaces.has(first) || !interfaces.has(second))
      issues.push({
        severity: "error",
        path: `links.${link.id}`,
        message: "Every cable endpoint must reference an existing interface.",
      });
    if (first === second)
      issues.push({
        severity: "error",
        path: `links.${link.id}`,
        message: "A cable must connect two different interfaces.",
      });
    if (usedEndpoints.has(first) || usedEndpoints.has(second))
      issues.push({
        severity: "error",
        path: `links.${link.id}`,
        message: "An interface can connect to only one cable.",
      });
    if (link.network) {
      const [address, prefix, extra] = link.network.split("/");
      if (
        extra != null ||
        !IPV4.test(address) ||
        prefix === "" ||
        !Number.isInteger(Number(prefix)) ||
        Number(prefix) < 0 ||
        Number(prefix) > 32
      )
        issues.push({
          severity: "error",
          path: `links.${link.id}.network`,
          message: "Use network and prefix notation such as 192.168.10.0/24.",
        });
    }
    if (link.accessVlan && link.trunkVlans?.length)
      issues.push({
        severity: "warning",
        path: `links.${link.id}.vlan`,
        message:
          "This connection includes both access and trunk VLAN information. Confirm that this is intentional.",
      });
    if (link.state === "down")
      issues.push({
        severity: "warning",
        path: `links.${link.id}.state`,
        message:
          "This connection is down. Confirm that it is intentional for the lesson.",
      });
    if (
      link.trunkVlans?.some(
        (vlan) => !Number.isInteger(vlan) || vlan < 1 || vlan > 4094,
      )
    )
      issues.push({
        severity: "error",
        path: `links.${link.id}.trunkVlans`,
        message: "Trunk VLAN IDs must be between 1 and 4094.",
      });
    usedEndpoints.add(first);
    usedEndpoints.add(second);
  }
  return issues;
}

export function validateGradedAssessmentSettings(
  settings: GradedAssessmentSettings,
): WorkshopValidationIssue[] {
  const issues: WorkshopValidationIssue[] = [];
  if (
    !Number.isInteger(settings.maximumAttempts) ||
    settings.maximumAttempts < 1 ||
    settings.maximumAttempts > 20
  )
    issues.push({
      severity: "error",
      path: "maximumAttempts",
      message: "Maximum attempts must be between 1 and 20.",
    });
  if (
    !Number.isFinite(settings.passingPercentage) ||
    settings.passingPercentage < 0 ||
    settings.passingPercentage > 100
  )
    issues.push({
      severity: "error",
      path: "passingPercentage",
      message: "Passing percentage must be between 0 and 100.",
    });
  if (settings.opensAt && Number.isNaN(Date.parse(settings.opensAt)))
    issues.push({
      severity: "error",
      path: "opensAt",
      message: "Opening date is not valid.",
    });
  if (settings.dueAt && Number.isNaN(Date.parse(settings.dueAt)))
    issues.push({
      severity: "error",
      path: "dueAt",
      message: "Due date is not valid.",
    });
  if (
    settings.opensAt &&
    settings.dueAt &&
    Date.parse(settings.dueAt) <= Date.parse(settings.opensAt)
  )
    issues.push({
      severity: "error",
      path: "dueAt",
      message: "Due date must be after the opening date.",
    });
  return issues;
}

export function calculateGradebookSummary(
  rows: GradebookStudentRow[],
): GradebookSummary {
  const submitted = rows.filter((row) => row.percentage != null);
  const scores = submitted.map((row) => row.percentage!).sort((a, b) => a - b);
  const average = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;
  const middle = Math.floor(scores.length / 2);
  const median = !scores.length
    ? 0
    : scores.length % 2
      ? scores[middle]
      : (scores[middle - 1] + scores[middle]) / 2;
  return {
    enrolled: rows.length,
    submitted: submitted.length,
    missing: rows.length - submitted.length,
    late: rows.filter((row) => row.status === "late").length,
    average,
    median,
    highest: scores.at(-1) ?? 0,
    lowest: scores[0] ?? 0,
    passRate: submitted.length
      ? (rows.filter((row) => row.status === "passed").length /
          submitted.length) *
        100
      : 0,
  };
}
