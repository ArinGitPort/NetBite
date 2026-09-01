import type { PropsWithChildren, ReactNode, RefObject } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GridBackground } from '@/shared/components/grid-background';
import { Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

interface ScreenProps extends PropsWithChildren {
  footer?: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
  scrollTestID?: string;
}

export function Screen({ children, footer, header, scroll = true, scrollRef, scrollTestID }: ScreenProps) {
  const styles = useThemeStyles(createStyles);
  const { width } = useWindowDimensions();
  const body = <View style={[styles.content, width <= 430 ? styles.contentCompact : styles.contentComfortable]}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <GridBackground />
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" ref={scrollRef} showsVerticalScrollIndicator={false} style={styles.viewport} testID={scrollTestID}>
          {body}
        </ScrollView>
      ) : (
        <View style={styles.fixed}>{body}</View>
      )}
      {footer ? <SafeAreaView edges={['bottom']} style={styles.footerSafeArea} testID="screen-footer"><View style={[styles.footerContent, width <= 430 ? styles.footerCompact : styles.footerComfortable]}>{footer}</View></SafeAreaView> : null}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  viewport: { flex: 1, minHeight: 0 },
  fixed: { flex: 1, alignItems: 'center' },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: 720, minWidth: 0, flexGrow: 1 },
  contentCompact: { padding: Space.lg },
  contentComfortable: { padding: Space.xl },
  footerSafeArea: { width: '100%', flexGrow: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceRaised },
  footerContent: { width: '100%', maxWidth: 720, minWidth: 0, alignSelf: 'center' },
  footerCompact: { paddingHorizontal: Space.lg, paddingVertical: Space.sm },
  footerComfortable: { paddingHorizontal: Space.xl, paddingVertical: Space.sm },
});
