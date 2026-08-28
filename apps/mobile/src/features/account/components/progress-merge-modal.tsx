import { Modal, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space } from '@/shared/theme';

export function ProgressMergeModal() {
  const { mergeRequest, resolveProgressMerge } = useAuth();
  if (!mergeRequest) return null;
  const localCount = mergeRequest.local.completedLessonIds.length + mergeRequest.local.completedLabIds.length;
  const cloudCount = mergeRequest.cloud.completedLessonIds.length + mergeRequest.cloud.completedLabIds.length;
  return <Modal transparent visible animationType="fade" onRequestClose={() => void resolveProgressMerge('cancel')}>
    <View style={styles.backdrop}>
      <View accessibilityViewIsModal style={styles.panel}>
        <Text variant="label" style={styles.eyebrow}>PROGRESS FOUND</Text>
        <Text variant="screenTitle" style={styles.title}>KEEP YOUR LEARNING</Text>
        <Text variant="body">This device and your account can hold different progress. Nothing is changed until you choose.</Text>
        <View style={styles.compare}>
          <View style={styles.record}><Text variant="label">THIS DEVICE</Text><Text variant="sectionHeading">{localCount} COMPLETED ITEMS</Text></View>
          <View style={styles.record}><Text variant="label">ONLINE BACKUP</Text><Text variant="sectionHeading">{cloudCount} COMPLETED ITEMS</Text></View>
        </View>
        <AppButton label="Merge device progress" onPress={() => void resolveProgressMerge('merge')} />
        <AppButton label="Use online backup" variant="secondary" onPress={() => void resolveProgressMerge('cloud')} />
        <AppButton label="Cancel sign-in" variant="quiet" onPress={() => void resolveProgressMerge('cancel')} />
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: Space.lg, backgroundColor: 'rgba(10,8,10,0.9)' },
  panel: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: Space.lg, gap: Space.md, borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.surface },
  eyebrow: { color: Palette.orange },
  title: { color: Palette.text, fontFamily: Fonts.semibold },
  compare: { gap: Space.sm },
  record: { padding: Space.md, gap: Space.xs, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
});
