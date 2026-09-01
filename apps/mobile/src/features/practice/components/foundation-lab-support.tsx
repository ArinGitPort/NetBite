import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getChapterByLabId } from '@/content/chapters';
import { Text } from '@/shared/components/console-text';
import { DisclosureSection } from '@/shared/components/disclosure-section';
import { lessonRoute } from '@/shared/routes';
import { NumberedStepRow, StatusRow } from '@/shared/components/status-row';
import { SolvedExampleLauncher } from '@/features/practice/components/solved-example-launcher';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export const labSetupSupportIds = [
  'first-network',
  'ethernet-cables',
  'switch-decision-desk',
  'ipv4-configurator',
  'subnet-range-desk',
  'gateway-forwarding-desk',
  'arp-resolution-desk',
  'ping-diagnostic-desk',
  'static-route-board',
  'vlan-port-desk',
  'layer-sorting-desk',
  'inter-vlan-routing-desk',
  'transport-service-desk',
] as const;

const supportedLabIds = new Set<string>(labSetupSupportIds);

const authoredFacts: Record<string, string[]> = {
  'first-network': ['Two PCs need separate links to the same switch.', 'Device names are administrator-chosen labels. NetBite uses PC1, PC2, SW1, and R1 consistently.', 'A router is not required for this one-LAN task.'],
  'ethernet-cables': ['PC or router to switch: straight-through in the traditional manual rule.', 'Switch to switch: crossover when auto-MDIX is unavailable.'],
  'switch-decision-desk': ['Learn the source MAC on the ingress port first.', 'Then inspect the destination and either forward to one known port or flood every other eligible port.'],
  'ipv4-configurator': ['The required LAN is 192.168.10.0/24.', 'Every octet must be 0 through 255, and host addresses must be unique.'],
  'subnet-range-desk': ['Use full IPv4 addresses.', 'Find host bits, block size, network starts, the containing block, then the reserved endpoints.'],
  'gateway-forwarding-desk': ['Compare complete network identities before choosing a next hop.', 'A remote destination uses a gateway that is reachable on the source host\'s local subnet.'],
  'arp-resolution-desk': ['ARP resolves the local next hop, not necessarily the final IPv4 destination.', 'A request uses Ethernet destination FF:FF:FF:FF:FF:FF inside the local VLAN.'],
  'ping-diagnostic-desk': ['Collect one piece of evidence before making a conclusion.', 'A successful Echo round trip proves only that this tested path worked at that time.'],
  'static-route-board': ['Both forward and return paths need routes.', 'Connected routes already exist; add only the required remote static routes.'],
  'vlan-port-desk': ['Access ports carry one access VLAN.', 'Both trunk endpoints must carry the required VLANs.'],
  'layer-sorting-desk': ['Classify the responsibility, not the device name.', 'OSI is a reference model; it is not a literal packet-processing program.'],
  'inter-vlan-routing-desk': ['PC1 uses F0/1 in VLAN 10; PC2 uses F0/2 in VLAN 20.', 'R1 G0/0 connects to the F0/24 trunk and uses one subinterface per VLAN.'],
  'transport-service-desk': ['Hosts process transport ports; the intermediate router forwards using IP information.', 'TCP establishes state before this exercise sends application data.'],
};

export function LabSetupSupport({ labId }: { labId: string }) {
  const styles = useThemeStyles(createStyles);
  if (!supportedLabIds.has(labId)) return null;
  const chapter = getChapterByLabId(labId);
  if (!chapter) return null;
  const lessonIds = chapter.lessons.slice(0, Math.min(4, chapter.lessons.length)).map(({ id }) => id);
  const facts = authoredFacts[labId] ?? [chapter.lab.detail, 'Use the current objective, supplied values, and resulting evidence in that order.'];

  return <><DisclosureSection title="LEARN THE SETUP" summary="Goal, supplied facts, worked method, and prerequisite lessons.">
    <Text variant="sectionHeading">{chapter.lab.title}</Text>
    <Group label="GOAL"><Text variant="body">{chapter.lab.detail}</Text></Group>
    <Group label="STARTING FACTS">{facts.map((fact) => <StatusRow key={fact} label={fact} state="info" variant="bodySmall" showStateLabel={false} />)}</Group>
    <Group label="WORKED METHOD">
      <Text variant="bodySmall">1. Read every supplied address, port, VLAN, or device role before entering anything.</Text>
      <Text variant="bodySmall">2. Apply the lesson rule to one device decision at a time.</Text>
      <Text variant="bodySmall">3. Save or submit once, then inspect the table, trace, or validation message.</Text>
      <Text variant="bodySmall">4. Correct only the value contradicted by the evidence.</Text>
    </Group>
    <Group label="TASK CHECKLIST">
      <NumberedStepRow number={1}>Identify the device making the decision.</NumberedStepRow>
      <NumberedStepRow number={2}>Use the complete supplied values and accepted format.</NumberedStepRow>
      <NumberedStepRow number={3}>Run the check and explain what the result proves.</NumberedStepRow>
    </Group>
    <Group label="REVIEW THE LESSONS">
      <View style={styles.links}>{lessonIds.map((lessonId) => <Pressable key={lessonId} accessibilityRole="link" accessibilityHint="Returns to this lab when you leave the lesson" onPress={() => router.push(lessonRoute(lessonId, { fromLabId: labId }))} style={styles.link}><Text variant="label">OPEN {lessonId.replaceAll('-', ' ').toUpperCase()}</Text></Pressable>)}</View>
    </Group>
  </DisclosureSection><SolvedExampleLauncher labId={labId} /></>;
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  const styles = useThemeStyles(createStyles);
  return <View style={styles.group}><Text variant="label" style={styles.green}>{label}</Text>{children}</View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  group: { gap: Space.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Space.md },
  green: { color: colors.green, fontFamily: Fonts.semibold },
  links: { gap: Space.sm },
  link: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, padding: Space.md },
});
