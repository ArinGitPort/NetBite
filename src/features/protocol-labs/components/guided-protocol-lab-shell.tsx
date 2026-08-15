import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { PageHeader } from '@/shared/components/page-header';
import { LabSetupSupport } from '@/features/practice/components/foundation-lab-support';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

interface GuidedProtocolLabShellProps extends PropsWithChildren {
  labId: string;
  title: string;
  subtitle: string;
  objectiveLabel: string;
  progress: number;
  autosaveLabel: string;
  onBack: () => void;
  headerAction?: ReactNode;
}

export function GuidedProtocolLabShell({ labId, title, subtitle, objectiveLabel, progress, autosaveLabel, onBack, headerAction, children }: GuidedProtocolLabShellProps) {
  return (
    <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back from guided simulator', icon: 'arrow-left', label: 'BACK / MODULE', onPress: onBack }} status={headerAction ? undefined : autosaveLabel} trailingContent={headerAction} />}>
      <Text variant="label" style={styles.eyebrow}>GUIDED MINI-SIMULATOR</Text>
      <Text variant="screenTitle" style={styles.title}>{title}</Text>
      <Text variant="technical" style={styles.subtitle}>{subtitle}</Text>
      <LabSetupSupport labId={labId} />
      <ProgressBar progress={progress} />
      <Text accessibilityLiveRegion="polite" variant="label" style={styles.objective}>{objectiveLabel}</Text>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm, marginBottom: Space.lg },
  saved: { color: Palette.green },
  eyebrow: { color: Palette.orange },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.sm },
  subtitle: { color: Palette.textMuted, marginVertical: Space.sm },
  objective: { color: Palette.green, marginVertical: Space.md },
});
