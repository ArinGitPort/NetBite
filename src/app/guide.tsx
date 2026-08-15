import { StyleSheet, View } from 'react-native';

import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { Text } from '@/shared/components/console-text';
import { goBackOrReplace } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';

const sections = [
  {
    id: 'courses',
    title: 'MAIN MENU AND COURSES',
    detail: 'Continue Learning opens your next unfinished activity. Browse Courses lets you choose Foundations or Network Operations without changing your saved progress.',
  },
  {
    id: 'lessons',
    title: 'LESSONS AND REVIEW',
    detail: 'Lessons explain one idea at a time. Pause and Apply checks use retry-until-correct practice. Missed ideas can return later under Progress and Review.',
  },
  {
    id: 'labs',
    title: 'GUIDED LABS',
    detail: 'Read Learn the Setup, follow the current objective, then test your work. Valid mistakes remain editable. Help, hints, and Why This Happened explain the next useful check.',
  },
  {
    id: 'sandbox',
    title: 'NETWORK SANDBOX',
    detail: 'Add, connect, configure, and test a small network. Use More Tools for starting networks, Undo, view controls, learned-state cleanup, and the optional guided build.',
  },
] as const;

export default function AppGuideScreen() {
  return (
    <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to Settings', icon: 'arrow-left', label: 'BACK / SETTINGS', onPress: () => goBackOrReplace(AppRoutes.settings) }} />}>
      <Text variant="label" style={styles.eyebrow}>ON-DEMAND HELP</Text>
      <Text variant="screenTitle" style={styles.title}>APP GUIDE</Text>
      <Text variant="body" style={styles.intro}>These tips never open automatically. Return here whenever you want a quick reminder.</Text>
      <View style={styles.sections}>
        {sections.map((section, index) => (
          <View accessibilityLabel={`${section.title}. ${section.detail}`} key={section.id} style={styles.section}>
            <Text variant="label" style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
            <Text variant="sectionHeading" style={styles.heading}>{section.title}</Text>
            <Text variant="bodySmall" style={styles.detail}>{section.detail}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: Palette.orange },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.sm },
  intro: { color: Palette.textMuted, marginTop: Space.md, marginBottom: Space.xl },
  sections: { gap: Space.md },
  section: { minWidth: 0, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg, gap: Space.sm },
  number: { color: Palette.orange },
  heading: { color: Palette.text, fontFamily: Fonts.semibold },
  detail: { color: Palette.textMuted },
});
