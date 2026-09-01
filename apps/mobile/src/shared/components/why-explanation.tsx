import { DisclosureSection } from '@/shared/components/disclosure-section';
import { Text } from '@/shared/components/console-text';
import { useTheme } from '@/shared/theme-context';

export function WhyExplanation({ observation, rule, proves, nextCheck }: { observation: string; rule: string; proves: string; nextCheck?: string }) {
  const { colors } = useTheme();
  return <DisclosureSection summary="See the rule and the next useful check." title="WHY THIS HAPPENED">
    <Text variant="label" style={{ color: colors.orange }}>OBSERVATION</Text><Text variant="bodySmall" style={{ color: colors.text }}>{observation}</Text>
    <Text variant="label" style={{ color: colors.orange }}>NETWORKING RULE</Text><Text variant="bodySmall" style={{ color: colors.text }}>{rule}</Text>
    <Text variant="label" style={{ color: colors.green }}>WHAT THIS PROVES</Text><Text variant="bodySmall" style={{ color: colors.text }}>{proves}</Text>
    {nextCheck ? <><Text variant="label" style={{ color: colors.orange }}>NEXT USEFUL CHECK</Text><Text variant="bodySmall" style={{ color: colors.text }}>{nextCheck}</Text></> : null}
  </DisclosureSection>;
}
