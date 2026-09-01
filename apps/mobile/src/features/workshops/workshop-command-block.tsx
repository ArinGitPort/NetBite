import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { WorkshopLessonBlock } from "@/core/workshops/types";
import { Text } from "@/shared/components/console-text";
import { Fonts, Space, type ThemeColors } from "@/shared/theme";
import { useThemeStyles } from "@/shared/theme-context";

export function WorkshopCommandBlock({
  block,
}: {
  block: WorkshopLessonBlock;
}) {
  const styles = useThemeStyles(createStyles);
  const [expanded, setExpanded] = useState(false);
  const groups = block.commandGroups ?? [];
  const lineCount = groups.reduce(
    (total, group) => total + group.commands.length,
    0,
  );
  return (
    <View style={styles.shell}>
      <Pressable
        accessibilityLabel={`${block.title ?? "Configuration commands"}, ${groups.length} device groups and ${lineCount} command lines`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.trigger}
      >
        <View style={styles.triggerCopy}>
          <Text variant="label" style={styles.label}>
            {(block.title ?? "CONFIGURATION COMMANDS").toUpperCase()}
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            {groups.length} device groups · {lineCount} command lines
          </Text>
        </View>
        <Text variant="technical" style={styles.action}>
          {expanded ? "HIDE COMMANDS" : "SHOW COMMANDS"}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.content}>
          {block.introduction ? (
            <Text selectable variant="bodySmall" style={styles.muted}>
              {block.introduction}
            </Text>
          ) : null}
          {groups.map((group) => (
            <View key={group.id} style={styles.group}>
              <Text variant="sectionHeading">{group.title}</Text>
              <Text selectable variant="technical" style={styles.commands}>
                {group.commands.join("\n")}
              </Text>
              {group.explanation ? (
                <Text selectable variant="bodySmall" style={styles.explanation}>
                  {group.explanation}
                </Text>
              ) : null}
            </View>
          ))}
          <Text variant="bodySmall" style={styles.notice}>
            Read-only reference. NetBite does not execute these commands.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  shell: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  trigger: {
    minHeight: 56,
    padding: Space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
  },
  triggerCopy: { flex: 1, gap: Space.xs },
  label: { color: colors.orange },
  muted: { color: colors.textMuted },
  action: {
    color: colors.text,
    fontFamily: Fonts.semibold,
    textAlign: "right",
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: Space.md,
    gap: Space.lg,
  },
  group: { gap: Space.sm },
  commands: {
    color: colors.text,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Space.md,
    lineHeight: 21,
  },
  explanation: { color: colors.textMuted },
  notice: {
    color: colors.textMuted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: Space.md,
  },
});
