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
  neighborEntries?: Array<{ interfaceId: string; address: string; neighbor: string }>;
  routeEntries?: Array<{ destination: string; source: string; nextHop?: string; metric?: number }>;
  natTranslations?: Array<{ insideLocal: string; insideGlobal: string; outside?: string }>;
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
const IPV6 = /^[0-9a-f:]+$/i;
const INTERFACE_NAME = /^[A-Za-z][A-Za-z0-9./-]{0,23}$/;
const validVlan = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= 4094;

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
    const interfaceNames = new Set<string>();
    for (const iface of device.interfaces) {
      const key = `${device.id}:${iface.id}`;
      if (!iface.id || interfaceIds.has(iface.id))
        issues.push({
          severity: "error",
          path: key,
          message: "Interface codes must be unique on each device.",
        });
      interfaceIds.add(iface.id);
      const normalizedInterfaceName = iface.name.trim().toLowerCase();
      if (interfaceNames.has(normalizedInterfaceName))
        issues.push({ severity: "error", path: `${key}.name`, message: "Interface names must be unique on each device." });
      interfaceNames.add(normalizedInterfaceName);
      interfaces.set(key, iface);
      if (!INTERFACE_NAME.test(iface.name.trim()))
        issues.push({
          severity: "error",
          path: `${key}.name`,
          message: "Use an interface name such as G0/0, F0/1, or E0.",
        });
      const kind = iface.kind ?? "physical";
      if (kind === "subinterface") {
        const parent = device.interfaces.find(
          (candidate) => candidate.id === iface.parentInterfaceId,
        );
        if (!parent || (parent.kind ?? "physical") !== "physical")
          issues.push({
            severity: "error",
            path: `${key}.parentInterfaceId`,
            message: "A subinterface must use a physical parent interface.",
          });
        if (iface.encapsulationVlan == null || !validVlan(iface.encapsulationVlan))
          issues.push({
            severity: "error",
            path: `${key}.encapsulationVlan`,
            message: "Choose an 802.1Q VLAN from 1 through 4094.",
          });
      }
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
        !validVlan(iface.vlan)
      )
        issues.push({
          severity: "error",
          path: `${key}.vlan`,
          message: "VLAN IDs must be between 1 and 4094.",
        });
      for (const assignment of iface.ipv6Addresses ?? []) {
        if (!assignment.address.includes(":") || !IPV6.test(assignment.address))
          issues.push({
            severity: "error",
            path: `${key}.ipv6Addresses.${assignment.id}`,
            message: "Enter a valid IPv6 address.",
          });
        if (!Number.isInteger(assignment.prefix) || assignment.prefix < 0 || assignment.prefix > 128)
          issues.push({
            severity: "error",
            path: `${key}.ipv6Addresses.${assignment.id}.prefix`,
            message: "IPv6 prefixes must be between 0 and 128.",
          });
      }
      const switchport = iface.switchport;
      if (switchport?.accessVlan != null && !validVlan(switchport.accessVlan))
        issues.push({ severity: "error", path: `${key}.switchport.accessVlan`, message: "Access VLANs must be between 1 and 4094." });
      if (switchport?.allowedVlans?.some((vlan) => !validVlan(vlan)))
        issues.push({ severity: "error", path: `${key}.switchport.allowedVlans`, message: "Allowed VLANs must be between 1 and 4094." });
      if (iface.protocolSettings?.dhcpRelayAddress && !IPV4.test(iface.protocolSettings.dhcpRelayAddress))
        issues.push({ severity: "error", path: `${key}.protocolSettings.dhcpRelayAddress`, message: "Enter a valid DHCP relay address." });
    }
    for (const [index, route] of (device.routes ?? []).entries()) {
      const isIpv6 = route.addressFamily === "ipv6";
      const validAddress = isIpv6
        ? (address: string) => address.includes(":") && IPV6.test(address)
        : (address: string) => IPV4.test(address);
      if (!validAddress(route.destination))
        issues.push({
          severity: "error",
          path: `devices.${device.id}.routes.${index}.destination`,
          message: "Enter a valid route destination address.",
        });
      const maximumPrefix = isIpv6 ? 128 : 32;
      if (
        !Number.isInteger(route.prefix) ||
        route.prefix < 0 ||
        route.prefix > maximumPrefix
      )
        issues.push({
          severity: "error",
          path: `devices.${device.id}.routes.${index}.prefix`,
          message: `Route prefixes must be between 0 and ${maximumPrefix}.`,
        });
      if (!validAddress(route.nextHop))
        issues.push({
          severity: "error",
          path: `devices.${device.id}.routes.${index}.nextHop`,
          message: "Enter a valid next-hop address.",
        });
    }
    const config = device.configuration;
    for (const vlan of config?.vlans ?? []) {
      if (!validVlan(vlan.id)) issues.push({ severity: "error", path: `devices.${device.id}.configuration.vlans`, message: "VLAN IDs must be between 1 and 4094." });
    }
    if (config?.ospf) {
      if (!IPV4.test(config.ospf.routerId)) issues.push({ severity: "error", path: `devices.${device.id}.configuration.ospf.routerId`, message: "Enter a valid dotted-decimal OSPF router ID." });
      for (const network of config.ospf.networks) {
        const [address, prefix] = network.network.split("/");
        if (!IPV4.test(address) || !Number.isInteger(Number(prefix)) || Number(prefix) < 0 || Number(prefix) > 32)
          issues.push({ severity: "error", path: `devices.${device.id}.configuration.ospf.networks.${network.id}`, message: "Use OSPF network notation such as 10.0.12.0/30." });
      }
    }
    for (const pool of config?.services?.dhcpPools ?? []) {
      if (!IPV4.test(pool.network) || pool.prefix < 0 || pool.prefix > 32)
        issues.push({ severity: "error", path: `devices.${device.id}.configuration.services.dhcpPools.${pool.id}`, message: "Enter a valid DHCP pool network and prefix." });
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
    const firstInterface = interfaces.get(first);
    const secondInterface = interfaces.get(second);
    if (
      (firstInterface && (firstInterface.kind ?? "physical") !== "physical") ||
      (secondInterface && (secondInterface.kind ?? "physical") !== "physical")
    )
      issues.push({
        severity: "error",
        path: `links.${link.id}`,
        message: "Physical cables can connect only physical interfaces. Logical interfaces use their parent connection.",
      });
    if (first === second)
      issues.push({
        severity: "error",
        path: `links.${link.id}`,
        message: "A cable must connect two different interfaces.",
      });
    if (
      link.purpose != null &&
      !["basic", "routed", "access", "trunk"].includes(link.purpose)
    )
      issues.push({
        severity: "error",
        path: `links.${link.id}.purpose`,
        message: "Choose a supported connection purpose.",
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
    if (link.accessVlan && link.trunkVlans?.length && !link.purpose)
      issues.push({
        severity: "warning",
        path: `links.${link.id}.vlan`,
        message:
          "This connection includes both access and trunk VLAN information. Choose one connection purpose.",
      });
    const hasPurposeMismatch =
      (link.purpose === "basic" &&
        Boolean(link.network || link.accessVlan || link.trunkVlans?.length)) ||
      (link.purpose === "routed" &&
        Boolean(link.accessVlan || link.trunkVlans?.length)) ||
      (link.purpose === "access" &&
        Boolean(link.network || link.trunkVlans?.length)) ||
      (link.purpose === "trunk" &&
        Boolean(link.network || link.accessVlan));
    if (hasPurposeMismatch)
      issues.push({
        severity: "warning",
        path: `links.${link.id}.purpose`,
        message:
          "This connection contains information from another purpose. Review its connection settings.",
      });
    if (link.purpose === "routed" && !link.network)
      issues.push({
        severity: "warning",
        path: `links.${link.id}.network`,
        message: "This routed connection does not have a network and prefix yet.",
      });
    if (link.purpose === "access" && !link.accessVlan)
      issues.push({
        severity: "warning",
        path: `links.${link.id}.accessVlan`,
        message: "This access connection does not have a VLAN ID yet.",
      });
    if (link.purpose === "trunk" && !link.trunkVlans?.length)
      issues.push({
        severity: "warning",
        path: `links.${link.id}.trunkVlans`,
        message: "This trunk connection does not have allowed VLAN IDs yet.",
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
