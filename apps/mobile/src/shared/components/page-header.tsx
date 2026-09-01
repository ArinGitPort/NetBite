import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { type AppIconName } from '@/shared/components/app-icon';
import { IconButton } from '@/shared/components/icon-button';
import { Text } from '@/shared/components/console-text';
import { Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';

export interface PageHeaderAction {
  accessibilityHint?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  icon: AppIconName;
  label?: string;
  onPress: () => void;
}

export interface PageHeaderProps {
  leading?: PageHeaderAction;
  status?: string;
  trailing?: PageHeaderAction[];
  trailingContent?: ReactNode;
}

export function getPageHeaderGutter(width: number) {
  return width <= 430 ? Space.lg : Space.xl;
}

function HeaderAction({ action }: { action: PageHeaderAction }) {
  return (
    <IconButton
      accessibilityHint={action.accessibilityHint}
      accessibilityLabel={action.accessibilityLabel}
      disabled={action.disabled}
      icon={action.icon}
      label={action.label}
      onPress={action.onPress}
    />
  );
}

export function PageHeader({ leading, status, trailing = [], trailingContent }: PageHeaderProps) {
  const styles = useThemeStyles(createStyles);
  const { width } = useWindowDimensions();
  const gutter = getPageHeaderGutter(width);

  return (
    <View style={[styles.header, { paddingHorizontal: gutter }]} testID="page-header">
      {leading ? (
        <View style={styles.leading} testID="page-header-leading">
          <HeaderAction action={leading} />
        </View>
      ) : null}
      {status || trailing.length || trailingContent ? (
        <View style={styles.trailing}>
          {status ? <Text variant="technical" style={styles.status}>{status}</Text> : null}
          {trailing.map((action) => <HeaderAction action={action} key={action.accessibilityLabel} />)}
          {trailingContent}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: {
    width: '100%',
    minWidth: 0,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.sm,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  leading: {
    alignItems: 'flex-start',
    maxWidth: '58%',
    flexShrink: 1,
  },
  trailing: {
    minWidth: 0,
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Space.sm,
  },
  status: { minWidth: 0, flexShrink: 1, color: colors.textMuted, textAlign: 'right' as const },
});
