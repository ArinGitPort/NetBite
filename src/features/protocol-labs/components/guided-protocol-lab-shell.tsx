import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/shared/components/icon-button';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

interface GuidedProtocolLabShellProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  objectiveLabel: string;
  progress: number;
  autosaveLabel: string;
  onBack: () => void;
  headerAction?: ReactNode;
}

export function GuidedProtocolLabShell({ title, subtitle, objectiveLabel, progress, autosaveLabel, onBack, headerAction, children }: GuidedProtocolLabShellProps) {
  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Back from guided simulator" icon="arrow-left" label="BACK / MODULE" onPress={onBack} />
        {headerAction ?? <Text variant="technical" style={styles.saved}>{autosaveLabel}</Text>}
      </View>
      <Text variant="label" style={styles.eyebrow}>GUIDED MINI-SIMULATOR</Text>
      <Text variant="screenTitle" style={styles.title}>{title}</Text>
      <Text variant="technical" style={styles.subtitle}>{subtitle}</Text>
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
