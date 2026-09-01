import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/shared/components/console-text';
import { DisclosureSection } from '@/shared/components/disclosure-section';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

const columns = [
  { group: '128', mask: '128', fourth: '/25', third: '/17', second: '/9', first: '/1' },
  { group: '64', mask: '192', fourth: '/26', third: '/18', second: '/10', first: '/2' },
  { group: '32', mask: '224', fourth: '/27', third: '/19', second: '/11', first: '/3' },
  { group: '16', mask: '240', fourth: '/28', third: '/20', second: '/12', first: '/4' },
  { group: '8', mask: '248', fourth: '/29', third: '/21', second: '/13', first: '/5' },
  { group: '4', mask: '252', fourth: '/30', third: '/22', second: '/14', first: '/6' },
  { group: '2', mask: '254', fourth: '/31', third: '/23', second: '/15', first: '/7' },
  { group: '1', mask: '255', fourth: '/32', third: '/24', second: '/16', first: '/8' },
] as const;

const rows = [
  { id: 'group', label: 'GROUP SIZE', values: columns.map((item) => item.group) },
  { id: 'mask', label: 'MASK OCTET', values: columns.map((item) => item.mask) },
  { id: 'fourth', label: '4TH OCTET', values: columns.map((item) => item.fourth) },
  { id: 'third', label: '3RD OCTET', values: columns.map((item) => item.third) },
  { id: 'second', label: '2ND OCTET', values: columns.map((item) => item.second) },
  { id: 'first', label: '1ST OCTET', values: columns.map((item) => item.first) },
] as const;

const chapterFocus = [
  { prefix: '/24', mask: '255.255.255.0', block: '256' },
  { prefix: '/25', mask: '255.255.255.128', block: '128' },
  { prefix: '/26', mask: '255.255.255.192', block: '64' },
  { prefix: '/27', mask: '255.255.255.224', block: '32' },
] as const;

type MethodStep = {
  title: string;
  detail: string;
  highlights?: readonly string[];
  range?: readonly { label: string; value: string; target?: boolean }[];
  conclusion?: string;
};

const methodSteps: readonly MethodStep[] = [
  {
    title: 'MATCH THE PREFIX',
    detail: 'Find the prefix in the fourth-octet row, then read upward for the matching mask octet and group size.',
    highlights: ['/26  →  MASK OCTET 192  →  GROUP SIZE 64'],
  },
  {
    title: 'LIST NETWORK STARTS',
    detail: 'Begin at 0 in the changing octet. Keep adding the group size until you pass the target address.',
    highlights: ['0  →  64  →  128  →  192'],
  },
  {
    title: 'LOCATE THE TARGET',
    detail: 'The target 192.168.10.70 is at least 192.168.10.64 but below 192.168.10.128.',
    range: [
      { label: 'BLOCK START', value: '192.168.10.64' },
      { label: 'TARGET IP / INSIDE THIS BLOCK', value: '192.168.10.70', target: true },
      { label: 'NEXT NETWORK', value: '192.168.10.128' },
    ],
    conclusion: '192.168.10.70 belongs to subnet 192.168.10.64/26. This subnet runs from 192.168.10.64 through 192.168.10.127.',
  },
  {
    title: 'MARK NETWORK AND NEXT NETWORK',
    detail: 'The lower start is the network address. The following start begins the next subnet.',
    highlights: ['NETWORK  192.168.10.64/26', 'NEXT NETWORK  192.168.10.128/26'],
  },
  {
    title: 'FIND THE BROADCAST',
    detail: 'The broadcast address is one address before the next network.',
    highlights: ['192.168.10.128 − 1 = 192.168.10.127'],
  },
  {
    title: 'FIND THE USABLE HOST RANGE',
    detail: 'The network and broadcast addresses are reserved. Usable host addresses begin one after the network and end one before the broadcast.',
    highlights: ['FIRST HOST  192.168.10.65', 'LAST HOST  192.168.10.126'],
  },
  {
    title: 'COUNT ADDRESSES',
    detail: 'A /26 leaves 6 host bits. Calculate all addresses, then subtract the two reserved addresses: the network and broadcast.',
    highlights: ['TOTAL  2^(32 − 26) = 2^6 = 64', 'USABLE  64 − 2 = 62'],
  },
] as const;

const workedExamples = [
  {
    id: 'example-25', title: 'EXAMPLE 1 / FIND A /25 RANGE', given: '192.168.10.200/25',
    steps: ['Group size is 128.', 'Nearby starts are 192.168.10.128 and 192.168.11.0.', 'The current /24 ends at 192.168.10.255.'],
    results: ['NETWORK  192.168.10.128/25', 'SUBNET MASK  255.255.255.128', 'FIRST HOST  192.168.10.129', 'LAST HOST  192.168.10.254', 'BROADCAST  192.168.10.255', 'TOTAL / USABLE  128 / 126'],
  },
  {
    id: 'example-27', title: 'EXAMPLE 2 / FIND A /27 RANGE', given: '10.20.30.150/27',
    steps: ['Group size is 32.', 'The neighboring starts are 10.20.30.128 and 10.20.30.160.', 'The target 150 lies between those starts.'],
    results: ['NETWORK  10.20.30.128/27', 'SUBNET MASK  255.255.255.224', 'FIRST HOST  10.20.30.129', 'LAST HOST  10.20.30.158', 'BROADCAST  10.20.30.159', 'TOTAL / USABLE  32 / 30'],
  },
  {
    id: 'example-mask', title: 'EXAMPLE 3 / START WITH A MASK', given: '172.16.8.77 with mask 255.255.255.192',
    steps: ['Final mask octet 192 maps to /26.', 'Group size is 64.', 'The neighboring starts are 172.16.8.64 and 172.16.8.128.'],
    results: ['NETWORK  172.16.8.64/26', 'SUBNET MASK  255.255.255.192', 'FIRST HOST  172.16.8.65', 'LAST HOST  172.16.8.126', 'BROADCAST  172.16.8.127', 'TOTAL / USABLE  64 / 62'],
  },
] as const;

export function SubnettingCheatSheet() {
  const styles = useThemeStyles(createStyles);
  return (
    <DisclosureSection
      title="SUBNETTING CHEAT SHEET"
      summary="Prefix-to-mask table, repeatable range method, and worked examples."
    >
    <View accessibilityLabel="Subnetting prefix, mask-octet, and group-size cheat sheet" style={styles.content}>
      <Text variant="label" style={styles.eyebrow}>QUICK REFERENCE</Text>
      <Text variant="bodySmall" style={styles.description}>
        Find the prefix in the row for the octet where its network bits end. Read upward to see that octet&apos;s mask value and group size.
      </Text>
      <View style={styles.example}>
        <Text selectable variant="technical" style={styles.exampleText}>EXAMPLE / /26 → MASK OCTET 192 → GROUP SIZE 64</Text>
      </View>

      <Text variant="technical" style={styles.scrollCue}>SCROLL SIDEWAYS TO VIEW THE COMPLETE TABLE</Text>
      <ScrollView accessibilityLabel="Scrollable subnetting cheat sheet table" horizontal nestedScrollEnabled showsHorizontalScrollIndicator>
        <View style={styles.table}>
          {rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={styles.rowHeading}><Text variant="technical" style={styles.rowHeadingText}>{row.label}</Text></View>
              {row.values.map((value, index) => {
                const emphasized = (row.id === 'fourth' && index < 3) || (row.id === 'mask' && index < 3) || (row.id === 'group' && index < 3);
                return <View key={`${row.id}-${value}`} style={[styles.cell, emphasized && styles.focusCell]}><Text selectable variant="technical" style={[styles.cellText, emphasized && styles.focusText]}>{value}</Text></View>;
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <Text variant="label" style={styles.focusTitle}>CHAPTER 5 FOCUS</Text>
      <View style={styles.focusList}>
        {chapterFocus.map((item) => (
          <View key={item.prefix} style={styles.focusRow}>
            <Text selectable variant="technical" style={styles.prefix}>{item.prefix}</Text>
            <View style={styles.focusCopy}>
              <Text selectable variant="technical" style={styles.mask}>{item.mask}</Text>
              <Text selectable variant="technical" style={styles.block}>{item.block} ADDRESSES PER BLOCK</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.method}>
        <Text variant="label" style={styles.methodEyebrow}>REPEATABLE METHOD</Text>
        <Text variant="sectionHeading" style={styles.methodTitle}>FIND A SUBNET RANGE</Text>
        <Text variant="bodySmall" style={styles.methodIntro}>Worked example: locate host 192.168.10.70/26.</Text>
        {methodSteps.map((step, index) => (
          <View key={step.title} style={styles.methodRow}>
            <View style={styles.stepNumber}><Text variant="label" style={styles.stepNumberText}>{index + 1}</Text></View>
            <View style={styles.stepCopy}>
              <Text variant="label" style={styles.stepTitle}>{step.title}</Text>
              <Text selectable variant="bodySmall" style={styles.stepDetail}>{step.detail}</Text>
              {step.highlights ? (
                <View style={styles.stepHighlights}>
                  {step.highlights.map((highlight) => <Text key={highlight} selectable variant="technical" style={styles.stepHighlight}>{highlight}</Text>)}
                </View>
              ) : null}
              {step.range ? (
                <View accessibilityLabel="The target IP is between the block start and the next network" style={styles.rangeBox}>
                  {step.range.map((item) => (
                    <View key={item.label} style={[styles.rangeRow, item.target && styles.rangeTarget]}>
                      <Text variant="label" style={[styles.rangeLabel, item.target && styles.rangeTargetText]}>{item.label}</Text>
                      <Text selectable variant="technical" style={[styles.rangeValue, item.target && styles.rangeTargetText]}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {step.conclusion ? (
                <View style={styles.stepConclusion}>
                  <Text variant="label" style={styles.conclusionLabel}>RESULT / CONTAINING SUBNET</Text>
                  <Text selectable variant="bodySmall" style={styles.conclusionText}>{step.conclusion}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
        <View style={styles.resultBox}>
          <Text variant="label" style={styles.resultTitle}>WRITE THESE RESULTS</Text>
          <Text selectable variant="technical" style={styles.resultText}>NETWORK  192.168.10.64/26</Text>
          <Text selectable variant="technical" style={styles.resultText}>SUBNET MASK  255.255.255.192</Text>
          <Text selectable variant="technical" style={styles.resultText}>FIRST HOST  192.168.10.65</Text>
          <Text selectable variant="technical" style={styles.resultText}>LAST HOST  192.168.10.126</Text>
          <Text selectable variant="technical" style={styles.resultText}>BROADCAST  192.168.10.127</Text>
          <Text selectable variant="technical" style={styles.resultText}>NEXT NETWORK  192.168.10.128/26</Text>
          <Text selectable variant="technical" style={styles.resultText}>TOTAL / USABLE  64 / 62</Text>
        </View>
      </View>
      <DisclosureSection title="MORE WORKED EXAMPLES" summary="Three complete /25, /27, and subnet-mask examples.">
        <View style={styles.examples}>
          {workedExamples.map((example) => (
            <View key={example.id} style={styles.workedExample}>
              <Text variant="label" style={styles.workedTitle}>{example.title}</Text>
              <Text selectable variant="technical" style={styles.given}>GIVEN  {example.given}</Text>
              <View style={styles.exampleSteps}>
                {example.steps.map((step, index) => <Text key={step} selectable variant="bodySmall" style={styles.exampleStep}>{index + 1}. {step}</Text>)}
              </View>
              <View style={styles.exampleResults}>
                {example.results.map((result) => <Text key={result} selectable variant="technical" style={styles.resultText}>{result}</Text>)}
              </View>
            </View>
          ))}
        </View>
      </DisclosureSection>
      <Text variant="bodySmall" style={styles.note}>A prefix and subnet mask describe the same boundary. /24 is 255.255.255.0; 255.255.255.255 is /32.</Text>
      <Text variant="bodySmall" style={styles.note}>The “subtract two” usable-host rule applies to the conventional /24–/30 subnets practiced in this chapter. /31 and /32 have different purposes and are reference-only here.</Text>
    </View>
    </DisclosureSection>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { gap: Space.md },
  eyebrow: { color: colors.orange, fontFamily: Fonts.medium },
  description: { color: colors.textMuted },
  example: { borderLeftWidth: 3, borderColor: colors.green, backgroundColor: colors.greenSoft, padding: Space.md },
  exampleText: { color: colors.text },
  scrollCue: { color: colors.orange },
  table: { minWidth: 784, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', minHeight: 44, borderBottomWidth: 1, borderColor: colors.border },
  rowHeading: { width: 144, justifyContent: 'center', paddingHorizontal: Space.sm, backgroundColor: colors.surfaceRaised, borderRightWidth: 1, borderColor: colors.border },
  rowHeadingText: { color: colors.orange, fontFamily: Fonts.medium },
  cell: { width: 80, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRightWidth: 1, borderColor: colors.border },
  cellText: { color: colors.text, fontFamily: Fonts.semibold },
  focusCell: { backgroundColor: colors.greenSoft },
  focusText: { color: colors.green },
  focusTitle: { color: colors.orange, fontFamily: Fonts.medium, marginTop: Space.sm },
  focusList: { borderWidth: 1, borderColor: colors.border },
  focusRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: Space.md },
  prefix: { width: 52, color: colors.orange, fontFamily: Fonts.semibold },
  focusCopy: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm },
  mask: { color: colors.text },
  block: { color: colors.textMuted },
  method: { marginTop: Space.sm, borderTopWidth: 1, borderColor: colors.border, paddingTop: Space.lg, gap: Space.md },
  methodEyebrow: { color: colors.green, fontFamily: Fonts.medium },
  methodTitle: { color: colors.text, fontFamily: Fonts.semibold },
  methodIntro: { color: colors.textMuted },
  methodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md },
  stepNumber: { width: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  stepNumberText: { color: colors.orange, fontFamily: Fonts.semibold },
  stepCopy: { flex: 1, minWidth: 0, gap: 4 },
  stepTitle: { color: colors.text, fontFamily: Fonts.semibold },
  stepDetail: { color: colors.textMuted },
  stepHighlights: { marginTop: 4, gap: 4 },
  stepHighlight: { color: colors.green, fontFamily: Fonts.semibold },
  rangeBox: { marginTop: 4, borderWidth: 1, borderColor: colors.border },
  rangeRow: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Space.md, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2 },
  rangeTarget: { borderLeftWidth: 3, borderLeftColor: colors.orange, backgroundColor: colors.orangeSoft },
  rangeLabel: { color: colors.green, fontFamily: Fonts.medium },
  rangeValue: { color: colors.text, fontFamily: Fonts.semibold },
  rangeTargetText: { color: colors.orange },
  stepConclusion: { borderLeftWidth: 3, borderLeftColor: colors.green, backgroundColor: colors.greenSoft, padding: Space.md, gap: 4 },
  conclusionLabel: { color: colors.green, fontFamily: Fonts.semibold },
  conclusionText: { color: colors.text },
  resultBox: { borderLeftWidth: 3, borderColor: colors.green, backgroundColor: colors.greenSoft, padding: Space.md, gap: Space.sm },
  resultTitle: { color: colors.green, fontFamily: Fonts.semibold },
  resultText: { color: colors.text },
  examples: { gap: Space.md },
  workedExample: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: Space.md, gap: Space.sm },
  workedTitle: { color: colors.orange, fontFamily: Fonts.semibold },
  given: { color: colors.text, fontFamily: Fonts.medium },
  exampleSteps: { gap: 4 },
  exampleStep: { color: colors.textMuted },
  exampleResults: { borderLeftWidth: 3, borderColor: colors.green, paddingLeft: Space.md, gap: 4, marginTop: Space.xs },
  note: { color: colors.textMuted },
});
