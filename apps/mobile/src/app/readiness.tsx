import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/shared/components/app-button';
import { PageHeader } from '@/shared/components/page-header';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';
import { AppRoutes } from '@/shared/routes';

const questions = [
  ['Which device forwards an Ethernet frame using its destination MAC address?', 'A switch', 'A router', 'A DNS server', 'A switch'],
  ['What does a switch learn from an arriving frame?', 'Source MAC and ingress port', 'Destination MAC and egress port', 'Source IPv4 and TTL', 'Source MAC and ingress port'],
  ['Which address is the network address for 192.168.10.70/26?', '192.168.10.64', '192.168.10.0', '192.168.10.96', '192.168.10.64'],
  ['A host sends remote-subnet traffic first to which local IPv4 next hop?', 'Default gateway', 'DNS server', 'Final remote host', 'Default gateway'],
  ['What local mapping does ARP resolve?', 'Next-hop IPv4 to MAC', 'Name to IPv4', 'Port to application', 'Next-hop IPv4 to MAC'],
  ['What is the Ethernet destination of an ARP Request?', 'FF:FF:FF:FF:FF:FF', '00:00:00:00:00:00', 'The remote host MAC', 'FF:FF:FF:FF:FF:FF'],
  ['Which matching route wins?', 'The longest prefix', 'The oldest route', 'The route with the longest name', 'The longest prefix'],
  ['What must exist for a successful routed ping?', 'Forward and return paths', 'Only a forward route', 'Only an ARP cache entry', 'Forward and return paths'],
  ['Which switchport normally carries one untagged user VLAN?', 'Access port', 'Trunk port', 'Routed port', 'Access port'],
  ['What does an 802.1Q trunk preserve?', 'VLAN context', 'Application port numbers', 'DNS TTL', 'VLAN context'],
  ['Different VLANs require what to communicate?', 'Layer 3 routing', 'Unknown-unicast flooding', 'A crossover cable', 'Layer 3 routing'],
  ['Which CLI command provides evidence about installed IPv4 routes?', 'show ip route', 'show vlan brief', 'show interfaces trunk', 'show ip route'],
] as const;

export default function ReadinessScreen() {
  const save = useGameStore((state) => state.saveReadinessScore);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>();
  const complete = index >= questions.length;
  const score = useMemo(() => answers.filter((answer, i) => answer === questions[i][4]).length, [answers]);
  const header = <PageHeader leading={{ accessibilityLabel: 'Back to courses', icon: 'arrow-left', label: 'BACK / COURSES', onPress: () => router.replace(AppRoutes.courses) }} />;
  if (complete) return <Screen header={header}><Text variant="label" style={styles.eyebrow}>READINESS RESULT</Text><Text variant="screenTitle" style={styles.title}>{score >= 10 ? 'OPERATIONS READY' : 'REVIEW FOUNDATIONS'}</Text><Text variant="body" style={styles.copy}>You answered {score} of 12 correctly. Operations requires 10/12. This result does not change your Foundations course progress.</Text>{score < 10 ? <Text variant="bodySmall" style={styles.feedback}>Review subnetting, gateways and ARP, route selection, VLAN trunks, and CLI verification before retrying.</Text> : null}<AppButton label={score >= 10 ? 'Open Network Operations' : 'Review Foundations'} onPress={() => { save('network-operations', score); router.replace(score >= 10 ? { pathname: '/learn', params: { courseId: 'network-operations' } } : { pathname: '/learn', params: { courseId: 'network-foundations' } }); }} /><AppButton label="Try again" variant="secondary" onPress={() => { setAnswers([]); setIndex(0); setSelected(undefined); }} /></Screen>;
  const [prompt, a, b, c] = questions[index];
  return <Screen header={header}><Text variant="label" style={styles.eyebrow}>PREREQUISITE DIAGNOSTIC / {index + 1} OF 12</Text><Text variant="screenTitle" style={styles.title}>CHECK YOUR FOUNDATION</Text><Text variant="body" style={styles.copy}>{prompt}</Text><View style={styles.answers}>{[a,b,c].map((choice) => <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ checked: selected === choice }} onPress={() => setSelected(choice)} style={[styles.choice, selected === choice && styles.choiceSelected]}><Text variant="label" style={styles.choiceText}>{choice}</Text></Pressable>)}</View><AppButton disabled={!selected} label="Submit answer" onPress={() => { if (!selected) return; setAnswers((values) => [...values, selected]); setSelected(undefined); setIndex((value) => value + 1); }} /><Text variant="technical" style={styles.note}>NO PENALTY / RESULT IDENTIFIES WHETHER COURSE 2 PREREQUISITES ARE READY</Text></Screen>;
}

const styles = StyleSheet.create({ eyebrow: { color: Palette.orange, marginTop: Space.xl }, title: { color: Palette.text, fontFamily: Fonts.semibold, marginVertical: Space.md }, copy: { color: Palette.textMuted }, answers: { gap: Space.sm, marginVertical: Space.xl }, choice: { minHeight: 52, borderWidth: 1, borderColor: Palette.border, padding: Space.md, justifyContent: 'center' }, choiceSelected: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft }, choiceText: { color: Palette.text }, feedback: { color: Palette.orange, borderWidth: 1, borderColor: Palette.orange, padding: Space.md, marginVertical: Space.lg }, note: { color: Palette.textMuted, marginTop: Space.lg } });

