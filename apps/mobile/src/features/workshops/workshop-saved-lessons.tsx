import { Pressable, StyleSheet, View } from "react-native";

import type { WorkshopLesson } from "@/core/workshops/types";
import { AppIcon } from "@/shared/components/app-icon";
import { DisclosureSection } from "@/shared/components/disclosure-section";
import { SemanticIcon } from "@/shared/components/semantic-icon";
import { Text } from "@/shared/components/console-text";
import { Fonts, Palette, Space } from "@/shared/theme";

export function WorkshopSavedLessons({
  lessons,
  onOpen,
  savedLessonIds,
}: {
  lessons: WorkshopLesson[];
  onOpen: (lessonId: string) => void;
  savedLessonIds: string[];
}) {
  const savedLessons = lessons.filter((lesson) =>
    savedLessonIds.includes(lesson.id),
  );
  return (
    <DisclosureSection
      summary={
        savedLessons.length
          ? `${savedLessons.length} bookmarked ${savedLessons.length === 1 ? "lesson" : "lessons"}`
          : "Bookmark workshop lessons for quick access"
      }
      title="Saved lessons"
    >
      {savedLessons.length ? (
        savedLessons.map((lesson) => {
          const lessonIndex = lessons.findIndex(
            (candidate) => candidate.id === lesson.id,
          );
          return (
            <Pressable
              accessibilityHint="Opens this saved workshop lesson"
              accessibilityLabel={`Saved lesson: ${lesson.title}`}
              accessibilityRole="button"
              key={lesson.id}
              onPress={() => onOpen(lesson.id)}
              style={({ pressed }) => [
                styles.savedRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.iconPlate}>
                <SemanticIcon
                  color={Palette.green}
                  name="saved"
                  size={22}
                />
              </View>
              <View style={styles.copy}>
                <Text variant="technical" style={styles.location}>
                  LESSON {lessonIndex + 1} OF {lessons.length}
                </Text>
                <Text variant="label" style={styles.title}>
                  {lesson.title}
                </Text>
                <Text variant="bodySmall" style={styles.summary}>
                  {lesson.summary}
                </Text>
              </View>
              <AppIcon name="arrow-right" size={18} />
            </Pressable>
          );
        })
      ) : (
        <View style={styles.empty}>
          <SemanticIcon color={Palette.textMuted} name="bookmark" size={24} />
          <View style={styles.copy}>
            <Text variant="label" style={styles.title}>
              NO SAVED LESSONS YET
            </Text>
            <Text variant="bodySmall" style={styles.summary}>
              Open a workshop lesson and use the bookmark in its header.
            </Text>
          </View>
        </View>
      )}
    </DisclosureSection>
  );
}

const styles = StyleSheet.create({
  savedRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: Palette.border,
    borderLeftColor: Palette.green,
    backgroundColor: Palette.background,
    padding: Space.md,
  },
  pressed: { opacity: 0.7 },
  iconPlate: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Palette.green,
    backgroundColor: Palette.greenSoft,
  },
  copy: { minWidth: 0, flex: 1 },
  location: { color: Palette.green, fontFamily: Fonts.medium },
  title: {
    color: Palette.text,
    fontFamily: Fonts.semibold,
    textTransform: "uppercase",
  },
  summary: { color: Palette.textMuted, marginTop: Space.xs },
  empty: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: Space.sm,
  },
});
