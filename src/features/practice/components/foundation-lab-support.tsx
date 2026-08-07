import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { ChapterDefinition } from '@/content/types';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { lessonRoute } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';

const authoredFacts: Record<string, string[]> = {
  'first-network': ['Two PCs need separate links to the same switch.', 'A router is not required for this one-LAN task.'],
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
  'inter-vlan-routing-desk': ['PC-A uses F0/1 in VLAN 10; PC-B uses F0/2 in VLAN 20.', 'R-1 G0/0 connects to the F0/24 trunk and uses one subinterface per VLAN.'],
  'transport-service-desk': ['Hosts process transport ports; the intermediate router forwards using IP information.', 'TCP establishes state before this exercise sends application data.'],
};

export function FoundationLabSupport({ chapter, labId }: { chapter: ChapterDefinition; labId: string }) {
  const [visible, setVisible] = useState(false);
  const lessonIds = useMemo(() => chapter.lessons.slice(0, Math.min(4, chapter.lessons.length)).map(({ id }) => id), [chapter.lessons]);
  const facts = authoredFacts[labId] ?? [chapter.lab.detail, 'Use the current objective, supplied values, and resulting evidence in that order.'];

  return <>
    <View style={styles.bar}>
      <Text variant="bodySmall" style={styles.barCopy}>Need the method or supplied facts?</Text>
      <AppButton label="Learn the setup" variant="utility" onPress={() => setVisible(true)} />
    </View>
    <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.panel}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text variant="label" style={styles.orange}>LEARN THE SETUP</Text>
            <Text variant="screenTitle">{chapter.lab.title}</Text>
            <Group label="GOAL"><Text variant="body">{chapter.lab.detail}</Text></Group>
            <Group label="STARTING FACTS">{facts.map((fact) => <Text key={fact} variant="bodySmall">• {fact}</Text>)}</Group>
            <Group label="WORKED METHOD">
              <Text variant="bodySmall">1. Read every supplied address, port, VLAN, or device role before entering anything.</Text>
              <Text variant="bodySmall">2. Apply the lesson rule to one device decision at a time.</Text>
              <Text variant="bodySmall">3. Save or submit once, then inspect the table, trace, or validation message.</Text>
              <Text variant="bodySmall">4. Correct only the value contradicted by the evidence.</Text>
            </Group>
            <Group label="TASK CHECKLIST">
              <Text variant="bodySmall">[ ] Identify the device making the decision.</Text>
              <Text variant="bodySmall">[ ] Use the complete supplied values and accepted format.</Text>
              <Text variant="bodySmall">[ ] Run the check and explain what the result proves.</Text>
            </Group>
            <Group label="REVIEW THE LESSONS">
              <View style={styles.links}>{lessonIds.map((lessonId) => <Pressable key={lessonId} accessibilityRole="link" accessibilityHint="Returns to this lab when you leave the lesson" onPress={() => { setVisible(false); router.push(lessonRoute(lessonId, { fromLabId: labId })); }} style={styles.link}><Text variant="label">OPEN {lessonId.replaceAll('-', ' ').toUpperCase()}</Text></Pressable>)}</View>
            </Group>
            <AppButton label="Return to lab" onPress={() => setVisible(false)} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return <View style={styles.group}><Text variant="label" style={styles.green}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  bar: { minHeight: 52, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm, paddingHorizontal: Space.lg, paddingVertical: Space.xs, borderBottomWidth: 1, borderBottomColor: Palette.border, backgroundColor: Palette.surface },
  barCopy: { color: Palette.textMuted, flexShrink: 1 },
  backdrop: { flex: 1, justifyContent: 'center', padding: Space.lg, backgroundColor: 'rgba(0,0,0,0.78)' },
  panel: { width: '100%', maxWidth: 720, maxHeight: '90%', alignSelf: 'center', borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.background },
  content: { gap: Space.lg, padding: Space.lg },
  group: { gap: Space.sm, borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: Space.md },
  orange: { color: Palette.orange, fontFamily: Fonts.semibold },
  green: { color: Palette.green, fontFamily: Fonts.semibold },
  links: { gap: Space.sm },
  link: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: Palette.border, padding: Space.md },
});
