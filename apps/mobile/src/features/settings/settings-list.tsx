import type { PropsWithChildren, ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/shared/components/app-icon';
import { Text } from '@/shared/components/console-text';
import { SemanticIcon, type SemanticIconName } from '@/shared/components/semantic-icon';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useTheme, useThemeStyles } from '@/shared/theme-context';

export function SettingsGroup({ label, children }: PropsWithChildren<{ label: string }>) {
  const styles = useThemeStyles(createStyles);
  return <View style={styles.groupWrap}>
    <Text variant="label" style={styles.groupLabel}>{label}</Text>
    <View style={styles.group}>{children}</View>
  </View>;
}

export function SettingsRow({
  title,
  detail,
  value,
  icon,
  children,
  defaultExpanded = false,
  danger = false,
  onPress,
  trailing,
}: PropsWithChildren<{
  title: string;
  detail?: string;
  value?: string;
  icon: SemanticIconName;
  defaultExpanded?: boolean;
  danger?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
}>) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const expandable = Boolean(children);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const activate = () => expandable ? setExpanded((current) => !current) : onPress?.();

  return <View style={styles.rowWrap}>
    <Pressable
      accessibilityHint={expandable ? `${expanded ? 'Collapses' : 'Expands'} ${title}` : undefined}
      accessibilityRole="button"
      accessibilityState={expandable ? { expanded } : undefined}
      onPress={activate}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconFrame}>
        <SemanticIcon color={danger ? colors.danger : colors.text} name={icon} size={21} />
      </View>
      <View style={styles.copy}>
        <Text variant="sectionHeading" style={[styles.title, danger && styles.dangerText]}>{title}</Text>
        {detail ? <Text numberOfLines={1} variant="bodySmall" style={styles.detail}>{detail}</Text> : null}
      </View>
      {trailing ?? (value ? <Text variant="label" style={styles.value}>{value}</Text> : null)}
      <View style={[styles.chevron, expanded && styles.chevronExpanded]}><AppIcon name="arrow-right" size={17} /></View>
    </Pressable>
    {expandable && expanded ? <View style={styles.body}>{children}</View> : null}
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  groupWrap: { marginBottom: Space.lg },
  groupLabel: { color: colors.textMuted, marginBottom: Space.sm, paddingHorizontal: Space.xs },
  group: { overflow: 'hidden', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  rowWrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingHorizontal: Space.md, paddingVertical: Space.sm },
  pressed: { backgroundColor: colors.accentSoft },
  iconFrame: { width: 30, height: 38, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  copy: { minWidth: 0, flex: 1 },
  title: { color: colors.text, fontFamily: Fonts.semibold },
  dangerText: { color: colors.danger },
  detail: { color: colors.textMuted, marginTop: 2 },
  value: { maxWidth: 104, flexShrink: 1, color: colors.green, textAlign: 'right' },
  chevron: { flexShrink: 0, opacity: 0.72, transform: [{ rotate: '0deg' }] },
  chevronExpanded: { transform: [{ rotate: '90deg' }] },
  body: { gap: Space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background, padding: Space.md },
});
