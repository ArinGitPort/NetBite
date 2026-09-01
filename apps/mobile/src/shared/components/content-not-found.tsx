import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/shared/components/app-button';
import { PageHeader } from '@/shared/components/page-header';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';
import { returnToLearningPath, returnToMenu } from '@/shared/navigation';

export function ContentNotFound({ label = 'Content' }: { label?: string }) {
  const styles = useThemeStyles(createStyles);
  return (
    <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to learning path', icon: 'arrow-left', label: 'BACK / LEARN', onPress: returnToLearningPath }} />}>
      <View style={styles.content}>
        <Text variant="label" style={styles.eyebrow}>NOT AVAILABLE</Text>
        <Text variant="screenTitle" style={styles.title}>{label} not found</Text>
        <Text variant="body" style={styles.copy}>This activity is unavailable or the link is no longer valid.</Text>
      </View>
      <AppButton label="Learning path" onPress={returnToLearningPath} />
      <AppButton label="Main menu" variant="secondary" onPress={returnToMenu} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 72 },
  eyebrow: { color: colors.orange, fontFamily: Fonts.medium },
  title: { color: colors.text, fontFamily: Fonts.semibold, textTransform: 'uppercase', marginTop: Space.sm, textAlign: 'center' },
  copy: { color: colors.textMuted, textAlign: 'center', marginTop: Space.md, maxWidth: 380 },
});
