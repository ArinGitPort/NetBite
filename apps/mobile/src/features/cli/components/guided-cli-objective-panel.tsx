import { StyleSheet, View } from 'react-native';

import type { GuidedCliNextAction, GuidedCliObjective, GuidedCliObjectiveState } from '@/features/cli/guided-cli-objectives';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { StatusRow, type StatusRowState } from '@/shared/components/status-row';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

const statePresentation: Record<GuidedCliObjectiveState, { rowState: StatusRowState; label: string }> = {
  'not-started': { rowState: 'pending', label: 'NOT STARTED' },
  'in-progress': { rowState: 'info', label: 'IN PROGRESS' },
  ready: { rowState: 'info', label: 'READY TO TEST' },
  attention: { rowState: 'attention', label: 'NEEDS ATTENTION' },
  complete: { rowState: 'complete', label: 'COMPLETE' },
  blocked: { rowState: 'locked', label: 'BLOCKED BY EARLIER STEP' },
};

export function GuidedCliObjectivePanel({ objectives, nextAction, onAction }: {
  objectives: GuidedCliObjective[];
  nextAction?: GuidedCliNextAction;
  onAction: (action: GuidedCliNextAction) => void;
}) {
  const styles = useThemeStyles(createStyles);
  const allComplete = objectives.every(({ state }) => state === 'complete');
  return <View style={styles.wrap}>
    <View style={styles.list}>
      {objectives.map((objective) => {
        const presentation = statePresentation[objective.state];
        return <View key={objective.id} style={[styles.objective, objective.state === 'attention' && styles.attention, objective.state === 'complete' && styles.complete]}>
          <StatusRow label={objective.title} value={objective.progress} state={presentation.rowState} stateLabel={presentation.label} />
          <Text variant="bodySmall"><Text variant="label" style={styles.label}>WHAT TO DO / </Text>{objective.requirement}</Text>
          <Text variant="bodySmall"><Text variant="label" style={styles.label}>PROOF / </Text>{objective.evidence}</Text>
          {objective.blockingReason ? <Text variant="bodySmall" style={styles.warning}>{objective.blockingReason}</Text> : null}
          {objective.details?.length ? <View style={styles.details}>{objective.details.map((detail) => <StatusRow key={detail.id} description={detail.description} label={detail.label} state={detail.complete ? 'complete' : 'pending'} stateLabel={detail.complete ? 'COMPLETE' : 'REQUIRED'} value={detail.value} />)}</View> : null}
        </View>;
      })}
    </View>
    {nextAction ? <View accessibilityLiveRegion="polite" style={styles.next}>
      <Text variant="label" style={styles.nextTitle}>NEXT RECOMMENDED ACTION</Text>
      <Text variant="bodySmall">{nextAction.instruction}</Text>
      <AppButton label={nextAction.label} onPress={() => onAction(nextAction)} />
    </View> : allComplete ? <StatusRow label="ALL OBJECTIVES SATISFIED" state="complete" /> : <StatusRow description="Use the visible prediction or verification controls to continue." label="CURRENT STEP IS READY" state="info" stateLabel="READY" />}
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { minWidth: 0, gap: Space.md },
  list: { minWidth: 0, gap: Space.sm },
  objective: { minWidth: 0, gap: Space.xs, padding: Space.sm, borderLeftWidth: 3, borderLeftColor: colors.border, backgroundColor: colors.background },
  attention: { borderLeftColor: colors.orange, backgroundColor: colors.orangeSoft },
  complete: { borderLeftColor: colors.green, backgroundColor: colors.greenSoft },
  details: { minWidth: 0, marginTop: Space.xs, paddingTop: Space.xs, borderTopWidth: 1, borderTopColor: colors.border },
  label: { color: colors.textMuted, fontFamily: Fonts.semibold },
  warning: { color: colors.orange },
  next: { minWidth: 0, gap: Space.sm, padding: Space.md, borderWidth: 1, borderColor: colors.orange, backgroundColor: colors.surfaceRaised },
  nextTitle: { color: colors.orange, fontFamily: Fonts.semibold },
});
