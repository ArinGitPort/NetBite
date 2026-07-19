import type { PropsWithChildren, ReactNode, RefObject } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GridBackground } from '@/shared/components/grid-background';
import { Palette, Space } from '@/shared/theme';

interface ScreenProps extends PropsWithChildren {
  header?: ReactNode;
  scroll?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
  scrollTestID?: string;
}

export function Screen({ children, header, scroll = true, scrollRef, scrollTestID }: ScreenProps) {
  const { width } = useWindowDimensions();
  const body = <View style={[styles.content, width <= 430 ? styles.contentCompact : styles.contentComfortable]}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <GridBackground />
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" ref={scrollRef} showsVerticalScrollIndicator={false} testID={scrollTestID}>
          {body}
        </ScrollView>
      ) : (
        <View style={styles.fixed}>{body}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.background },
  fixed: { flex: 1, alignItems: 'center' },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: 720, minWidth: 0, flexGrow: 1 },
  contentCompact: { padding: Space.lg },
  contentComfortable: { padding: Space.xl },
});
