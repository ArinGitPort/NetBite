import { DisclosureSection } from '@/shared/components/disclosure-section';
import { Text } from '@/shared/components/console-text';
import { Palette } from '@/shared/theme';

export function WhyExplanation({ observation, rule, proves, nextCheck }: { observation: string; rule: string; proves: string; nextCheck?: string }) {
  return <DisclosureSection summary="See the rule and the next useful check." title="WHY THIS HAPPENED">
    <Text variant="label" style={{ color: Palette.orange }}>OBSERVATION</Text><Text variant="bodySmall" style={{ color: Palette.text }}>{observation}</Text>
    <Text variant="label" style={{ color: Palette.orange }}>NETWORKING RULE</Text><Text variant="bodySmall" style={{ color: Palette.text }}>{rule}</Text>
    <Text variant="label" style={{ color: Palette.green }}>WHAT THIS PROVES</Text><Text variant="bodySmall" style={{ color: Palette.text }}>{proves}</Text>
    {nextCheck ? <><Text variant="label" style={{ color: Palette.orange }}>NEXT USEFUL CHECK</Text><Text variant="bodySmall" style={{ color: Palette.text }}>{nextCheck}</Text></> : null}
  </DisclosureSection>;
}
